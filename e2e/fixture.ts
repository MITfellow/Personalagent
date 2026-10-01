import type { Page } from '@playwright/test';
import { buildDemoStore } from '../src/test/demo-world';

const STORAGE_KEY = 'messages.app.state';
const SCHEMA_VERSION = 3;

/**
 * The app ships with no conversations, so specs that exercise history put the
 * demo world into storage before the first paint. `sessionStorage` keeps it
 * from being re-seeded on an in-test reload.
 */
export async function seedDemoWorld(page: Page) {
  const envelope = JSON.stringify({
    version: SCHEMA_VERSION,
    savedAt: Date.now(),
    state: buildDemoStore(),
  });
  await page.addInitScript(
    ([key, payload]) => {
      if (!sessionStorage.getItem('e2e-seeded')) {
        localStorage.clear();
        localStorage.setItem(key as string, payload as string);
        sessionStorage.setItem('e2e-seeded', '1');
      }
    },
    [STORAGE_KEY, envelope],
  );
}

/** A pristine install: nothing in storage at all. */
export async function startFresh(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-fresh')) {
      localStorage.clear();
      sessionStorage.setItem('e2e-fresh', '1');
    }
  });
}
