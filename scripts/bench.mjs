/**
 * Performance harness. Seeds a deliberately large account (40 threads / 6,000
 * messages by default) then measures what makes a messaging app feel slow:
 * keystroke-to-paint, thread switching, search, and main-thread long tasks.
 *
 *   node scripts/bench.mjs                      # against the dev server
 *   node scripts/bench.mjs <url> <chats> <perChat>   # e.g. 100 300 = 30k msgs
 *   npm run build && npx vite preview --port 4173
 *   node scripts/bench.mjs http://localhost:4173
 *
 * Dev-server numbers include StrictMode double-rendering and the JSX dev
 * runtime, so they run roughly 2x worse than the build a user gets. Compare
 * like with like.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const URL = process.argv[2] ?? 'http://localhost:5173';
const CHATS = Number(process.argv[3] ?? 40), PER = Number(process.argv[4] ?? 150);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(String(e)));

// The store generator is TypeScript, and a production preview only serves the
// built bundle — so bundle it here and hand the page plain JS. That keeps one
// copy of the generator for both the dev and preview targets.
const bundled = await esbuild.build({
  entryPoints: [path.join(root, 'src/test/stress.ts')],
  bundle: true,
  format: 'iife',
  globalName: 'Stress',
  write: false,
  logLevel: 'silent',
});
const generator = bundled.outputFiles[0].text;

// build the payload in a throwaway page, then inject it before the app boots
await p.goto(URL, { waitUntil: 'networkidle' });
const seed = await p.evaluate(
  ([c, n, src]) => {
    // eslint-disable-next-line no-new-func
    const s = new Function(`${src}; return Stress.buildStressStore(${c}, ${n});`)();
    return { payload: JSON.stringify({ version: 3, savedAt: Date.now(), state: s }), count: s.messages.length };
  },
  [CHATS, PER, generator],
);
const total = seed.count;
console.log(`seeding ${total} messages (${(seed.payload.length / 1048576).toFixed(2)} MB)`);
// The account lives in IndexedDB now, which is also the only way to seed a
// payload past the ~5 MB localStorage ceiling. Write it from a plain asset on
// the same origin rather than from the app: a booted app saves its own (empty)
// store a moment later and would race the seed straight back out.
await p.goto(`${URL.replace(/\/$/, '')}/robots.txt`, { waitUntil: 'load' });
await p.evaluate(async (payload) => {
  const env = JSON.parse(payload);
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('messages', 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains('app')) r.result.createObjectStore('app');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  await new Promise((res, rej) => {
    const tx = db.transaction('app', 'readwrite');
    tx.objectStore('app').put(env, 'state');
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
  db.close();
  localStorage.removeItem('messages.app.state');
}, seed.payload);

// ---- cold load ----
const t0 = Date.now();
await p.goto(URL, { waitUntil: 'load' });
await p.locator('.bubble').first().waitFor();
const load = Date.now() - t0;
await p.waitForTimeout(1500);

const bubbles = await p.locator('.bubble').count();

// ---- long-task observer ----
await p.evaluate(() => {
  window.__tasks = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__tasks.push(e.duration); })
    .observe({ entryTypes: ['longtask'] });
});

// ---- typing latency ----
const ta = p.locator('.field textarea');
await ta.click();
const keys = 'the quick brown fox jumps over'.split('');
const lat = [];
for (const k of keys) {
  // measure inside the page: keystroke -> next paint, one frame only
  const d = await p.evaluate((ch) => {
    const el = document.querySelector('.field textarea');
    const t0 = performance.now();
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, el.value + ch);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise((res) => requestAnimationFrame(() => res(performance.now() - t0)));
  }, k);
  lat.push(d);
}
lat.sort((a,b)=>a-b);
const p50 = lat[Math.floor(lat.length*0.5)], p95 = lat[Math.floor(lat.length*0.95)];

// ---- chat switching ----
const sw = [];
for (let i = 1; i <= 6; i++) {
  const s = Date.now();
  await p.locator('.conv-row, .pinned-item').nth(i).click();
  await p.locator('.bubble').first().waitFor();
  await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  sw.push(Date.now() - s);
}

// ---- search ----
// time from the search keystroke to the results being painted
const search = await p.evaluate(() => {
  const el = document.querySelector('.sidebar input[type=search], .sidebar input');
  const t0 = performance.now();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(el, 'dinner');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return new Promise((res) => requestAnimationFrame(() => res(+(performance.now() - t0).toFixed(1))));
});
await p.waitForTimeout(500);

const tasks = await p.evaluate(() => window.__tasks);
const over50 = tasks.filter(t => t > 50).length;
const worst = Math.max(0, ...tasks);

console.log(JSON.stringify({
  messages: total, bubblesRendered: bubbles, loadMs: load,
  typeP50: +p50.toFixed(1), typeP95: +p95.toFixed(1),
  switchAvg: +(sw.reduce((a,c)=>a+c,0)/sw.length).toFixed(0), switchMax: Math.max(...sw),
  searchMs: search, longTasks: tasks.length, longTasksOver50: over50, worstTaskMs: +worst.toFixed(0),
  errors: errs.filter(e=>!e.includes('WebSocket')).length,
}, null, 2));
await b.close();
