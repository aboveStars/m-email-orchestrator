import { Ollama } from 'ollama';
import type { Email } from '../types/email.js';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const ollama = new Ollama({ host: OLLAMA_HOST });

export interface LanguageResult {
  language: string;     // ISO 639-1 code (e.g., 'en', 'de', 'fr')
  languageName: string; // Full name (e.g., 'English', 'German', 'French')
  confidence: number;   // 0-1 confidence score
}

const LANGUAGE_DETECTION_PROMPT = `You are a language detection expert. Analyze the given text and identify its language.

Respond ONLY with a JSON object in this exact format:
{
  "language": "ISO 639-1 code (e.g., en, de, fr, es, tr, ar, zh, ja, ko, ru, pt, it, nl)",
  "languageName": "Full name of the language",
  "confidence": 0.95
}

Be extremely accurate. If the text contains multiple languages, identify the primary/dominant language.`;

// Simple heuristic fallback when Ollama is unavailable
function detectLanguageHeuristic(text: string): LanguageResult {
  const lowerText = text.toLowerCase();
  
  // Common language indicators
  const patterns: Array<{ lang: string; name: string; words: string[] }> = [
    { lang: 'de', name: 'German', words: ['ich', 'und', 'der', 'die', 'das', 'mit', 'für', 'ist', 'nicht', 'wir', 'sie', 'ihr'] },
    { lang: 'fr', name: 'French', words: ['je', 'nous', 'vous', 'pour', 'avec', 'dans', 'cette', 'sont', 'être', 'merci', 'bonjour'] },
    { lang: 'es', name: 'Spanish', words: ['hola', 'gracias', 'para', 'tengo', 'está', 'usted', 'nosotros', 'también', 'mucho'] },
    { lang: 'tr', name: 'Turkish', words: ['merhaba', 'için', 'teşekkür', 'nasıl', 'selamlar', 'görüşmek', 'iyi', 'biz', 'sen'] },
    { lang: 'it', name: 'Italian', words: ['ciao', 'grazie', 'buongiorno', 'bene', 'questo', 'sono', 'per', 'anche'] },
    { lang: 'pt', name: 'Portuguese', words: ['obrigado', 'olá', 'você', 'para', 'como', 'está', 'muito', 'bom'] },
    { lang: 'nl', name: 'Dutch', words: ['hallo', 'bedankt', 'voor', 'met', 'zijn', 'hebben', 'goed', 'graag'] },
    { lang: 'ru', name: 'Russian', words: ['привет', 'спасибо', 'для', 'как', 'это', 'мы', 'вы'] },
    { lang: 'ja', name: 'Japanese', words: ['ありがとう', 'こんにちは', 'です', 'ます', 'さん', 'の'] },
    { lang: 'zh', name: 'Chinese', words: ['你好', '谢谢', '请', '我们', '这个', '是'] },
    { lang: 'ko', name: 'Korean', words: ['안녕하세요', '감사합니다', '저는', '있습니다'] },
    { lang: 'ar', name: 'Arabic', words: ['مرحبا', 'شكرا', 'كيف', 'هذا'] },
  ];

  let maxScore = 0;
  let detected: LanguageResult = { language: 'en', languageName: 'English', confidence: 0.7 };

  for (const { lang, name, words } of patterns) {
    const matches = words.filter(word => lowerText.includes(word)).length;
    const score = matches / words.length;
    
    if (score > maxScore) {
      maxScore = score;
      detected = { language: lang, languageName: name, confidence: Math.min(0.6 + score * 0.4, 0.95) };
    }
  }

  return detected;
}

async function checkOllamaAvailable(): Promise<boolean> {
  try {
    await ollama.list();
    return true;
  } catch {
    return false;
  }
}

export async function detectLanguage(email: Email): Promise<LanguageResult> {
  const text = `${email.subject}\n${email.body}`;
  
  const ollamaAvailable = await checkOllamaAvailable();
  
  if (ollamaAvailable) {
    try {
      const response = await ollama.generate({
        model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
        prompt: `Detect the language of this email:\n\n${text}`,
        system: LANGUAGE_DETECTION_PROMPT,
        format: 'json',
        options: {
          temperature: 0.1,
          num_predict: 100,
        },
      });

      const parsed = JSON.parse(response.response);
      return {
        language: parsed.language || 'en',
        languageName: parsed.languageName || 'English',
        confidence: parsed.confidence || 0.9,
      };
    } catch (error) {
      console.log('⚠️ Language detection via Ollama failed, using heuristic');
      return detectLanguageHeuristic(text);
    }
  }
  
  console.log('📝 Ollama unavailable, using heuristic language detection');
  return detectLanguageHeuristic(text);
}

export const languageDetectorAgent = {
  name: 'Language Detector',
  run: detectLanguage,
};
