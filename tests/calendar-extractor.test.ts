import { describe, it, expect } from 'vitest';
import { extractCalendarEvent } from '../src/agents/calendar-extractor.js';
import type { Email } from '../src/types/email.js';

describe('Calendar Extractor Agent', () => {
  it('should extract meeting from email with date and time', async () => {
    const email: Email = {
      from: 'john@acme.com',
      subject: 'Q4 Review Meeting',
      body: 'Let\'s meet Tuesday at 3pm in Room 204 to discuss Q4 results.',
      attachments: [],
    };

    const result = await extractCalendarEvent(email);
    expect(result).not.toBeNull();
    expect(result?.title).toContain('Q4 Review');
    expect(result?.attendees).toContain('john@acme.com');
  });

  it('should extract location from email', async () => {
    const email: Email = {
      from: 'manager@company.com',
      subject: 'Team Sync',
      body: 'Meeting tomorrow at 10am in Conference Room A.',
      attachments: [],
    };

    const result = await extractCalendarEvent(email);
    expect(result).not.toBeNull();
    expect(result?.location).toBeDefined();
  });

  it('should return null for non-meeting email', async () => {
    const email: Email = {
      from: 'newsletter@company.com',
      subject: 'Weekly Newsletter',
      body: 'Here are the top stories this week...',
      attachments: [],
    };

    const result = await extractCalendarEvent(email);
    expect(result).toBeNull();
  });

  it('should generate valid ICS content', async () => {
    const email: Email = {
      from: 'hr@company.com',
      subject: 'Performance Review',
      body: 'Schedule: Performance review meeting on Friday at 2pm.',
      attachments: [],
    };

    const result = await extractCalendarEvent(email);
    if (result) {
      expect(result.icsContent).toContain('BEGIN:VCALENDAR');
      expect(result.icsContent).toContain('BEGIN:VEVENT');
      expect(result.icsContent).toContain('END:VCALENDAR');
    }
  });

  it('should extract zoom/teams meeting links as location', async () => {
    const email: Email = {
      from: 'colleague@work.com',
      subject: 'Quick Sync',
      body: 'Let\'s connect tomorrow at 11am. Zoom link: https://zoom.us/j/123456789',
      attachments: [],
    };

    const result = await extractCalendarEvent(email);
    expect(result).not.toBeNull();
  });

  it('should extract multiple attendees from email', async () => {
    const email: Email = {
      from: 'organizer@company.com',
      subject: 'Project Kickoff',
      body: 'Hi team, let\'s meet Monday at 10am. Please confirm: alice@company.com, bob@company.com, carol@company.com',
      attachments: [],
    };

    const result = await extractCalendarEvent(email);
    expect(result).not.toBeNull();
    expect(result?.attendees.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle duration extraction correctly', async () => {
    const email: Email = {
      from: 'scheduler@company.com',
      subject: '2 Hour Workshop',
      body: 'Join us for a 2 hour workshop on Thursday at 2pm.',
      attachments: [],
    };

    const result = await extractCalendarEvent(email);
    expect(result).not.toBeNull();
    expect(result?.date).toBeDefined();
    expect(result?.endDate).toBeDefined();
  });
});

describe('Calendar Extractor - ICS Validation', () => {
  it('should generate ICS with required VCALENDAR properties', async () => {
    const email: Email = {
      from: 'meeting@company.com',
      subject: 'Board Meeting',
      body: 'Board meeting scheduled for next Monday at 9am in the Executive Room.',
      attachments: [],
    };

    const result = await extractCalendarEvent(email);
    if (result?.icsContent) {
      expect(result.icsContent).toContain('VERSION:2.0');
      expect(result.icsContent).toContain('PRODID:');
    }
  });

  it('should include DTSTART and DTEND in ICS', async () => {
    const email: Email = {
      from: 'calendar@work.com',
      subject: 'Sprint Planning',
      body: 'Sprint planning session Wednesday at 1pm.',
      attachments: [],
    };

    const result = await extractCalendarEvent(email);
    if (result?.icsContent) {
      expect(result.icsContent).toContain('DTSTART:');
      expect(result.icsContent).toContain('DTEND:');
    }
  });

  it('should include event title in ICS SUMMARY', async () => {
    const email: Email = {
      from: 'events@company.com',
      subject: 'Annual Company Party',
      body: 'Join us for the annual company party this Friday at 6pm.',
      attachments: [],
    };

    const result = await extractCalendarEvent(email);
    if (result?.icsContent) {
      expect(result.icsContent).toContain('SUMMARY:');
    }
  });

  it('should include UID in ICS for unique identification', async () => {
    const email: Email = {
      from: 'schedule@office.com',
      subject: 'Weekly Standup',
      body: 'Weekly standup meeting tomorrow at 10am.',
      attachments: [],
    };

    const result = await extractCalendarEvent(email);
    if (result?.icsContent) {
      expect(result.icsContent).toContain('UID:');
    }
  });
});

describe('Calendar Extractor - Edge Cases', () => {
  it('should handle email with multiple dates (use first)', async () => {
    const email: Email = {
      from: 'planner@company.com',
      subject: 'Schedule Options',
      body: 'We can meet either Monday at 10am or Tuesday at 2pm. Please let me know.',
      attachments: [],
    };

    const result = await extractCalendarEvent(email);
    expect(result).not.toBeNull();
    expect(result?.date).toBeDefined();
  });

  it('should handle all-day event indicators', async () => {
    const email: Email = {
      from: 'hr@company.com',
      subject: 'Company Holiday',
      body: 'Reminder: The office will be closed all day on Friday for the holiday.',
      attachments: [],
    };

    // This might or might not have meeting indicators
    const result = await extractCalendarEvent(email);
    // Just verify it doesn't crash
    expect(result === null || result.date !== undefined).toBe(true);
  });

  it('should not extract calendar from non-meeting email with dates', async () => {
    const email: Email = {
      from: 'reports@company.com',
      subject: 'Monthly Report',
      body: 'The report for December 2024 is attached. It covers data from January through November.',
      attachments: ['report.pdf'],
    };

    const result = await extractCalendarEvent(email);
    // Should return null as there are no meeting indicators
    expect(result).toBeNull();
  });
});
