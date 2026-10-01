import { describe, expect, it } from 'vitest';
import { colorFor, initialsFor, isAddressable, looksLikeEmail, looksLikePhone, makeContact } from './contacts';

describe('contacts', () => {
  it('derives initials from one or many words', () => {
    expect(initialsFor('Maya Fernandez')).toBe('MF');
    expect(initialsFor('Mom')).toBe('MO');
    expect(initialsFor('  ada  byron  lovelace ')).toBe('AL');
    expect(initialsFor('')).toBe('#');
  });

  it('gives the same name the same colour every time, and spreads names out', () => {
    expect(colorFor('Dev Sharma')).toEqual(colorFor('Dev Sharma'));
    const names = ['Ada', 'Grace', 'Alan', 'Katherine', 'Edsger', 'Barbara', 'Linus', 'Margaret'];
    const distinct = new Set(names.map((n) => colorFor(n).join()));
    // 8 names over an 8-colour palette: collisions are fine, a single bucket is not
    expect(distinct.size).toBeGreaterThan(3);
  });

  it('recognises phone numbers and emails', () => {
    expect(looksLikePhone('+1 (415) 555-0132')).toBe(true);
    expect(looksLikePhone('555')).toBe(false);
    expect(looksLikePhone('hello there')).toBe(false);
    expect(looksLikeEmail('a@b.co')).toBe(true);
    expect(looksLikeEmail('a@b')).toBe(false);
    expect(isAddressable('+919920041188')).toBe(true);
    expect(isAddressable('nobody')).toBe(false);
  });

  it('builds a usable contact from just a handle', () => {
    const c = makeContact({ handle: '+1 (628) 555-0114' });
    expect(c.name).toBe('+1 (628) 555-0114');
    expect(c.initials).toBe('#');
    expect(c.id.startsWith('ct-')).toBe(true);
    expect(c.color).toHaveLength(2);
  });

  it('uses a provided name for initials', () => {
    expect(makeContact({ name: 'Ada Lovelace', handle: 'ada@maths.org' }).initials).toBe('AL');
  });
});
