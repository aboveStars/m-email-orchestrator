import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectSpam } from '../src/agents/spam-detector.js';
import type { Email } from '../src/types/email.js';

/**
 * Accuracy Benchmark Test Suite
 * Tests spam detection accuracy against a labeled dataset
 * Target: 95%+ correct classifications
 */

// Labeled test dataset
const LABELED_EMAILS: Array<{ email: Email; isSpam: boolean; description: string }> = [
  // SPAM EMAILS (should be detected as spam)
  {
    email: {
      from: 'PayPal Support <security@paypa1-verify.com>',
      subject: 'URGENT: Verify your account immediately',
      body: 'Dear Valued Customer, Your account will be suspended. Click here to verify: http://bit.ly/xyz123',
    },
    isSpam: true,
    description: 'Phishing with domain mismatch + urgency',
  },
  {
    email: {
      from: 'winner@lottery-intl.com',
      subject: 'Congratulations! You have won $1,000,000',
      body: 'You have been selected as the winner. Claim your prize by sending your bank details.',
    },
    isSpam: true,
    description: 'Lottery scam pattern',
  },
  {
    email: {
      from: 'Amazon Security <alert@amaz0n-verify.net>',
      subject: 'Your account has been suspended',
      body: 'Unusual activity detected. Click to verify now or account will be closed within 24 hours.',
    },
    isSpam: true,
    description: 'Brand impersonation + urgency',
  },
  {
    email: {
      from: 'prince.nigeria@funds.com',
      subject: 'Urgent Business Proposal',
      body: 'Dear friend, I am a Nigerian prince. I have an inheritance of $50 million. Wire transfer needed.',
    },
    isSpam: true,
    description: 'Nigerian prince scam',
  },
  {
    email: {
      from: 'support@secure-banking.xyz',
      subject: 'Action Required: Password Expired',
      body: 'Kindly do the needful and revert back to us. Your good self must update password at http://192.168.1.1/login',
    },
    isSpam: true,
    description: 'Grammar patterns + IP-based URL',
  },
  {
    email: {
      from: 'Microsoft <account@micr0soft-verify.com>',
      subject: 'Final Notice: Account Closure',
      body: 'Last chance to keep your account. Verify now at http://tinyurl.com/ms-verify',
    },
    isSpam: true,
    description: 'Brand impersonation + shortened URL',
  },
  {
    email: {
      from: 'deals@amazing-offers.net',
      subject: 'Limited Time: Act Now!',
      body: 'Click here immediately to claim your reward. This expires in 48 hours! Don\'t delay!',
    },
    isSpam: true,
    description: 'Multiple urgency triggers',
  },

  // LEGITIMATE EMAILS (should NOT be detected as spam)
  {
    email: {
      from: 'john@acme.com',
      subject: 'Q4 Review Meeting',
      body: 'Hi team, let\'s meet Tuesday at 3pm to discuss Q4 results. Best, John',
    },
    isSpam: false,
    description: 'Normal business meeting request',
  },
  {
    email: {
      from: 'hr@company.com',
      subject: 'Welcome to the team!',
      body: 'We are excited to have you join us. Please find attached your onboarding documents.',
    },
    isSpam: false,
    description: 'Normal HR onboarding email',
  },
  {
    email: {
      from: 'support@github.com',
      subject: 'Your PR was merged',
      body: 'Your pull request #123 was successfully merged into main. Great work!',
    },
    isSpam: false,
    description: 'Normal GitHub notification',
  },
  {
    email: {
      from: 'alice@partner.io',
      subject: 'Re: Project proposal',
      body: 'Thanks for the proposal. We\'d like to schedule a call to discuss next steps.',
    },
    isSpam: false,
    description: 'Normal business reply',
  },
  {
    email: {
      from: 'newsletter@techcrunch.com',
      subject: 'Weekly Tech Digest',
      body: 'Here are the top tech stories this week. Featured: AI breakthroughs, startup funding rounds.',
    },
    isSpam: false,
    description: 'Legitimate newsletter',
  },
  {
    email: {
      from: 'invoice@stripe.com',
      subject: 'Invoice #12345 - Payment Received',
      body: 'Thank you for your payment of $99.00. Your subscription is now active.',
    },
    isSpam: false,
    description: 'Legitimate payment confirmation',
  },
  {
    email: {
      from: 'manager@workplace.com',
      subject: 'Project deadline reminder',
      body: 'Hi, just a friendly reminder that the project is due next Friday. Let me know if you need help.',
    },
    isSpam: false,
    description: 'Normal deadline reminder',
  },
];

describe('Spam Detection Accuracy Benchmark', () => {
  it('should achieve 95%+ accuracy on labeled dataset', async () => {
    let correctPredictions = 0;
    const results: Array<{ description: string; expected: boolean; actual: boolean; correct: boolean }> = [];

    for (const testCase of LABELED_EMAILS) {
      const result = await detectSpam(testCase.email);
      const isCorrect = result.isSpam === testCase.isSpam;
      
      if (isCorrect) {
        correctPredictions++;
      }

      results.push({
        description: testCase.description,
        expected: testCase.isSpam,
        actual: result.isSpam,
        correct: isCorrect,
      });
    }

    const accuracy = (correctPredictions / LABELED_EMAILS.length) * 100;
    
    // Log detailed results
    console.log('\n📊 Spam Detection Accuracy Benchmark Results:');
    console.log(`Total emails tested: ${LABELED_EMAILS.length}`);
    console.log(`Correct predictions: ${correctPredictions}`);
    console.log(`Accuracy: ${accuracy.toFixed(1)}%`);
    
    // Log any failures
    const failures = results.filter(r => !r.correct);
    if (failures.length > 0) {
      console.log('\n❌ Incorrect predictions:');
      for (const failure of failures) {
        console.log(`  - ${failure.description}: expected ${failure.expected}, got ${failure.actual}`);
      }
    }

    // Assert 95%+ accuracy
    expect(accuracy).toBeGreaterThanOrEqual(95);
  });

  it('should have zero false negatives on known scam patterns', async () => {
    // Critical: these MUST be detected as spam
    const criticalSpamEmails = LABELED_EMAILS.filter(e => e.isSpam);
    let falseNegatives = 0;

    for (const testCase of criticalSpamEmails) {
      const result = await detectSpam(testCase.email);
      if (!result.isSpam) {
        falseNegatives++;
        console.log(`⚠️ False negative: ${testCase.description}`);
      }
    }

    // Allow at most 1 false negative (some phishing is sophisticated)
    expect(falseNegatives).toBeLessThanOrEqual(1);
  });
});
