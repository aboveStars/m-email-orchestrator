import { z } from 'zod';

// Email input schema
export const EmailSchema = z.object({
  from: z.string(),
  subject: z.string(),
  body: z.string(),
  attachments: z.array(z.string()).optional().default([]),
  cc: z.array(z.string()).optional().default([]),
  bcc: z.array(z.string()).optional().default([]),
  date: z.string().optional(),
});

// Use z.input for the type so optional fields don't require defaults
export type Email = z.input<typeof EmailSchema>;

// Calendar event structure
export interface CalendarEvent {
  title: string;
  date: string; // ISO 8601 format
  endDate?: string;
  location?: string;
  attendees: string[];
  description?: string;
  icsContent?: string;
}

// Spam detection result
export interface SpamResult {
  score: number; // 0-1, higher = more likely spam
  isSpam: boolean;
  reasons: string[];
  features: {
    senderDomainMismatch: boolean;
    suspiciousLinks: boolean;
    urgencyWords: boolean;
    grammarIssues: boolean;
    knownSpamPatterns: boolean;
  };
}

// Priority levels
export type Priority = 'high' | 'medium' | 'low';

// Orchestration result - the final output
export interface OrchestrationResult {
  summary: string;
  priority: Priority;
  suggested_reply: string | null;
  spam_score: number;
  calendar_event: CalendarEvent | null;
  actions_taken: string[];
  processing_time_ms: number;
  // Multi-language support
  detected_language?: {
    code: string;      // ISO 639-1 (e.g., 'en', 'de', 'fr')
    name: string;      // Full name (e.g., 'English', 'German')
    confidence: number; // 0-1 confidence
  };
}

// Individual agent results
export interface SummarizerResult {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
}

export interface ReplyResult {
  reply: string;
  tone: 'formal' | 'casual' | 'neutral';
}

// API request/response types
export interface ProcessEmailRequest {
  email: Email;
}

export interface ProcessEmailResponse {
  success: boolean;
  orchestration_result?: OrchestrationResult;
  error?: string;
}
