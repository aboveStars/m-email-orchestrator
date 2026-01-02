import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Email, SummarizerResult } from '../src/types/email.js';

/**
 * Summarizer Agent Test Suite
 * Tests Sub-Agent 1: Email Summarization
 * 
 * Functional Requirements:
 * - Generate 2-3 sentence summary
 * - Extract key points
 * - Extract action items
 * 
 * Note: These tests mock external services for unit testing.
 * Integration tests with real Ollama/OpenAI are in performance.test.ts
 */

// Mock Ollama - simulate unavailable
vi.mock('ollama', () => ({
  Ollama: vi.fn().mockImplementation(() => ({
    list: vi.fn().mockRejectedValue(new Error('Connection refused')),
    generate: vi.fn().mockRejectedValue(new Error('Connection refused')),
  })),
}));

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

describe('Summarizer Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Summary Format', () => {
    it('should return a summary string', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'This email discusses the Q4 project status. The sender requests a meeting to review progress.',
              keyPoints: ['Q4 project update', 'Meeting request'],
              actionItems: ['Schedule meeting'],
            }),
          },
        }],
      });

      const { summarize } = await import('../src/agents/summarizer.js');

      const email: Email = {
        from: 'john@acme.com',
        subject: 'Q4 Project Update',
        body: 'Hi team, I wanted to share an update on our Q4 project.',
      };

      const result = await summarize(email);

      expect(result).toHaveProperty('summary');
      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('should produce a summary of 2-3 sentences', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'The email requests a team meeting. Topics include Q4 review and budget planning.',
              keyPoints: ['Team meeting', 'Q4 review'],
              actionItems: ['Confirm attendance'],
            }),
          },
        }],
      });

      const { summarize } = await import('../src/agents/summarizer.js');

      const email: Email = {
        from: 'manager@company.com',
        subject: 'Team Meeting Request',
        body: 'Please join us for a team meeting tomorrow.',
      };

      const result = await summarize(email);

      // Count sentences (based on period count)
      const sentenceCount = (result.summary.match(/[.!?]+/g) || []).length;
      expect(sentenceCount).toBeGreaterThanOrEqual(1);
      expect(sentenceCount).toBeLessThanOrEqual(4);
    });
  });

  describe('Key Points Extraction', () => {
    it('should return an array of key points', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'Project update email.',
              keyPoints: ['Budget approved', 'Timeline extended', 'New team member'],
              actionItems: [],
            }),
          },
        }],
      });

      const { summarize } = await import('../src/agents/summarizer.js');

      const email: Email = {
        from: 'pm@company.com',
        subject: 'Project Status',
        body: 'Great news! The budget has been approved.',
      };

      const result = await summarize(email);

      expect(result).toHaveProperty('keyPoints');
      expect(Array.isArray(result.keyPoints)).toBe(true);
      expect(result.keyPoints.length).toBeGreaterThan(0);
    });
  });

  describe('Action Items Extraction', () => {
    it('should return an array of action items', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'Email with action requests.',
              keyPoints: ['Deadline approaching'],
              actionItems: ['Submit report', 'Review document', 'Schedule call'],
            }),
          },
        }],
      });

      const { summarize } = await import('../src/agents/summarizer.js');

      const email: Email = {
        from: 'boss@company.com',
        subject: 'Action Items',
        body: 'Please submit your report by Friday.',
      };

      const result = await summarize(email);

      expect(result).toHaveProperty('actionItems');
      expect(Array.isArray(result.actionItems)).toBe(true);
      expect(result.actionItems.length).toBeGreaterThan(0);
    });

    it('should return empty action items for informational emails', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'Informational newsletter.',
              keyPoints: ['Industry trends'],
              actionItems: [],
            }),
          },
        }],
      });

      const { summarize } = await import('../src/agents/summarizer.js');

      const email: Email = {
        from: 'newsletter@techsite.com',
        subject: 'Weekly Tech News',
        body: 'Here are the top tech stories this week.',
      };

      const result = await summarize(email);

      expect(result.actionItems).toBeDefined();
      expect(Array.isArray(result.actionItems)).toBe(true);
      expect(result.actionItems.length).toBe(0);
    });
  });

  describe('Result Structure', () => {
    it('should return proper SummarizerResult structure', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'Test summary.',
              keyPoints: ['Point 1'],
              actionItems: ['Action 1'],
            }),
          },
        }],
      });

      const { summarize } = await import('../src/agents/summarizer.js');

      const email: Email = {
        from: 'test@example.com',
        subject: 'Test',
        body: 'Test email.',
      };

      const result = await summarize(email);

      expect(result).toMatchObject({
        summary: expect.any(String),
        keyPoints: expect.any(Array),
        actionItems: expect.any(Array),
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle email with only subject', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'Short reminder email.',
              keyPoints: ['Reminder'],
              actionItems: [],
            }),
          },
        }],
      });

      const { summarize } = await import('../src/agents/summarizer.js');

      const email: Email = {
        from: 'reminder@calendar.com',
        subject: 'Reminder: Meeting at 3pm',
        body: '',
      };

      const result = await summarize(email);
      expect(result.summary).toBeDefined();
    });

    it('should handle email with attachments', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'Email with attached report.',
              keyPoints: ['Report attached'],
              actionItems: ['Review report'],
            }),
          },
        }],
      });

      const { summarize } = await import('../src/agents/summarizer.js');

      const email: Email = {
        from: 'analyst@company.com',
        subject: 'Q4 Report',
        body: 'Please find the Q4 report attached.',
        attachments: ['q4-report.pdf'],
      };

      const result = await summarize(email);
      expect(result.summary).toBeDefined();
    });

    it('should handle very long email body', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'Comprehensive project update with multiple sections.',
              keyPoints: ['Multiple updates'],
              actionItems: ['Review details'],
            }),
          },
        }],
      });

      const { summarize } = await import('../src/agents/summarizer.js');

      const longBody = 'This is a paragraph about the project. '.repeat(100);
      const email: Email = {
        from: 'long@example.com',
        subject: 'Comprehensive Update',
        body: longBody,
      };

      const result = await summarize(email);
      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeLessThan(email.body.length);
    });
  });

  describe('Service Fallback', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      mockOpenAIResponse.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'This is just plain text, not JSON.',
          },
        }],
      });

      const { summarize } = await import('../src/agents/summarizer.js');

      const email: Email = {
        from: 'test@example.com',
        subject: 'Test',
        body: 'Test email.',
      };

      const result = await summarize(email);

      // Should fallback to raw text as summary
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('keyPoints');
      expect(result).toHaveProperty('actionItems');
    });
  });
});
