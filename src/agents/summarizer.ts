import { Ollama } from "ollama";
import OpenAI from "openai";
import type { Email, SummarizerResult } from "../types/email.js";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";

const ollama = new Ollama({ host: OLLAMA_HOST });

// Fallback to OpenAI if Ollama is unavailable
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SUMMARIZER_SYSTEM_PROMPT = `You are an expert email summarizer and language detector. Your task is to:
1. Detect the primary language of the email.
2. Provide a concise 2-3 sentence summary of the email.
3. Extract key points (bullet format).
4. Identify any action items or requests.

Be direct and focus on the most important information. Do not include pleasantries or filler.

Respond in RAW JSON format (do not use markdown code blocks):
{
  "language": "ISO 639-1 code (e.g. en, fr, de)",
  "summary": "2-3 sentence summary here",
  "keyPoints": ["point 1", "point 2"],
  "actionItems": ["action 1", "action 2"]
}`;

async function checkOllamaAvailable(): Promise<boolean> {
  try {
    await ollama.list();
    return true;
  } catch {
    return false;
  }
}

async function summarizeWithOllama(email: Email): Promise<SummarizerResult> {
  const prompt = `Summarize this email:

From: ${email.from}
Subject: ${email.subject}
Body: ${email.body}
${
  email.attachments?.length
    ? `Attachments: ${email.attachments.join(", ")}`
    : ""
}`;

  const response = await ollama.generate({
    model: OLLAMA_MODEL,
    prompt,
    system: SUMMARIZER_SYSTEM_PROMPT,
  });

  // Clean up potential markdown code blocks
  const cleanResponse = response.response
    .replace(/^```(json)?\s*|\s*```$/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleanResponse);
    return {
      summary: parsed.summary || "",
      keyPoints: parsed.keyPoints || [],
      actionItems: parsed.actionItems || [],
      language: parsed.language || "en",
    };
  } catch {
    // If JSON parsing fails, return the raw response as summary
    return {
      summary: cleanResponse,
      keyPoints: [],
      actionItems: [],
      language: "en",
    };
  }
}

async function summarizeWithOpenAI(email: Email): Promise<SummarizerResult> {
  if (!openai) {
    throw new Error("OpenAI client not initialized - missing OPENAI_API_KEY");
  }

  const prompt = `Summarize this email:

From: ${email.from}
Subject: ${email.subject}
Body: ${email.body}
${
  email.attachments?.length
    ? `Attachments: ${email.attachments.join(", ")}`
    : ""
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { role: "system", content: SUMMARIZER_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(content);
    return {
      summary: parsed.summary || "",
      keyPoints: parsed.keyPoints || [],
      actionItems: parsed.actionItems || [],
      language: parsed.language || "en",
    };
  } catch {
    return {
      summary: content.trim(),
      keyPoints: [],
      actionItems: [],
      language: "en",
    };
  }
}

export async function summarize(email: Email): Promise<SummarizerResult> {
  const ollamaAvailable = await checkOllamaAvailable();

  if (ollamaAvailable) {
    console.log("📝 Using Ollama for summarization (local, free)");
    return summarizeWithOllama(email);
  }

  if (openai) {
    console.log(
      "📝 Ollama unavailable, falling back to OpenAI for summarization"
    );
    return summarizeWithOpenAI(email);
  }

  throw new Error(
    "No summarization service available - ensure Ollama is running or OPENAI_API_KEY is set"
  );
}

export const summarizerAgent = {
  name: "Email Summarizer",
  run: summarize,
};
