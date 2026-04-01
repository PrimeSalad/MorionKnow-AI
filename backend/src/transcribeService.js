import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

const apiKey = process.env.GEMINI_API_KEY;

export async function transcribeAudio(audioPath) {
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Read audio file
  const audioData = fs.readFileSync(audioPath);
  const base64Audio = audioData.toString("base64");

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "audio/webm",
        data: base64Audio,
      },
    },
    "Transcribe this audio to text. Only return the transcribed text, nothing else.",
  ]);

  const text = result.response.text().trim();
  return text;
}
