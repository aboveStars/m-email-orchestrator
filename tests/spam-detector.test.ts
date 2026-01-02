import { describe, it, expect } from 'vitest';
import { detectSpam } from '../src/agents/spam-detector.js';
import type { Email } from '../src/types/email.js';

describe('Spam Detector Agent', () => {
  it('should detect phishing email with sender domain mismatch', async () => {
    const email: Email = {
      from: 'PayPal Support <security@paypa1-verify.com>',
      subject: 'Verify your account',
      body: 'Click here to verify your account immediately.',
      attachments: [],
    };

    const result = await detectSpam(email);
    expect(result.score).toBeGreaterThan(0.3);
    expect(result.features.senderDomainMismatch).toBe(true);
  });

  it('should detect spam with urgency words', async () => {
    const email: Email = {
      from: 'alerts@example.com',
      subject: 'URGENT: Action Required',
      body: 'Act now! Your account will be suspended within 24 hours if you do not verify immediately.',
      attachments: [],
    };

    const result = await detectSpam(email);
    expect(result.score).toBeGreaterThan(0.2);
    expect(result.features.urgencyWords).toBe(true);
  });

  it('should detect suspicious links', async () => {
    const email: Email = {
      from: 'newsletter@company.com',
      subject: 'Check this out',
      body: 'Click here: http://bit.ly/suspicious123',
      attachments: [],
    };

    const result = await detectSpam(email);
    expect(result.features.suspiciousLinks).toBe(true);
  });

  it('should pass legitimate business email', async () => {
    const email: Email = {
      from: 'john@acme.com',
      subject: 'Q4 Review Meeting',
      body: 'Hi team, let\'s meet Tuesday at 3pm to discuss Q4 results.',
      attachments: [],
    };

    const result = await detectSpam(email);
    expect(result.score).toBeLessThan(0.5);
    expect(result.isSpam).toBe(false);
  });

  it('should detect known spam patterns', async () => {
    const email: Email = {
      from: 'winner@lottery.com',
      subject: 'Congratulations! You have won!',
      body: 'Congratulations! You have won the lottery. Claim your prize now!',
      attachments: [],
    };

    const result = await detectSpam(email);
    expect(result.features.knownSpamPatterns).toBe(true);
    expect(result.score).toBeGreaterThan(0.1); // Known spam patterns weight is 0.15
  });
});
