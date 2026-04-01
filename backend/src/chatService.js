import { GoogleGenerativeAI } from "@google/generative-ai";
import { getKnowledgeBase } from "./knowledge.js";

const apiKey = process.env.GEMINI_API_KEY;

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

function buildPrompt(question) {
  const knowledge = getKnowledgeBase();

  return `
You are MoreYun AI, a strict factual assistant about the Moriones Festival.

Rules:
1. Answer only from the provided knowledge base.
2. Do not guess, infer beyond the text, or use outside knowledge.
3. If the answer is not fully supported by the knowledge base, respond with grounded=false.
4. Keep answers concise and clear.
5. Cite only URLs that appear in the knowledge base.
6. Output valid JSON only with this shape:
{
  "grounded": boolean,
  "answer": string,
  "citations": string[],
  "reason": string
}

Knowledge base:
${knowledge.text}

User question:
${question}
  `.trim();
}

export async function generateGroundedAnswer(question) {
  const client = createClient();
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(buildPrompt(question));
  const text = extractJsonPayload(result.response.text());

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Model returned an invalid response format.");
  }

  if (!parsed.grounded) {
    return {
      grounded: false,
      answer:
        "I can only answer questions that are directly supported by the verified Moriones Festival sources loaded into MoreYun AI.",
      citations: [],
      reason: parsed.reason || "The question was not fully supported by the source data.",
    };
  }

  const knowledge = getKnowledgeBase();
  const citations = Array.isArray(parsed.citations)
    ? parsed.citations.filter((citation) => knowledge.sources.includes(citation))
    : [];

  if (!parsed.answer || citations.length === 0) {
    return {
      grounded: false,
      answer:
        "I can only answer questions that are directly supported by the verified Moriones Festival sources loaded into MoreYun AI.",
      citations: [],
      reason: "The response did not include a verifiable grounded answer.",
    };
  }

  return {
    grounded: true,
    answer: parsed.answer,
    citations,
    reason: parsed.reason || "Answer grounded in the provided source text.",
  };
}
