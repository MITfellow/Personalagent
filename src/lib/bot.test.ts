import { describe, expect, it } from 'vitest';
import { composeReply } from './bot';
import type { Contact } from '../types';

const maya: Contact = {
  id: 'c-maya',
  name: 'Maya Rao',
  handle: '+1 (415) 555-0134',
  initials: 'MR',
  color: ['#ff9f0a', '#ff375f'],
  persona: 'partner',
};

describe('composeReply', () => {
  it('always produces at least one turn with text', () => {
    for (let i = 0; i < 200; i++) {
      const turns = composeReply(maya, 'hey what are you up to?', false);
      expect(turns.length).toBeGreaterThan(0);
      for (const t of turns) {
        expect(typeof t.text).toBe('string');
        expect(t.text.length).toBeGreaterThan(0);
        expect(t.authorId).toBe(maya.id);
        expect(t.delay).toBeGreaterThanOrEqual(0);
        expect(t.typingFor).toBeGreaterThan(0);
      }
    }
  });

  it('answers a question-shaped message', () => {
    const turns = composeReply(maya, 'are you free tonight?', false);
    expect(turns[0].text.length).toBeGreaterThan(1);
  });

  it('handles empty input without throwing', () => {
    expect(() => composeReply(maya, '', false)).not.toThrow();
  });

  it('handles very long input', () => {
    expect(() => composeReply(maya, 'a'.repeat(5000), true)).not.toThrow();
  });

  it('works for every persona', () => {
    const personas: Contact['persona'][] = ['friend', 'family', 'work', 'partner', 'business', 'group'];
    for (const persona of personas) {
      const turns = composeReply({ ...maya, persona }, 'thanks!', true);
      expect(turns[0].text).toBeTruthy();
    }
  });
});
