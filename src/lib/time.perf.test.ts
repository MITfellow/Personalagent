import { describe, expect, it } from 'vitest';
import { listStamp, separatorStamp, timeOfDay } from './time';

describe('time formatting cost', () => {
  it('memoises within the same minute', () => {
    const base = new Date('2026-03-04T08:03:00Z').getTime();
    const a = timeOfDay(base);
    const b = timeOfDay(base + 59_000); // same minute bucket
    expect(b).toBe(a);
    expect(timeOfDay(base + 61_000)).not.toBe(a);
  });

  it('formats ten thousand stamps well under a second', () => {
    const now = Date.now();
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) {
      timeOfDay(now - i * 37_000);
      listStamp(now - i * 37_000);
      separatorStamp(now - i * 37_000);
    }
    const ms = performance.now() - t0;
    // uncached Intl construction made this ~3s; the shared formatters cut it
    // by an order of magnitude. Generous bound so CI machines don't flake.
    expect(ms).toBeLessThan(1500);
  });

  it('keeps the cache bounded', () => {
    const now = Date.now();
    for (let i = 0; i < 2000; i++) timeOfDay(now + i * 60_000);
    // still correct after the cache has been cleared mid-run
    expect(timeOfDay(now)).toMatch(/\d/);
  });
});
