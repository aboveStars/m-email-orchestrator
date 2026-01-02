import * as chrono from 'chrono-node';
import type { Email, CalendarEvent } from '../types/email.js';
import { generateICS } from '../utils/ics-generator.js';

// Location patterns
const LOCATION_PATTERNS = [
  /(?:in|at|room|building|office|conference room|meeting room)\s*[:.]?\s*([A-Z0-9][-A-Z0-9a-z\s]+)/gi,
  /(?:location|venue|place)\s*[:.]?\s*([^\n,]+)/gi,
  /(?:zoom|teams|meet)\s*(?:link|url|meeting)?\s*[:.]?\s*(https?:\/\/[^\s]+)/gi,
  /(?:join us at|meet at|gather at)\s+([^\n,]+)/gi,
];

// Duration patterns
const DURATION_PATTERNS = [
  /(\d+)\s*(?:hour|hr)s?/i,
  /(\d+)\s*(?:minute|min)s?/i,
];

// Attendee patterns (email extraction)
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function extractLocation(text: string): string | undefined {
  for (const pattern of LOCATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      // Clean up the location string
      let location = match[1] || match[0];
      location = location.replace(/^(in|at|room|building)\s*/i, '').trim();
      if (location.length > 2 && location.length < 100) {
        return location;
      }
    }
  }
  return undefined;
}

function extractDuration(text: string): number {
  let totalMinutes = 60; // Default 1 hour
  
  for (const pattern of DURATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      if (pattern.source.includes('hour')) {
        totalMinutes = value * 60;
      } else {
        totalMinutes = value;
      }
      break;
    }
  }
  
  return totalMinutes;
}

function extractAttendees(email: Email): string[] {
  const text = `${email.from} ${email.body}`;
  const emails = text.match(EMAIL_REGEX) || [];
  
  // Deduplicate and include sender
  const attendees = new Set<string>();
  
  // Extract sender email
  const senderMatch = email.from.match(EMAIL_REGEX);
  if (senderMatch) {
    attendees.add(senderMatch[0].toLowerCase());
  }
  
  // Add all found emails
  for (const e of emails) {
    attendees.add(e.toLowerCase());
  }
  
  return Array.from(attendees);
}

function hasMeetingIndicators(text: string): boolean {
  const indicators = [
    /\b(?:meeting|meet|call|conference|discussion|review|sync|standup|catchup|catch-up)\b/i,
    /\b(?:let'?s?\s+(?:meet|discuss|talk|connect|sync))\b/i,
    /\b(?:schedule|scheduled|invite|invitation|calendar)\b/i,
    /\b(?:join\s+(?:us|me|the\s+call))\b/i,
    /\b(?:please\s+(?:attend|join|confirm))\b/i,
  ];
  
  return indicators.some(pattern => pattern.test(text));
}

export async function extractCalendarEvent(email: Email): Promise<CalendarEvent | null> {
  const text = `${email.subject} ${email.body}`;
  
  // Check if this looks like a meeting email
  if (!hasMeetingIndicators(text)) {
    return null;
  }
  
  // Parse dates using chrono
  const parsedDates = chrono.parse(text, new Date(), { forwardDate: true });
  
  if (parsedDates.length === 0) {
    return null;
  }
  
  // Get the first (most relevant) date
  const primaryDate = parsedDates[0];
  const startDate = primaryDate.start.date();
  
  // Calculate end date based on duration or second parsed date
  let endDate: Date;
  const durationMinutes = extractDuration(text);
  
  if (parsedDates.length > 1 && primaryDate.end) {
    endDate = primaryDate.end.date();
  } else {
    endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  }
  
  // Extract other details
  const location = extractLocation(text);
  const attendees = extractAttendees(email);
  
  // Generate title from subject or infer from content
  let title = email.subject;
  if (!title || title.toLowerCase().includes('re:') || title.toLowerCase().includes('fwd:')) {
    // Try to extract a better title
    const meetingMatch = text.match(/(?:meeting|call|discussion)\s+(?:about|for|on|regarding)\s+([^\n.,]+)/i);
    if (meetingMatch) {
      title = meetingMatch[1].trim();
    }
  }
  
  const event: CalendarEvent = {
    title: title.replace(/^(?:re:|fwd:)\s*/i, '').trim(),
    date: startDate.toISOString(),
    endDate: endDate.toISOString(),
    location,
    attendees,
    description: `From: ${email.from}\n\n${email.body.substring(0, 500)}`,
  };
  
  // Generate ICS content
  event.icsContent = generateICS(event);
  
  return event;
}

export const calendarExtractorAgent = {
  name: 'Calendar Event Extractor',
  run: extractCalendarEvent,
};
