const MIN = 60_000;
const DAY = 86_400_000;

/**
 * `toLocaleTimeString` builds a fresh Intl formatter on every call, which is
 * one of the most expensive things you can do per render — and this runs once
 * per bubble, per sidebar row, per separator. The formatters are built once,
 * and results are memoised per minute (every message in the same minute shares
 * a string) behind a bounded cache so a long-lived tab can't grow it forever.
 */
const fmt = {
  time: null as Intl.DateTimeFormat | null,
  weekday: null as Intl.DateTimeFormat | null,
  weekdayShort: null as Intl.DateTimeFormat | null,
  numeric: null as Intl.DateTimeFormat | null,
  monthDay: null as Intl.DateTimeFormat | null,
};

const timeFmt = () => (fmt.time ??= new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }));
const weekdayFmt = () => (fmt.weekday ??= new Intl.DateTimeFormat([], { weekday: 'long' }));
const weekdayShortFmt = () =>
  (fmt.weekdayShort ??= new Intl.DateTimeFormat([], { weekday: 'short', month: 'short', day: 'numeric' }));
const numericFmt = () =>
  (fmt.numeric ??= new Intl.DateTimeFormat([], { month: 'numeric', day: 'numeric', year: '2-digit' }));

const CACHE_MAX = 600;
const timeCache = new Map<number, string>();

function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function daysApart(a: number, b: number) {
  return Math.round((startOfDay(a) - startOfDay(b)) / DAY);
}

export function timeOfDay(t: number) {
  const key = t - (t % MIN);
  const hit = timeCache.get(key);
  if (hit !== undefined) return hit;
  const out = timeFmt().format(key).replace(/\u202f/g, ' ');
  if (timeCache.size >= CACHE_MAX) timeCache.clear();
  timeCache.set(key, out);
  return out;
}

/** Sidebar timestamp: 9:41 AM · Yesterday · Tuesday · 12/04/25 */
export function listStamp(t: number) {
  const d = daysApart(Date.now(), t);
  if (d === 0) return timeOfDay(t);
  if (d === 1) return 'Yesterday';
  if (d < 7) return weekdayFmt().format(t);
  return numericFmt().format(t);
}

/** In-thread separator: "Today 9:41 AM", "Yesterday 7:12 PM", "Tue, Mar 4 at 8:03 AM" */
export function separatorStamp(t: number) {
  const d = daysApart(Date.now(), t);
  const time = timeOfDay(t);
  if (d === 0) return { lead: 'Today', time };
  if (d === 1) return { lead: 'Yesterday', time };
  if (d < 7) return { lead: weekdayFmt().format(t), time };
  const date = weekdayShortFmt().format(t);
  return { lead: date, time };
}

/** should a new separator be printed between two messages? */
export function needsSeparator(prev: number | null, cur: number) {
  if (prev == null) return true;
  if (daysApart(cur, prev) !== 0) return true;
  return cur - prev > 55 * MIN;
}

/** group consecutive messages from the same author within 2 minutes */
export function sameGroup(a: { authorId: string; at: number }, b: { authorId: string; at: number }) {
  return a.authorId === b.authorId && Math.abs(b.at - a.at) < 2 * MIN;
}

export function mmss(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
