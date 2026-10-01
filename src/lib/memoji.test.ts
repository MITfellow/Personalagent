import { describe, expect, it } from 'vitest';
import { MEMOJI, MEMOJI_BY_ID, memojiRef, parseMemoji } from './memoji';

describe('memoji', () => {
  it('ships a full picker grid with unique ids and names', () => {
    expect(MEMOJI.length).toBeGreaterThanOrEqual(12);
    expect(new Set(MEMOJI.map((m) => m.id)).size).toBe(MEMOJI.length);
    expect(new Set(MEMOJI.map((m) => m.name)).size).toBe(MEMOJI.length);
    for (const m of MEMOJI) expect(MEMOJI_BY_ID.get(m.id)).toBe(m);
  });

  it('round-trips a ref through parse', () => {
    for (const m of MEMOJI) expect(parseMemoji(memojiRef(m.id))).toBe(m);
  });

  it('ignores non-memoji avatars', () => {
    expect(parseMemoji(undefined)).toBeUndefined();
    expect(parseMemoji('')).toBeUndefined();
    expect(parseMemoji('https://example.com/a.png')).toBeUndefined();
    expect(parseMemoji('data:image/png;base64,AAAA')).toBeUndefined();
    expect(parseMemoji('memoji:does-not-exist')).toBeUndefined();
  });

  it('gives every character two gradient stops and a face', () => {
    for (const m of MEMOJI) {
      expect(m.bg).toHaveLength(2);
      for (const c of m.bg) expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(m.skin).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(m.shade).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
