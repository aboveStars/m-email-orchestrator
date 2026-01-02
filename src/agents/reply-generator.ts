import OpenAI from "openai";
import type {
  Email,
  ReplyResult,
  SummarizerResult,
  LanguageResult,
} from "../types/email.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getSystemPrompt(language?: LanguageResult): string {
  let langInstruction = "";

  if (language && language.language !== "en") {
    const displayName = new Intl.DisplayNames(["en"], { type: "language" }).of(
      language.language
    );
    langInstruction = `\n6. IMPORTANT: Generate the reply in ${displayName} (${language.language}). The original email is in ${displayName}, so respond in the same language.`;
  } else {
    langInstruction = `\n6. IMPORTANT: Detect the language of the incoming email and Reply in the SAME language.`;
  }

  return `You are an expert email assistant that generates professional, context-aware email replies.

Guidelines:
1. Match the tone of the original email (formal/casual)
2. Be concise but complete
3. Address all questions or requests
4. Include appropriate greeting and sign-off
5. Never be overly verbose or include unnecessary pleasantries${langInstruction}

Respond in JSON format:
{
  "reply": "Your generated reply here",
  "tone": "formal" | "casual" | "neutral"
}`;
}

function detectTone(email: Email): "formal" | "casual" | "neutral" {
  const body = email.body.toLowerCase();
  const subject = email.subject.toLowerCase();

  // Formal indicators (multi-language)
  const formalIndicators = [
    // English
    "dear",
    "sincerely",
    "regards",
    "respectfully",
    "please find attached",
    "as per our",
    "pursuant to",
    "hereby",
    "kindly",
    "would you please",
    // German
    "sehr geehrte",
    "mit freundlichen grüßen",
    "hochachtungsvoll",
    // French
    "cher",
    "chère",
    "cordialement",
    "veuillez",
    // Spanish
    "estimado",
    "estimada",
    "atentamente",
    "cordialmente",
    // Turkish
    "sayın",
    "saygılarımla",
    "saygılar",
  ];

  // Casual indicators (multi-language)
  const casualIndicators = [
    // English
    "hey",
    "hi!",
    "thanks!",
    "cheers",
    "btw",
    "gonna",
    "wanna",
    "asap",
    "lol",
    "haha",
    "!!",
    ":)",
    ":D",
    // German
    "hallo",
    "tschüss",
    "lg",
    "vg",
    // French
    "salut",
    "bisous",
    "coucou",
    // Spanish
    "hola",
    "saludos",
    "vale",
    // Turkish
    "merhaba",
    "selam",
    "görüşürüz",
  ];

  const formalScore = formalIndicators.filter(
    (i) => body.includes(i) || subject.includes(i)
  ).length;
  const casualScore = casualIndicators.filter(
    (i) => body.includes(i) || subject.includes(i)
  ).length;

  if (formalScore > casualScore) return "formal";
  if (casualScore > formalScore) return "casual";
  return "neutral";
}

export interface GenerateReplyOptions {
  language?: LanguageResult;
}

export async function generateReply(
  email: Email,
  summary: SummarizerResult | null,
  options?: GenerateReplyOptions
): Promise<ReplyResult> {
  const detectedTone = detectTone(email);
  const language = options?.language;

  let languageInstructions = "";
  if (language && language.language !== "en") {
    // If language is provided explicitly
    const displayName = new Intl.DisplayNames(["en"], { type: "language" }).of(
      language.language
    );
    languageInstructions = `
6. IMPORTANT: Generate the reply in ${displayName} (${language.language}). The original email is in ${displayName}, so respond in the same language.`;
  } else {
    // If no language provided (parallel execution case), instruct to detect and match
    languageInstructions = `
6. IMPORTANT: Detect the language of the incoming email and Reply in the SAME language.`;
  }

  const prompt = `Generate a reply to this email.

Original Email:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.body}

${
  summary
    ? `Summary: ${summary.summary}
Key Points: ${summary.keyPoints.join(", ")}
Action Items: ${summary.actionItems.join(", ")}`
    : ""
}

Detected Tone: ${detectedTone}
${detectedTone === "formal" ? "Use formal, professional language." : ""}
${
  detectedTone === "casual" ? "Use friendly, conversational language." : ""
}${languageInstructions}

Generate an appropriate reply:`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { role: "system", content: getSystemPrompt(language) },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(content);
    return {
      reply: parsed.reply || "",
      tone: parsed.tone || detectedTone,
    };
  } catch {
    return {
      reply: content.trim(),
      tone: detectedTone,
    };
  }
}

export const replyGeneratorAgent = {
  name: "Smart Reply Generator",
  run: generateReply,
};
