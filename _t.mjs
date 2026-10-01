import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1180, height: 760 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => { if(!/WebSocket/.test(e.message)) errs.push(e.message); });
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
// seed the demo world through the app's own import path: write storage then reload
await p.evaluate(() => localStorage.clear());
await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
// create photos by sending them? simpler: use the demo fixture via module import in the page
await p.addScriptTag({ type: 'module', content: `
  const { buildDemoStore } = await import('/src/test/demo-world.ts');
  localStorage.setItem('messages.app.state', JSON.stringify({ version: 3, savedAt: Date.now(), state: buildDemoStore() }));
  window.__seeded = true;
`});
await p.waitForFunction(() => window.__seeded === true, null, { timeout: 10000 });
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(900);
const img = p.locator('.bubble img').first();
console.log('thread photos:', await p.locator('.bubble img').count());
await img.click();
await p.waitForTimeout(500);
console.log('lightbox:', await p.locator('.lightbox').count(), '| counter:', await p.locator('.lb-count').innerText().catch(()=>'(single)'));
await p.screenshot({ path: '/tmp/i_lightbox.png' });
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400);
console.log('after →:', await p.locator('.lb-count').innerText().catch(()=>'(single)'));
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
console.log('closed:', (await p.locator('.lightbox').count()) === 0, 'errors:', errs);
await b.close();
