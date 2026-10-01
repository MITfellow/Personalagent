import { describe, expect, it } from 'vitest';
import {
  HAIR_STYLES,
  MEMOJI,
  MEMOJI_BY_ID,
  SKIN_TONES,
  allMemoji,
  blankMemoji,
  isCustomId,
  memojiRef,
  parseMemoji,
  randomMemoji,
  setCustomMemoji,
} from './memoji';

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

describe('custom characters', () => {
  it('resolves a custom character ahead of the built-in cast', () => {
    const mine = { ...blankMemoji(), id: 'my-abc', name: 'Riya' };
    expect(parseMemoji('memoji:my-abc')).toBeUndefined();
    setCustomMemoji([mine]);
    expect(parseMemoji('memoji:my-abc')).toBe(mine);
    expect(parseMemoji('memoji:ari')?.name).toBe('Ari'); // stock still resolves
    setCustomMemoji([]);
    expect(parseMemoji('memoji:my-abc')).toBeUndefined();
  });

  it('lists mine first, then the stock cast', () => {
    const mine = { ...blankMemoji(), id: 'my-xyz' };
    const list = allMemoji([mine]);
    expect(list[0]).toBe(mine);
    expect(list).toHaveLength(MEMOJI.length + 1);
  });

  it('tells a custom id from a built-in one', () => {
    expect(isCustomId(blankMemoji().id)).toBe(true);
    for (const m of MEMOJI) expect(isCustomId(m.id)).toBe(false);
  });

  it('starts blank characters unique and complete', () => {
    const a = blankMemoji();
    const b = blankMemoji();
    expect(a.id).not.toBe(b.id);
    expect(a.bg).toHaveLength(2);
    expect(a.skin).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('randomises every trait but keeps identity', () => {
    const base = blankMemoji();
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const r = randomMemoji(base);
      expect(r.id).toBe(base.id);
      expect(r.name).toBe(base.name);
      expect(HAIR_STYLES.some((s) => s.id === r.style)).toBe(true);
      expect(SKIN_TONES.some(([skin]) => skin === r.skin)).toBe(true);
      seen.add(`${r.style}|${r.skin}|${r.mouth}`);
    }
    expect(seen.size).toBeGreaterThan(5); // actually shuffling, not stuck
  });
});
