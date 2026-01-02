import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Email, OrchestrationResult } from '../src/types/email.js';

/**
 * Master Orchestrator Test Suite
 * Tests the routing and coordination of all 4 sub-agents
 * 
 * Functional Requirements:
 * - Route email to appropriate sub-agents
 * - Parallel execution of independent agents
 * - Conditional reply generation (skip for spam)
 */

// Mock the agents for unit testing
vi.mock('../src/agents/summarizer.js', () => ({
  summarizerAgent: {
    name: 'Email Summarizer',
    run: vi.fn().mockResolvedValue({
      summary: 'Test summary of the email.',
      keyPoints: ['Point 1', 'Point 2'],
      actionItems: ['Action 1'],
    }),
  },
}));

vi.mock('../src/agents/spam-detector.js', () => ({
  spamDetectorAgent: {
    name: 'Spam Detector',
    run: vi.fn().mockResolvedValue({
      score: 0.1,
      isSpam: false,
      reasons: [],
      features: {
        senderDomainMismatch: false,
        suspiciousLinks: false,
        urgencyWords: false,
        grammarIssues: false,
        knownSpamPatterns: false,
      },
    }),
  },
}));

vi.mock('../src/agents/calendar-extractor.js', () => ({
  calendarExtractorAgent: {
    name: 'Calendar Extractor',
    run: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../src/agents/language-detector.js', () => ({
  languageDetectorAgent: {
    name: 'Language Detector',
    run: vi.fn().mockResolvedValue({
      language: 'en',
      languageName: 'English',
      confidence: 0.95,
    }),
  },
}));

vi.mock('../src/agents/reply-generator.js', () => ({
  replyGeneratorAgent: {
    name: 'Reply Generator',
    run: vi.fn().mockResolvedValue({
      reply: 'Thank you for your email.',
      tone: 'neutral',
    }),
  },
}));

describe('Master Orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Email Routing', () => {
    it('should route email to all 4 sub-agents for legitimate email', async () => {
      const { processEmail } = await import('../src/orchestrator/master.js');
      const { summarizerAgent } = await import('../src/agents/summarizer.js');
      const { spamDetectorAgent } = await import('../src/agents/spam-detector.js');
      const { calendarExtractorAgent } = await import('../src/agents/calendar-extractor.js');
      const { replyGeneratorAgent } = await import('../src/agents/reply-generator.js');

      const email: Email = {
        from: 'john@acme.com',
        subject: 'Project Update',
        body: 'Here is the latest update on our project progress.',
      };

      const result = await processEmail(email);

      // Verify all agents were called
      expect(summarizerAgent.run).toHaveBeenCalledWith(email);
      expect(spamDetectorAgent.run).toHaveBeenCalledWith(email);
      expect(calendarExtractorAgent.run).toHaveBeenCalledWith(email);
      expect(replyGeneratorAgent.run).toHaveBeenCalled();

      // Verify result structure
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('suggested_reply');
      expect(result).toHaveProperty('spam_score');
      expect(result).toHaveProperty('calendar_event');
      expect(result).toHaveProperty('actions_taken');
      expect(result).toHaveProperty('processing_time_ms');
    });

    it('should skip reply generation for spam emails', async () => {
      // Override spam detector mock to return spam
      const { spamDetectorAgent } = await import('../src/agents/spam-detector.js');
      vi.mocked(spamDetectorAgent.run).mockResolvedValueOnce({
        score: 0.85,
        isSpam: true,
        reasons: ['Phishing detected'],
        features: {
          senderDomainMismatch: true,
          suspiciousLinks: true,
          urgencyWords: true,
          grammarIssues: false,
          knownSpamPatterns: true,
        },
      });

      const { processEmail } = await import('../src/orchestrator/master.js');
      const { replyGeneratorAgent } = await import('../src/agents/reply-generator.js');

      const spamEmail: Email = {
        from: 'PayPal <security@paypa1-verify.com>',
        subject: 'URGENT: Verify your account',
        body: 'Click here to verify immediately or your account will be suspended.',
      };

      const result = await processEmail(spamEmail);

      // Reply generator should NOT be called for spam
      expect(replyGeneratorAgent.run).not.toHaveBeenCalled();
      expect(result.suggested_reply).toBeNull();
      expect(result.spam_score).toBeGreaterThan(0.5);
    });
  });

  describe('Priority Calculation', () => {
    it('should assign high priority to meeting emails', async () => {
      const { calendarExtractorAgent } = await import('../src/agents/calendar-extractor.js');
      vi.mocked(calendarExtractorAgent.run).mockResolvedValueOnce({
        title: 'Q4 Review Meeting',
        date: new Date().toISOString(),
        attendees: ['john@acme.com'],
      });

      const { processEmail } = await import('../src/orchestrator/master.js');

      const meetingEmail: Email = {
        from: 'manager@company.com',
        subject: 'Q4 Review Meeting - Tomorrow at 3pm',
        body: 'Please join us tomorrow at 3pm in Room 204.',
      };

      const result = await processEmail(meetingEmail);
      expect(result.priority).toBe('high');
    });

    it('should assign low priority to spam emails', async () => {
      const { spamDetectorAgent } = await import('../src/agents/spam-detector.js');
      vi.mocked(spamDetectorAgent.run).mockResolvedValueOnce({
        score: 0.9,
        isSpam: true,
        reasons: ['Spam patterns detected'],
        features: {
          senderDomainMismatch: true,
          suspiciousLinks: false,
          urgencyWords: true,
          grammarIssues: false,
          knownSpamPatterns: true,
        },
      });

      const { processEmail } = await import('../src/orchestrator/master.js');

      const spamEmail: Email = {
        from: 'winner@lottery.com',
        subject: 'You won $1 million!',
        body: 'Claim your prize now!',
      };

      const result = await processEmail(spamEmail);
      expect(result.priority).toBe('low');
    });

    it('should detect high priority from urgent keywords', async () => {
      const { processEmail } = await import('../src/orchestrator/master.js');

      const urgentEmail: Email = {
        from: 'ceo@company.com',
        subject: 'URGENT: Need your input now',
        body: 'Please respond ASAP.',
      };

      const result = await processEmail(urgentEmail);
      expect(result.priority).toBe('high');
    });

    it('should detect low priority from newsletter keywords', async () => {
      const { processEmail } = await import('../src/orchestrator/master.js');

      const newsletterEmail: Email = {
        from: 'news@techsite.com',
        subject: 'Weekly Tech Newsletter',
        body: 'Here are this week\'s top stories.',
      };

      const result = await processEmail(newsletterEmail);
      expect(result.priority).toBe('low');
    });
  });

  describe('Actions Tracking', () => {
    it('should track all actions taken by agents', async () => {
      const { processEmail } = await import('../src/orchestrator/master.js');

      const email: Email = {
        from: 'colleague@work.com',
        subject: 'Quick question',
        body: 'Can you help me with this task?',
      };

      const result = await processEmail(email);

      expect(result.actions_taken).toBeInstanceOf(Array);
      expect(result.actions_taken.length).toBeGreaterThan(0);
      expect(result.actions_taken.some(a => a.includes('Summarizer'))).toBe(true);
      expect(result.actions_taken.some(a => a.includes('Language'))).toBe(true);
    });

    it('should include spam detection action in results', async () => {
      const { processEmail } = await import('../src/orchestrator/master.js');

      const email: Email = {
        from: 'friend@example.com',
        subject: 'Hello',
        body: 'How are you doing?',
      };

      const result = await processEmail(email);

      expect(result.actions_taken.some(a => 
        a.includes('Spam') || a.includes('spam')
      )).toBe(true);
    });
  });

  describe('Language Detection Integration', () => {
    it('should include detected language in result', async () => {
      const { processEmail } = await import('../src/orchestrator/master.js');

      const email: Email = {
        from: 'user@example.com',
        subject: 'Test Email',
        body: 'This is a test email in English.',
      };

      const result = await processEmail(email);

      expect(result.detected_language).toBeDefined();
      expect(result.detected_language?.code).toBe('en');
      expect(result.detected_language?.name).toBe('English');
      expect(result.detected_language?.confidence).toBeGreaterThan(0);
    });
  });

  describe('Processing Time', () => {
    it('should record processing time in milliseconds', async () => {
      const { processEmail } = await import('../src/orchestrator/master.js');

      const email: Email = {
        from: 'test@example.com',
        subject: 'Test',
        body: 'Test email body.',
      };

      const result = await processEmail(email);

      expect(result.processing_time_ms).toBeDefined();
      expect(typeof result.processing_time_ms).toBe('number');
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Master Orchestrator - Parallel Execution', () => {
  it('should execute independent agents in parallel', async () => {
    const executionOrder: string[] = [];
    
    // Track execution order
    const { summarizerAgent } = await import('../src/agents/summarizer.js');
    const { spamDetectorAgent } = await import('../src/agents/spam-detector.js');
    const { calendarExtractorAgent } = await import('../src/agents/calendar-extractor.js');
    const { languageDetectorAgent } = await import('../src/agents/language-detector.js');

    vi.mocked(summarizerAgent.run).mockImplementation(async () => {
      executionOrder.push('summarizer-start');
      await new Promise(r => setTimeout(r, 10));
      executionOrder.push('summarizer-end');
      return { summary: 'Test', keyPoints: [], actionItems: [] };
    });

    vi.mocked(spamDetectorAgent.run).mockImplementation(async () => {
      executionOrder.push('spam-start');
      await new Promise(r => setTimeout(r, 10));
      executionOrder.push('spam-end');
      return { score: 0.1, isSpam: false, reasons: [], features: {
        senderDomainMismatch: false,
        suspiciousLinks: false,
        urgencyWords: false,
        grammarIssues: false,
        knownSpamPatterns: false,
      }};
    });

    vi.mocked(calendarExtractorAgent.run).mockImplementation(async () => {
      executionOrder.push('calendar-start');
      await new Promise(r => setTimeout(r, 10));
      executionOrder.push('calendar-end');
      return null;
    });

    vi.mocked(languageDetectorAgent.run).mockImplementation(async () => {
      executionOrder.push('language-start');
      await new Promise(r => setTimeout(r, 10));
      executionOrder.push('language-end');
      return { language: 'en', languageName: 'English', confidence: 0.95 };
    });

    const { processEmail } = await import('../src/orchestrator/master.js');

    const email: Email = {
      from: 'test@example.com',
      subject: 'Test',
      body: 'Test body.',
    };

    await processEmail(email);

    // All agents should start before any ends (parallel execution)
    const startIndices = executionOrder
      .filter(e => e.endsWith('-start'))
      .map(e => executionOrder.indexOf(e));
    
    const endIndices = executionOrder
      .filter(e => e.endsWith('-end'))
      .map(e => executionOrder.indexOf(e));

    // At least some starts should happen before all ends complete
    // This verifies parallel execution
    expect(Math.min(...endIndices)).toBeGreaterThanOrEqual(startIndices.length - 1);
  });
});
