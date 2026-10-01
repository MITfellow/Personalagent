import type { Store } from '../types';
import { buildSeedStore } from '../data/seed';

export const STORAGE_KEY = 'messages.app.state';
export const SCHEMA_VERSION = 3;

interface Envelope {
  version: number;
  savedAt: number;
  state: Store;
}

export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' };

/** `savedAt` of the last envelope this tab wrote, for clobber detection. */
let lastWriteAt = 0;
export const lastWrittenStamp = () => lastWriteAt;

/**
 * True when storage carries a write this tab didn't make — another tab, or a
 * test fixture, got there after us. Callers use it to avoid stamping a stale
 * snapshot over somebody else's newer one.
 */
export function storageChangedElsewhere(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return lastWriteAt !== 0;
    const at = JSON.parse(raw)?.savedAt;
    return typeof at === 'number' && at !== lastWriteAt;
  } catch {
    return false;
  }
}

function isQuotaError(e: unknown) {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22 ||
      e.code === 1014)
  );
}

/** Older payloads are upgraded instead of thrown away. */
function migrate(raw: any): Store | null {
  if (!raw) return null;

  // v1/v2 persisted the bare store under a different key shape
  const state: Store = raw.state ?? raw;
  if (!state || !Array.isArray(state.chats) || !state.contacts) return null;
  if (typeof raw.savedAt === 'number') lastWriteAt = raw.savedAt;

  const seed = buildSeedStore();
  const merged: Store = {
    ...seed,
    ...state,
    settings: { ...seed.settings, ...(state.settings ?? {}) },
    me: { ...seed.me, ...(state.me ?? {}) },
  };

  merged.chats = merged.chats.map((c) => ({
    ...c,
    typing: false, // never restore a stuck indicator
    typingBy: undefined,
    draft: c.draft ?? '',
    unread: Math.max(0, c.unread | 0),
  }));

  merged.messages = (merged.messages ?? []).map((m) => ({
    ...m,
    attachments: m.attachments ?? [],
    reactions: m.reactions ?? [],
    bubbleEffect: m.bubbleEffect ?? 'none',
    screenEffect: m.screenEffect ?? 'none',
    // anything still mid-flight when the tab died is resolved
    status: m.status === 'sending' ? 'sent' : m.status,
  }));

  return merged;
}

export function loadState(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('imessage-clone-v2');
    if (!raw) return buildSeedStore();
    const parsed = JSON.parse(raw);
    const migrated = migrate(parsed);
    return migrated ?? buildSeedStore();
  } catch {
    return buildSeedStore();
  }
}

/** Strips the heaviest payloads (pasted image data URIs) oldest-first. */
function shrink(state: Store): Store {
  let budget = 12;
  const messages = state.messages.map((m) => {
    if (budget <= 0 || !m.attachments.length) return m;
    const attachments = m.attachments.map((a) => {
      if (a.kind === 'image' && a.src?.startsWith('data:') && budget > 0) {
        budget--;
        return { ...a, src: undefined, name: 'Photo (freed to save space)' };
      }
      return a;
    });
    return { ...m, attachments };
  });
  return { ...state, messages };
}

export function saveState(state: Store): SaveResult {
  const write = (s: Store) => {
    const savedAt = Date.now();
    const envelope: Envelope = { version: SCHEMA_VERSION, savedAt, state: s };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    lastWriteAt = savedAt;
  };
  try {
    write(state);
    return { ok: true };
  } catch (e) {
    if (isQuotaError(e)) {
      try {
        write(shrink(state));
        return { ok: false, reason: 'quota' };
      } catch {
        return { ok: false, reason: 'quota' };
      }
    }
    return { ok: false, reason: 'unavailable' };
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('imessage-clone-v2');
    localStorage.removeItem('imessage-clone-v1');
  } catch {
    /* ignore */
  }
}

export function exportState(state: Store) {
  const blob = new Blob([JSON.stringify({ version: SCHEMA_VERSION, state }, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `messages-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function importState(file: File): Promise<Store> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const migrated = migrate(parsed);
  if (!migrated) throw new Error('That file is not a Messages backup.');
  return migrated;
}
