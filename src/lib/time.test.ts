import { afterEach, describe, expect, it, vi } from 'vitest';
import { daysApart, listStamp, mmss, needsSeparator, sameGroup, separatorStamp } from './time';

const AT = new Date('2026-03-04T09:41:00').getTime();

afterEach(() => vi.useRealTimers());

function freeze(t: number) {
  vi.useFakeTimers();
  vi.setSystemTime(t);
}

describe('daysApart', () => {
  it('is zero within the same calendar day', () => {
    expect(daysApart(AT, AT + 3 * 3600_000)).toBe(0);
  });
  it('counts calendar days, not 24h blocks', () => {
    const lateNight = new Date('2026-03-04T23:50:00').getTime();
    const afterMidnight = new Date('2026-03-05T00:10:00').getTime();
    expect(daysApart(afterMidnight, lateNight)).toBe(1);
  });
});

describe('listStamp', () => {
  it('shows a clock time for today', () => {
    freeze(AT);
    expect(listStamp(AT)).toMatch(/9:41/);
  });
  it('shows Yesterday for the previous day', () => {
    freeze(AT);
    expect(listStamp(AT - 86_400_000)).toBe('Yesterday');
  });
  it('shows a weekday within the last week', () => {
    freeze(AT);
    expect(listStamp(AT - 3 * 86_400_000)).toMatch(/day$/);
  });
  it('falls back to a numeric date beyond a week', () => {
    freeze(AT);
    expect(listStamp(AT - 30 * 86_400_000)).toMatch(/\d+\/\d+\/\d+/);
  });
});

describe('separatorStamp', () => {
  it('leads with Today', () => {
    freeze(AT);
    expect(separatorStamp(AT).lead).toBe('Today');
  });
});

describe('needsSeparator', () => {
  it('always separates the first message', () => {
    expect(needsSeparator(null, AT)).toBe(true);
  });
  it('does not separate messages minutes apart', () => {
    expect(needsSeparator(AT, AT + 10 * 60_000)).toBe(false);
  });
  it('separates after a long gap', () => {
    expect(needsSeparator(AT, AT + 60 * 60_000)).toBe(true);
  });
  it('separates across a day boundary even if close in time', () => {
    const a = new Date('2026-03-04T23:59:00').getTime();
    expect(needsSeparator(a, a + 2 * 60_000)).toBe(true);
  });
});

describe('sameGroup', () => {
  it('groups the same author within two minutes', () => {
    expect(sameGroup({ authorId: 'me', at: AT }, { authorId: 'me', at: AT + 60_000 })).toBe(true);
  });
  it('splits different authors', () => {
    expect(sameGroup({ authorId: 'me', at: AT }, { authorId: 'c1', at: AT + 1000 })).toBe(false);
  });
  it('splits the same author after two minutes', () => {
    expect(sameGroup({ authorId: 'me', at: AT }, { authorId: 'me', at: AT + 200_000 })).toBe(false);
  });
});

describe('mmss', () => {
  it('pads seconds', () => {
    expect(mmss(65)).toBe('1:05');
    expect(mmss(0)).toBe('0:00');
    expect(mmss(600)).toBe('10:00');
  });
});
