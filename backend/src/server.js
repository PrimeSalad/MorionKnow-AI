import "dotenv/config";
import express from "express";
import cors from "cors";
import { generateGroundedAnswer } from "./chatService.js";
import { getKnowledgeBase } from "./knowledge.js";

const app = express();
const port = Number(process.env.PORT || 3001);
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

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
    app: "MoreYun AI",
    sources: knowledge.sources,
  });
});

app.post("/api/chat", async (req, res) => {
  const question = String(req.body?.message || "").trim();

  if (!question) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const reply = await generateGroundedAnswer(question);
    return res.json(reply);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to generate a response.",
    });
  }
});

app.listen(port, () => {
  console.log(`MoreYun AI backend running on http://localhost:${port}`);
});
