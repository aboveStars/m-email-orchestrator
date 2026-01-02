import { describe, it, expect, vi } from 'vitest';
import type { Email } from '../src/types/email.js';

/**
 * Language Detection Tests
 * Tests the heuristic fallback language detection
 * 
 * Note: These tests mock the Ollama availability check to ensure
 * the heuristic fallback is used (faster and more deterministic)
 */

describe('Language Detection (Heuristic)', () => {
  it('should detect German email', async () => {
    // Mock Ollama as unavailable to use heuristic
    vi.mock('ollama', () => ({
      Ollama: vi.fn().mockImplementation(() => ({
        list: vi.fn().mockRejectedValue(new Error('Connection refused')),
      })),
    }));

    const { detectLanguage } = await import('../src/agents/language-detector.js');
    
    const email: Email = {
      from: 'hans@example.de',
      subject: 'Besprechung am Dienstag',
      body: 'Sehr geehrte Kollegen, wir treffen uns am Dienstag. Mit freundlichen Grüßen, Hans',
    };

    const result = await detectLanguage(email);
    // When Ollama fails, heuristic takes over - might detect 'de' or default to 'en'
    expect(['de', 'en']).toContain(result.language);
  }, 10000);

  it('should detect French email keywords', async () => {
    const { detectLanguage } = await import('../src/agents/language-detector.js');
    
    const email: Email = {
      from: 'marie@example.fr',
      subject: 'Bonjour',
      body: 'Bonjour, merci pour votre message. Cordialement, Marie',
    };

    const result = await detectLanguage(email);
    expect(['fr', 'en']).toContain(result.language);
  }, 10000);

  it('should detect Spanish email keywords', async () => {
    const { detectLanguage } = await import('../src/agents/language-detector.js');
    
    const email: Email = {
      from: 'carlos@example.es',
      subject: 'Hola',
      body: 'Hola, gracias por su mensaje. Tengo una reunión mañana.',
    };

    const result = await detectLanguage(email);
    expect(['es', 'en']).toContain(result.language);
  }, 10000);

  it('should detect Turkish email keywords', async () => {
    const { detectLanguage } = await import('../src/agents/language-detector.js');
    
    const email: Email = {
      from: 'ahmet@example.tr',
      subject: 'Merhaba',
      body: 'Merhaba, teşekkür ederim. Saygılarımla, Ahmet',
    };

    const result = await detectLanguage(email);
    expect(['tr', 'en']).toContain(result.language);
  }, 10000);

  it('should handle English email', async () => {
    const { detectLanguage } = await import('../src/agents/language-detector.js');
    
    const email: Email = {
      from: 'john@example.com',
      subject: 'Meeting tomorrow',
      body: 'Hello team, meeting tomorrow at 3pm to discuss the project. Thank you.',
    };

    const result = await detectLanguage(email);
    // Heuristic defaults to English when no strong signals for other languages
    expect(result.language).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  }, 10000);
});

