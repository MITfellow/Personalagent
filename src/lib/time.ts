const MIN = 60_000;
const DAY = 86_400_000;

function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function daysApart(a: number, b: number) {
  return Math.round((startOfDay(a) - startOfDay(b)) / DAY);
}

export function timeOfDay(t: number) {
  return new Date(t)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    .replace(/\u202f/g, ' ');
}

/** Sidebar timestamp: 9:41 AM · Yesterday · Tuesday · 12/04/25 */
export function listStamp(t: number) {
  const d = daysApart(Date.now(), t);
  if (d === 0) return timeOfDay(t);
  if (d === 1) return 'Yesterday';
  if (d < 7) return new Date(t).toLocaleDateString([], { weekday: 'long' });
  return new Date(t).toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' });
}

/** In-thread separator: "Today 9:41 AM", "Yesterday 7:12 PM", "Tue, Mar 4 at 8:03 AM" */
export function separatorStamp(t: number) {
  const d = daysApart(Date.now(), t);
  const time = timeOfDay(t);
  if (d === 0) return { lead: 'Today', time };
  if (d === 1) return { lead: 'Yesterday', time };
  if (d < 7) return { lead: new Date(t).toLocaleDateString([], { weekday: 'long' }), time };
  const date = new Date(t).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
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
