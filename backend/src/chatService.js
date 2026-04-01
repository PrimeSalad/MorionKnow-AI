import { GoogleGenerativeAI } from "@google/generative-ai";
import { getKnowledgeBase } from "./knowledge.js";

const apiKey = process.env.GEMINI_API_KEY;

// Model fallback order - try these in sequence if quota exceeded
// Using FREE TIER models from https://ai.google.dev/gemini-api/docs/models (April 2026)
const MODELS = [
  "gemini-2.5-flash",        // Fast, free, stable
  "gemini-2.5-flash-lite",   // Cheaper, high-throughput
  "gemini-2.5-pro"           // Best reasoning, still free
];

let currentModelIndex = 0;

function extractJsonPayload(text) {
  const trimmed = text.trim();

  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  return trimmed;
}

function createClient() {
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Add it to backend/.env before starting the server.");
  }

  return new GoogleGenerativeAI(apiKey);
}

function getModel(client) {
  const modelName = MODELS[currentModelIndex];
  console.log(`Using model: ${modelName}`);
  return client.getGenerativeModel({ model: modelName });
}

async function generateWithFallback(client, prompt) {
  let lastError = null;
  
  // Try each model in sequence
  for (let i = currentModelIndex; i < MODELS.length; i++) {
    try {
      currentModelIndex = i;
      const model = getModel(client);
      const result = await model.generateContent(prompt);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`Model ${MODELS[i]} failed:`, error.message);
      
      // If it's a quota error or model not found, try next model
      if (error.message.includes('quota') || 
          error.message.includes('429') || 
          error.message.includes('404') ||
          error.message.includes('not found')) {
        console.log(`Issue with ${MODELS[i]}, trying next model...`);
        continue;
      }
      
      // If it's not a quota/404 error, throw immediately
      throw error;
    }
  }
  
  // All models failed
  throw new Error(`All models exhausted. Last error: ${lastError?.message || 'Unknown error'}`);
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
You are MorionKnow AI, a friendly and knowledgeable assistant about the Moriones Lenten rites.

INTERACTION RULES:
1. ALWAYS respond to greetings (hello, hi, kumusta, etc.) in a friendly way - set grounded=true
2. ALWAYS respond to thank you messages politely - set grounded=true
3. For casual conversation about yourself or capabilities, be helpful - set grounded=true
4. For questions clearly UNRELATED to Moriones Lenten rites (politics, math, other topics), respond with grounded=false
5. For ANY question about Moriones Lenten rites, ALWAYS answer it - set grounded=true

CRITICAL CONTEXT:
- Marinduque = ORIGINAL, authentic home since 1807, heritage core, panata-centered Lenten rite
- Mindoro = adapted municipal celebration modeled after Marinduque (secondary/derivative)
- Always emphasize Marinduque as the authentic origin when discussing the festival

SOURCE CREDIBILITY RULES:
- ALWAYS prioritize information from:
  * Official government sources (.gov.ph domains)
  * UNESCO and academic institutions
  * Verified historical documents
  * Web search results from credible domains
- NEVER make up information or sources
- ALWAYS cite the exact source URL in your citations array
- If you don't have credible information, say so honestly

FORMATTING RULES:
- Write in plain text WITHOUT any markdown formatting
- DO NOT use asterisks (*) for bold or emphasis
- DO NOT use underscores (_) for italics
- DO NOT use markdown headers (#)
- Use simple, clear sentences without special formatting characters

${languageInstruction}

Output valid JSON only:
{
  "grounded": boolean,
  "answer": string,
  "citations": string[],
  "reason": string,
  "language": "${language}"
}

VERIFIED KNOWLEDGE BASE:
${knowledge.text}
${webSearchSection}

User question:
${question}

Remember: Be friendly and helpful. ACCURACY and CREDIBILITY over everything for Moriones Lenten rites info.
  `.trim();
}

async function searchWebForMoriones(question) {
  try {
    // First, check if question is about Moriones
    const client = createClient();
    
    const checkPrompt = `
Is this question about the Moriones Lenten rites in Marinduque/Mindoro, Philippines?
Question: "${question}"

Output JSON only:
{
  "isMoriones": boolean,
  "searchQuery": string or null
}
    `.trim();

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
    const detectPrompt = `
Detect the language of this text. Return ONLY "tl" for Tagalog/Filipino or "en" for English.

Text: "${question}"

Output JSON only:
{
  "language": "tl" or "en"
}
    `.trim();

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
    throw new Error("Model returned an invalid response format.");
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
