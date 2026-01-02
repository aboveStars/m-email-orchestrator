import "dotenv/config";
import express from "express";
import { EmailSchema, type ProcessEmailResponse } from "../types/email.js";
import { masterOrchestrator } from "../orchestrator/master.js";
import { summarizerAgent } from "../agents/summarizer.js";
import { spamDetectorAgent } from "../agents/spam-detector.js";
import { calendarExtractorAgent } from "../agents/calendar-extractor.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.set("json spaces", 2);
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "email-orchestrator",
    timestamp: new Date().toISOString(),
  });
});

// Main orchestration endpoint
app.post("/api/process-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Missing email object in request body",
      } as ProcessEmailResponse);
    }

    // Validate email structure
    const validationResult = EmailSchema.safeParse(email);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: `Invalid email format: ${validationResult.error.message}`,
      } as ProcessEmailResponse);
    }

    // Process the email
    const result = await masterOrchestrator.processEmail(validationResult.data);

    res.json({
      success: true,
      orchestration_result: result,
    } as ProcessEmailResponse);
  } catch (error) {
    console.error("Error processing email:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    } as ProcessEmailResponse);
  }
});

// Individual agent endpoints for testing
app.post("/api/agents/summarizer", async (req, res) => {
  try {
    const { email } = req.body;
    const validationResult = EmailSchema.safeParse(email);
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error.message });
    }
    const result = await summarizerAgent.run(validationResult.data);
    res.json({ success: true, result });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

app.post("/api/agents/spam-detector", async (req, res) => {
  try {
    const { email } = req.body;
    const validationResult = EmailSchema.safeParse(email);
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error.message });
    }
    const result = await spamDetectorAgent.run(validationResult.data);
    res.json({ success: true, result });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

app.post("/api/agents/calendar-extractor", async (req, res) => {
  try {
    const { email } = req.body;
    const validationResult = EmailSchema.safeParse(email);
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error.message });
    }
    const result = await calendarExtractorAgent.run(validationResult.data);
    res.json({ success: true, result });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                  📧 Email Orchestrator                     ║
║              Master Agent + 4 Sub-Agents                   ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}                  ║
║                                                           ║
║  Endpoints:                                               ║
║    POST /api/process-email    - Full orchestration        ║
║    POST /api/agents/summarizer    - Test summarizer       ║
║    POST /api/agents/spam-detector - Test spam detector    ║
║    POST /api/agents/calendar-extractor - Test calendar    ║
║    GET  /api/health           - Health check              ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
