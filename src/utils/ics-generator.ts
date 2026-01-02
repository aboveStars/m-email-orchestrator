import type { CalendarEvent } from '../types/email.js';

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}@email-orchestrator`;
}

export function generateICS(event: CalendarEvent): string {
  const startDate = new Date(event.date);
  const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);
  const now = new Date();
  
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Email Orchestrator//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${generateUID()}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${escapeICSText(event.title)}`,
  ];
  
  if (event.location) {
    icsLines.push(`LOCATION:${escapeICSText(event.location)}`);
  }
  
  if (event.description) {
    icsLines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }
  
  // Add attendees
  for (const attendee of event.attendees) {
    icsLines.push(`ATTENDEE;RSVP=TRUE:mailto:${attendee}`);
  }
  
  icsLines.push('END:VEVENT');
  icsLines.push('END:VCALENDAR');
  
  return icsLines.join('\r\n');
}
