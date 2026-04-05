import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const knowledgePath = path.resolve(__dirname, "../../text/moriones_data.txt");

const rawText = fs.readFileSync(knowledgePath, "utf8");

const sourcePattern = /^Source:\s*(https?:\/\/\S+)/gim;
const sources = Array.from(rawText.matchAll(sourcePattern)).map((match) => match[1]);

const normalizedKnowledge = rawText
  .replace(/\uFFFD/g, "")
  .replace(/â€“/g, "-")
  .replace(/â€™/g, "'")
  .replace(/â€œ|â€/g, '"')
  .trim();

export function getKnowledgeBase() {
  return {
    text: normalizedKnowledge,
    sources,
  };
}
