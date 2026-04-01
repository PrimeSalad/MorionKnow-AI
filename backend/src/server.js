import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import { generateGroundedAnswer } from "./chatService.js";
import { getKnowledgeBase } from "./knowledge.js";
import { transcribeAudio } from "./transcribeService.js";

const app = express();
const port = Number(process.env.PORT || 3001);
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

app.use(
  cors({
    origin: frontendUrl,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const knowledge = getKnowledgeBase();

  res.json({
    status: "ok",
    app: "MorionKnow AI",
    sources: knowledge.sources,
  });
});

app.post("/api/chat", async (req, res) => {
  const question = String(req.body?.message || "").trim();
  const language = String(req.body?.language || "en").trim(); // 'en' or 'tl'
  const enableWebSearch = req.body?.enableWebSearch !== false; // default true

  if (!question) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const reply = await generateGroundedAnswer(question, language, enableWebSearch);
    return res.json(reply);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to generate a response.",
    });
  }
});

app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Audio file is required." });
  }

  try {
    const text = await transcribeAudio(req.file.path);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    return res.json({ text });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    return res.status(500).json({
      error: error.message || "Failed to transcribe audio.",
    });
  }
});

app.listen(port, () => {
  console.log(`MorionKnow AI backend running on http://localhost:${port}`);
});
