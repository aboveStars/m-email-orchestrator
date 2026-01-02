import type { Email, SpamResult } from '../types/email.js';

// Weights for spam scoring
const WEIGHTS = {
  senderDomainMismatch: 0.30,
  suspiciousLinks: 0.25,
  urgencyWords: 0.20,
  grammarIssues: 0.10,
  knownSpamPatterns: 0.35, // Increased: pattern matches are strong signals
};

// Urgency words commonly used in phishing/spam
const URGENCY_WORDS = [
  'urgent', 'immediately', 'act now', 'action required',
  'verify your account', 'confirm your identity', 'suspended',
  'limited time', 'expires', 'within 24 hours', 'within 48 hours',
  'click here immediately', 'respond immediately', 'don\'t delay',
  'final notice', 'last chance', 'account will be closed',
  'verify now', 'confirm now', 'update now',
  // Scam urgency - lottery/reward patterns
  'you have won', 'been selected', 'claim your',
  'send your bank', 'bank details', 'winner'
];

// Known spam/phishing patterns
const SPAM_PATTERNS = [
  /congratulations.*won/i,
  /you('ve| have) been selected/i,
  /claim your (prize|reward|money)/i,
  /nigerian prince/i,
  /wire transfer/i,
  /inheritance.*million/i,
  /lottery winner/i,
  /click (here|below) to (verify|confirm|update)/i,
  /your account (has been|will be) (suspended|terminated|closed)/i,
  /password.*expired/i,
  /unusual activity.*account/i,
  /we detected.*suspicious/i,
  /dear (valued )?customer/i,
  /dear (sir|madam|user)/i,
  // Additional patterns for better detection
  /you have won/i,
  /claim your prize/i,
  /send(ing)? your bank details/i,
  /lottery/i,
  /million (dollars|usd|\$)/i,
  /prince/i,
  /don'?t delay/i,
  /account will be closed/i,
];

// Suspicious URL patterns
const SUSPICIOUS_URL_PATTERNS = [
  /bit\.ly/i,
  /tinyurl\.com/i,
  /goo\.gl/i,
  /t\.co/i,
  /ow\.ly/i,
  /is\.gd/i,
  /buff\.ly/i,
  /adf\.ly/i,
  /tiny\.cc/i,
  // IP-based URLs
  /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i,
  // Misspelled domains
  /paypa[l1].*\.com/i,
  /amaz[o0]n.*\.com/i,
  /g[o0][o0]gle.*\.com/i,
  /micr[o0]s[o0]ft.*\.com/i,
  /app[l1]e.*\.com/i,
];

// Grammar issues common in spam
const GRAMMAR_ISSUES = [
  /\b(kindly|please kindly)\b/i,
  /\b(revert back|reply back)\b/i,
  /\b(do the needful)\b/i,
  /\b(your good self)\b/i,
  /\$\s*\d+.*\s*(USD|dollars)/i,
];

function extractSenderDomain(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+)/);
  return match ? match[1].toLowerCase() : null;
}

function extractDisplayName(from: string): string | null {
  // Handle formats like "John Doe <john@example.com>"
  const match = from.match(/^([^<]+)</);
  return match ? match[1].trim().toLowerCase() : null;
}

function checkSenderDomainMismatch(email: Email): boolean {
  const domain = extractSenderDomain(email.from);
  const displayName = extractDisplayName(email.from);
  
  if (!domain || !displayName) return false;
  
  // Check if display name contains a different domain
  const domainInName = displayName.match(/([a-zA-Z0-9]+)\.(com|org|net|io)/);
  if (domainInName && !domain.includes(domainInName[1])) {
    return true;
  }
  
  // Check for known brand impersonation
  const brands = ['paypal', 'amazon', 'google', 'microsoft', 'apple', 'netflix', 'bank'];
  for (const brand of brands) {
    if (displayName.includes(brand) && !domain.includes(brand)) {
      return true;
    }
  }
  
  return false;
}

function checkSuspiciousLinks(email: Email): { found: boolean; links: string[] } {
  const text = `${email.subject} ${email.body}`;
  const suspiciousLinks: string[] = [];
  
  // Find all URLs
  const urlRegex = /https?:\/\/[^\s<>"]+/gi;
  const urls = text.match(urlRegex) || [];
  
  for (const url of urls) {
    for (const pattern of SUSPICIOUS_URL_PATTERNS) {
      if (pattern.test(url)) {
        suspiciousLinks.push(url);
        break;
      }
    }
  }
  
  return { found: suspiciousLinks.length > 0, links: suspiciousLinks };
}

function checkUrgencyWords(email: Email): { found: boolean; words: string[] } {
  const text = `${email.subject} ${email.body}`.toLowerCase();
  const foundWords: string[] = [];
  
  for (const word of URGENCY_WORDS) {
    if (text.includes(word.toLowerCase())) {
      foundWords.push(word);
    }
  }
  
  return { found: foundWords.length > 0, words: foundWords };
}

function checkGrammarIssues(email: Email): boolean {
  const text = `${email.subject} ${email.body}`;
  
  for (const pattern of GRAMMAR_ISSUES) {
    if (pattern.test(text)) {
      return true;
    }
  }
  
  return false;
}

function checkKnownSpamPatterns(email: Email): { found: boolean; patterns: string[] } {
  const text = `${email.subject} ${email.body}`;
  const matchedPatterns: string[] = [];
  
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      matchedPatterns.push(pattern.source);
    }
  }
  
  return { found: matchedPatterns.length > 0, patterns: matchedPatterns };
}

export async function detectSpam(email: Email): Promise<SpamResult> {
  const features = {
    senderDomainMismatch: checkSenderDomainMismatch(email),
    suspiciousLinks: checkSuspiciousLinks(email).found,
    urgencyWords: checkUrgencyWords(email).found,
    grammarIssues: checkGrammarIssues(email),
    knownSpamPatterns: checkKnownSpamPatterns(email).found,
  };
  
  // Calculate weighted score
  let score = 0;
  const reasons: string[] = [];
  
  if (features.senderDomainMismatch) {
    score += WEIGHTS.senderDomainMismatch;
    reasons.push('Sender domain mismatch detected');
  }
  
  if (features.suspiciousLinks) {
    score += WEIGHTS.suspiciousLinks;
    const links = checkSuspiciousLinks(email).links;
    reasons.push(`Suspicious links found: ${links.slice(0, 2).join(', ')}`);
  }
  
  if (features.urgencyWords) {
    score += WEIGHTS.urgencyWords;
    const words = checkUrgencyWords(email).words;
    reasons.push(`Urgency language detected: ${words.slice(0, 3).join(', ')}`);
  }
  
  if (features.grammarIssues) {
    score += WEIGHTS.grammarIssues;
    reasons.push('Common spam grammar patterns detected');
  }
  
  if (features.knownSpamPatterns) {
    score += WEIGHTS.knownSpamPatterns;
    reasons.push('Known spam/phishing patterns detected');
  }
  
  return {
    score: Math.min(score, 1), // Cap at 1
    isSpam: score >= 0.5,
    reasons,
    features,
  };
}

export const spamDetectorAgent = {
  name: 'Spam/Phishing Detector',
  run: detectSpam,
};
