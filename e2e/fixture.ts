import type { Page } from '@playwright/test';
import { buildDemoStore } from '../src/test/demo-world';

const STORAGE_KEY = 'veo.app.state';
const SCHEMA_VERSION = 3;

const DB_NAME = 'veo';
const STORE = 'app';
const STATE_KEY = 'state';

/**
 * Specs used to reach into `localStorage` directly. State now lives in
 * IndexedDB, so every page gets a small bridge — `window.__store` — that reads
 * and writes the real envelope wherever it actually is.
 */
export async function installStoreBridge(page: Page) {
  await page.addInitScript(
    ([dbName, storeName, stateKey, lsKey]) => {
      const open = () =>
        new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open(dbName as string, 1);
          req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(storeName as string)) {
              req.result.createObjectStore(storeName as string);
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

      type Env = { version: number; savedAt: number; state: Record<string, unknown> };

      const read = async (): Promise<Env | null> => {
        const db = await open();
        const fromIdb = await new Promise<Env | null>((resolve) => {
          const tx = db.transaction(storeName as string, 'readonly');
          const req = tx.objectStore(storeName as string).get(stateKey as string);
          req.onsuccess = () => resolve((req.result as Env) ?? null);
          req.onerror = () => resolve(null);
        });
        db.close();
        if (fromIdb) return fromIdb;
        const raw = localStorage.getItem(lsKey as string);
        return raw ? (JSON.parse(raw) as Env) : null;
      };

      const write = async (env: Env) => {
        env.savedAt = Date.now();
        const db = await open();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeName as string, 'readwrite');
          tx.objectStore(storeName as string).put(env, stateKey as string);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();
        // the app prefers whichever copy is newer; drop the legacy one so it
        // cannot win against what the test just wrote
        localStorage.removeItem(lsKey as string);
      };

      (window as unknown as { __store: unknown }).__store = { read, write };
    },
    [DB_NAME, STORE, STATE_KEY, STORAGE_KEY],
  );
}

/**
 * The app ships with no conversations, so specs that exercise history put the
 * demo world into storage before the first paint. `sessionStorage` keeps it
 * from being re-seeded on an in-test reload.
 */
export async function seedDemoWorld(page: Page) {
  await installStoreBridge(page);
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
  await installStoreBridge(page);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-fresh')) {
      localStorage.clear();
      sessionStorage.setItem('e2e-fresh', '1');
    }
  });
}
