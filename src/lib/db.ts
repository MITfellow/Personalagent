/**
 * A tiny promise wrapper over IndexedDB — no dependency, no abstraction beyond
 * what this app needs: one store, a handful of keys, structured clones.
 *
 * Why not localStorage: it caps at roughly 5MB, is synchronous (so every save
 * blocks the main thread on `JSON.stringify`), and when it fills there is
 * nothing to do but start deleting the user's photos. IndexedDB is async, has
 * orders of magnitude more room, and stores objects directly.
 */

const DB_NAME = 'messages';
const DB_VERSION = 1;
const STORE = 'app';

/** Firefox private mode and some lockdown profiles expose the API but throw. */
export function idbSupported(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('idb request failed'));
  });
}

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (!idbSupported()) {
      reject(new Error('indexeddb unavailable'));
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      reject(e);
      return;
    }

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => {
      const db = req.result;
      // another tab asked for a version bump; let go so it isn't blocked
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error ?? new Error('idb open failed'));
    req.onblocked = () => reject(new Error('idb open blocked'));
  });

  // a failed open should not poison every later attempt
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  const out = await wrap<T | undefined>(tx.objectStore(STORE).get(key) as IDBRequest<T | undefined>);
  return out;
}

export async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    // resolve on commit, not on request success, so callers know it is durable
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('idb write failed'));
    tx.onabort = () => reject(tx.error ?? new Error('idb write aborted'));
  });
}

export async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('idb delete failed'));
  });
}

/** Testing seam: drop the cached connection. */
export function resetDbForTests() {
  dbPromise = null;
}
