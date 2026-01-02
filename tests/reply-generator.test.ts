import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Email, SummarizerResult, ReplyResult } from '../src/types/email.js';
import type { LanguageResult } from '../src/agents/language-detector.js';

/**
 * Reply Generator Agent Test Suite
 * Tests Sub-Agent 2: Smart Reply Generation
 * 
 * Functional Requirements:
 * - Generate context-aware smart replies
 * - Detect and match email tone (formal/casual/neutral)
 * - Support multi-language replies
 */

// Mock OpenAI with configurable response
const mockOpenAIResponse = vi.fn();
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockOpenAIResponse,
      },
    },
  })),
}));

// Set API key for tests
process.env.OPENAI_API_KEY = 'test-api-key';

describe('Reply Generator Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Context-Aware Replies', () => {
    it('should generate a reply addressing the email content', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              reply: 'Thank you for the project update. I am available to meet on Tuesday at 3pm to discuss the blockers.',
              tone: 'formal',
            }),
          },
        }],
      });

      const { generateReply } = await import('../src/agents/reply-generator.js');

      const email: Email = {
        from: 'john@acme.com',
        subject: 'Project Update',
        body: 'Hi team, I wanted to share an update on our Q4 project. Can we meet Tuesday at 3pm?',
      };

      const summary: SummarizerResult = {
        summary: 'Project update with meeting request.',
        keyPoints: ['Q4 project update', 'Meeting request'],
        actionItems: ['Attend meeting'],
      };

      const result = await generateReply(email, summary);

      expect(result).toHaveProperty('reply');
      expect(typeof result.reply).toBe('string');
      expect(result.reply.length).toBeGreaterThan(0);
    });

    it('should generate reply addressing questions in email', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              reply: 'Yes, I can help with the task. The deadline works for me.',
              tone: 'neutral',
            }),
          },
        }],
      });

      const { generateReply } = await import('../src/agents/reply-generator.js');

      const email: Email = {
        from: 'colleague@work.com',
        subject: 'Quick question',
        body: 'Can you help me with this task? Is the deadline okay?',
      };

      const summary: SummarizerResult = {
        summary: 'Request for help and deadline confirmation.',
        keyPoints: ['Help request', 'Deadline question'],
        actionItems: ['Confirm availability'],
      };

      const result = await generateReply(email, summary);

      expect(result.reply).toBeDefined();
      expect(result.reply.length).toBeGreaterThan(10);
    });
  });

  describe('Tone Detection', () => {
    it('should detect formal tone from professional language', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              reply: 'Dear Sir, Thank you for your email. Sincerely.',
              tone: 'formal',
            }),
          },
        }],
      });

      const { generateReply } = await import('../src/agents/reply-generator.js');

      const email: Email = {
        from: 'executive@corporation.com',
        subject: 'Quarterly Report Review',
        body: 'Dear Team, Please find attached the quarterly report. Sincerely, Executive',
      };

      const summary: SummarizerResult = {
        summary: 'Formal request to review quarterly report.',
        keyPoints: ['Quarterly report'],
        actionItems: ['Review report'],
      };

      const result = await generateReply(email, summary);

      expect(result.tone).toBe('formal');
    });

    it('should detect casual tone from informal language', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              reply: 'Hey! Sounds great! Count me in!',
              tone: 'casual',
            }),
          },
        }],
      });

      const { generateReply } = await import('../src/agents/reply-generator.js');

      const email: Email = {
        from: 'friend@email.com',
        subject: 'Weekend plans!',
        body: 'Hey!! Are you free this weekend?? :)',
      };

      const summary: SummarizerResult = {
        summary: 'Casual invitation for weekend plans.',
        keyPoints: ['Weekend plans'],
        actionItems: ['Confirm availability'],
      };

      const result = await generateReply(email, summary);

      expect(result.tone).toBe('casual');
    });

    it('should return valid tone for any email', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              reply: 'Thanks for the update. I will review it.',
              tone: 'neutral',
            }),
          },
        }],
      });

      const { generateReply } = await import('../src/agents/reply-generator.js');

      const email: Email = {
        from: 'contact@company.com',
        subject: 'Update',
        body: 'Here is the update you requested.',
      };

      const summary: SummarizerResult = {
        summary: 'Simple update delivery.',
        keyPoints: ['Update provided'],
        actionItems: [],
      };

      const result = await generateReply(email, summary);

      expect(['formal', 'casual', 'neutral']).toContain(result.tone);
    });
  });

  describe('Multi-Language Support', () => {
    it('should accept German language option', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              reply: 'Vielen Dank für Ihre Nachricht.',
              tone: 'formal',
            }),
          },
        }],
      });

      const { generateReply } = await import('../src/agents/reply-generator.js');

      const email: Email = {
        from: 'hans@beispiel.de',
        subject: 'Besprechung',
        body: 'Sehr geehrte Kollegen, wir treffen uns am Dienstag.',
      };

      const summary: SummarizerResult = {
        summary: 'German meeting invitation.',
        keyPoints: ['Meeting on Tuesday'],
        actionItems: ['Attend meeting'],
      };

      const languageResult: LanguageResult = {
        language: 'de',
        languageName: 'German',
        confidence: 0.95,
      };

      const result = await generateReply(email, summary, { language: languageResult });

      expect(result.reply).toBeDefined();
      expect(result.reply.length).toBeGreaterThan(0);
    });

    it('should accept French language option', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              reply: 'Merci pour votre message.',
              tone: 'formal',
            }),
          },
        }],
      });

      const { generateReply } = await import('../src/agents/reply-generator.js');

      const email: Email = {
        from: 'marie@exemple.fr',
        subject: 'Réunion demain',
        body: 'Bonjour, Pouvez-vous confirmer pour la réunion?',
      };

      const summary: SummarizerResult = {
        summary: 'French meeting confirmation request.',
        keyPoints: ['Meeting tomorrow'],
        actionItems: ['Confirm availability'],
      };

      const languageResult: LanguageResult = {
        language: 'fr',
        languageName: 'French',
        confidence: 0.92,
      };

      const result = await generateReply(email, summary, { language: languageResult });

      expect(result.reply).toBeDefined();
    });

    it('should accept Spanish language option', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              reply: 'Gracias por su mensaje.',
              tone: 'formal',
            }),
          },
        }],
      });

      const { generateReply } = await import('../src/agents/reply-generator.js');

      const email: Email = {
        from: 'carlos@ejemplo.es',
        subject: 'Reunión mañana',
        body: 'Hola, Tenemos una reunión mañana.',
      };

      const summary: SummarizerResult = {
        summary: 'Spanish meeting invitation.',
        keyPoints: ['Meeting tomorrow'],
        actionItems: ['Confirm attendance'],
      };

      const languageResult: LanguageResult = {
        language: 'es',
        languageName: 'Spanish',
        confidence: 0.94,
      };

      const result = await generateReply(email, summary, { language: languageResult });

      expect(result.reply).toBeDefined();
    });

    it('should accept Turkish language option', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              reply: 'Teşekkür ederim.',
              tone: 'formal',
            }),
          },
        }],
      });

      const { generateReply } = await import('../src/agents/reply-generator.js');

      const email: Email = {
        from: 'ahmet@ornek.tr',
        subject: 'Yarınki toplantı',
        body: 'Merhaba, yarın toplantımız var.',
      };

      const summary: SummarizerResult = {
        summary: 'Turkish meeting request.',
        keyPoints: ['Meeting tomorrow'],
        actionItems: ['Confirm attendance'],
      };

      const languageResult: LanguageResult = {
        language: 'tr',
        languageName: 'Turkish',
        confidence: 0.93,
      };

      const result = await generateReply(email, summary, { language: languageResult });

      expect(result.reply).toBeDefined();
    });
  });

  describe('Result Structure', () => {
    it('should return proper ReplyResult structure', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              reply: 'Thank you for your email.',
              tone: 'neutral',
            }),
          },
        }],
      });

      const { generateReply } = await import('../src/agents/reply-generator.js');

      const email: Email = {
        from: 'test@example.com',
        subject: 'Test',
        body: 'Test email.',
      };

      const summary: SummarizerResult = {
        summary: 'Test summary.',
        keyPoints: [],
        actionItems: [],
      };

      const result = await generateReply(email, summary);

      expect(result).toMatchObject({
        reply: expect.any(String),
        tone: expect.stringMatching(/^(formal|casual|neutral)$/),
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty summary gracefully', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              reply: 'Thank you for reaching out.',
              tone: 'neutral',
            }),
          },
        }],
      });

      const { generateReply } = await import('../src/agents/reply-generator.js');

      const email: Email = {
        from: 'sender@example.com',
        subject: 'Message',
        body: 'Some content here.',
      };

      const summary: SummarizerResult = {
        summary: '',
        keyPoints: [],
        actionItems: [],
      };

      const result = await generateReply(email, summary);
      expect(result.reply).toBeDefined();
    });

    it('should handle JSON parsing errors gracefully', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Plain text reply, not JSON.',
          },
        }],
      });

      const { generateReply } = await import('../src/agents/reply-generator.js');

      const email: Email = {
        from: 'test@example.com',
        subject: 'Test',
        body: 'Test.',
      };

      const summary: SummarizerResult = {
        summary: 'Test.',
        keyPoints: [],
        actionItems: [],
      };

      const result = await generateReply(email, summary);

      // Should fallback to raw content
      expect(result.reply).toBeDefined();
      expect(result.tone).toBeDefined();
    });
  });
});
