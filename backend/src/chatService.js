import { GoogleGenerativeAI } from "@google/generative-ai";
import { getKnowledgeBase } from "./knowledge.js";

const apiKey = process.env.GEMINI_API_KEY;

// Model fallback order - OPTIMIZED for free tier RPM limits
// Flash-Lite: 15 RPM (1000 RPD), Flash: 10 RPM (250 RPD), Pro: 5 RPM (100 RPD)
const MODELS = [
  "gemini-2.5-flash-lite",   // 15 RPM - fastest, highest limit
  "gemini-2.5-flash",        // 10 RPM - backup
  "gemini-1.5-flash"         // 15 RPM - stable fallback
];

let currentModelIndex = 0;

// Exponential backoff with jitter for rate limits
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRetryDelay(attempt) {
  // Exponential backoff: 1s, 2s, 4s, 8s with jitter
  const baseDelay = Math.min(1000 * Math.pow(2, attempt), 8000);
  const jitter = Math.random() * 1000; // Add 0-1s randomness
  return baseDelay + jitter;
}

function extractJsonPayload(text) {
  const trimmed = text.trim();

  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  return trimmed;
}

function createClient() {
  if (!apiKey) {
    throw new Error("Service unavailable");
  }

  return new GoogleGenerativeAI(apiKey);
}

function getModel(client) {
  const modelName = MODELS[currentModelIndex];
  console.log(`Using model: ${modelName}`);
  return client.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      maxOutputTokens: 500, // Limit response length to save tokens
      temperature: 0.7,
    }
  });
}

async function generateWithFallback(client, prompt) {
  let lastError = null;
  const maxRetries = 3;
  
  // Try each model with retry logic
  for (let modelIdx = currentModelIndex; modelIdx < MODELS.length; modelIdx++) {
    currentModelIndex = modelIdx;
    const model = client.getGenerativeModel({ model: MODELS[modelIdx] });
    console.log(`Trying model: ${MODELS[modelIdx]}`);
    
    // Retry with exponential backoff for rate limits
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        return result;
      } catch (error) {
        lastError = error;
        const errorMsg = error.message || '';
        
        // Check if it's a rate limit error (429)
        if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
          console.log(`Rate limit hit on ${MODELS[modelIdx]}, attempt ${attempt + 1}/${maxRetries}`);
          
          if (attempt < maxRetries - 1) {
            // Retry with exponential backoff
            const delay = getRetryDelay(attempt);
            console.log(`Retrying in ${Math.round(delay)}ms...`);
            await sleep(delay);
            continue;
          } else {
            // Max retries reached, try next model
            console.log(`Max retries reached for ${MODELS[modelIdx]}, trying next model...`);
            break;
          }
        }
        
        // For other errors (404, 400, etc), try next model immediately
        if (errorMsg.includes('404') || errorMsg.includes('not found')) {
          console.log(`Model ${MODELS[modelIdx]} not found, trying next...`);
          break;
        }
        
        // For unexpected errors, throw immediately
        throw error;
      }
    }
  }
  
  // All models exhausted - hide details from user
  console.error('All models failed:', lastError?.message);
  throw new Error('Service temporarily unavailable');
}

function buildPrompt(question, language = 'en', webSearchResults = null) {
  const knowledge = getKnowledgeBase();

  const languageInstruction = language === 'tl' 
    ? 'Sagutin sa Tagalog (Filipino). Gumamit ng natural at pormal na Tagalog.'
    : 'Answer in English.';

  const webSearchSection = webSearchResults 
    ? `\n\nCREDIBLE WEB SOURCES (VERIFIED FROM OFFICIAL/ACADEMIC SITES):\n${webSearchResults}\n`
    : '';

  return `
You are MorionKnow AI, a friendly assistant about Moriones Lenten rites.

RULES:
1. Respond to greetings/thanks - set grounded=true
2. For Moriones questions, answer briefly - set grounded=true
3. For unrelated topics - set grounded=false
4. Keep answers SHORT (2-3 sentences max)
5. Be concise and direct

KEY FACTS:
- Marinduque = ORIGINAL home since 1807
- Mindoro = adapted from Marinduque

FORMATTING:
- Plain text only, no markdown
- No asterisks, underscores, or headers
- Simple sentences

${languageInstruction}

Output JSON:
{
  "grounded": boolean,
  "answer": string,
  "citations": string[],
  "reason": string,
  "language": "${language}"
}

KNOWLEDGE:
${knowledge.text}
${webSearchSection}

Question: ${question}

IMPORTANT: Keep answer SHORT (2-3 sentences). Be concise.
  `.trim();
}

async function searchWebForMoriones(question) {
  try {
    // First, check if question is about Moriones
    const client = createClient();
    
    const checkPrompt = `Is this about Moriones?\nQ: "${question}"\nJSON: {"isMoriones": bool, "searchQuery": ""}`;

    const checkResult = await generateWithFallback(client, checkPrompt);
    const checkText = extractJsonPayload(checkResult.response.text());
    const parsed = JSON.parse(checkText);

    if (!parsed.isMoriones || !parsed.searchQuery) {
      return null;
    }

    // Perform real web search using Tavily API
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
      console.log('TAVILY_API_KEY not set, skipping web search');
      return null;
    }

    const searchQuery = `${parsed.searchQuery} Moriones Lenten rites Marinduque Philippines`;
    console.log(`Searching web for: ${searchQuery}`);

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: searchQuery,
        search_depth: 'advanced',
        include_domains: [
          'gov.ph',
          'unesco.org',
          'marinduque.gov.ph',
          'tourism.gov.ph',
          'pia.gov.ph',
          'ncca.gov.ph',
          'britannica.com',
          'edu.ph',
          'academia.edu'
        ],
        max_results: 5
      })
    });

    if (!response.ok) {
      console.error('Tavily search failed:', response.statusText);
      return null;
    }

    const searchData = await response.json();
    
    if (!searchData.results || searchData.results.length === 0) {
      return null;
    }

    // Format credible sources with citations
    const formattedResults = searchData.results
      .map((result, idx) => {
        return `[${idx + 1}] ${result.title}\nSource: ${result.url}\nContent: ${result.content}\n`;
      })
      .join('\n');

    return formattedResults;
  } catch (error) {
    console.error('Web search error:', error);
    return null;
  }
}

async function detectLanguage(client, question) {
  try {
    const detectPrompt = `Language? "tl" or "en"\nText: "${question}"\nJSON: {"language": ""}`;

    const result = await generateWithFallback(client, detectPrompt);
    const text = extractJsonPayload(result.response.text());
    const parsed = JSON.parse(text);
    return parsed.language || 'en';
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en'; // Default to English if detection fails
  }
}

export async function generateGroundedAnswer(question, language = null, enableWebSearch = true) {
  const client = createClient();
  
  // Auto-detect language if not provided
  if (!language) {
    language = await detectLanguage(client, question);
    console.log(`Detected language: ${language}`);
  }
  
  // Optionally search web for additional credible sources
  let webSearchResults = null;
  if (enableWebSearch) {
    webSearchResults = await searchWebForMoriones(question);
  }
  
  const result = await generateWithFallback(client, buildPrompt(question, language, webSearchResults));
  const text = extractJsonPayload(result.response.text());

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Service error. Try again.");
  }

  const notGroundedMessage = language === 'tl'
    ? "Pasensya na, hindi ko masasagot ang tanong na yan. Magtanong tungkol sa Moriones Lenten rites, at masasagot ko yan!"
    : "Sorry, I can't answer that question. But ask me anything about the Moriones Lenten rites, and I'll help you!";

  if (!parsed.grounded) {
    return {
      grounded: false,
      answer: notGroundedMessage,
      citations: [],
      reason: parsed.reason || "The question was not about Moriones Lenten rites.",
      language: language,
    };
  }

  const knowledge = getKnowledgeBase();
  const citations = Array.isArray(parsed.citations)
    ? parsed.citations.filter((citation) => {
        // Accept citations from knowledge base, valid URLs, or general source names
        return knowledge.sources.includes(citation) || 
               citation.startsWith('http') || 
               citation.length > 5; // Accept general source names
      })
    : [];

  if (!parsed.answer) {
    return {
      grounded: false,
      answer: notGroundedMessage,
      citations: [],
      reason: "No answer was provided.",
      language: language,
    };
  }

  return {
    grounded: true,
    answer: parsed.answer,
    citations,
    reason: parsed.reason || "Answer grounded in the provided source text.",
    language: language,
  };
}
