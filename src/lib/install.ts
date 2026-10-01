/**
 * Installing the app, and keeping its data once installed.
 *
 * Two separate things that both matter for a store-your-files-here app:
 *
 * 1. `beforeinstallprompt` — Chromium fires this once, and the event is the
 *    only way to show the install dialog later. It has to be caught at
 *    startup and stashed, or the chance is gone.
 * 2. Storage persistence — by default a browser may evict IndexedDB under
 *    disk pressure, which for this app means someone's conversations and
 *    files disappear. `navigator.storage.persist()` asks for the data to be
 *    exempt; installed PWAs are usually granted it without a prompt.
 */

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((fn) => fn());

/** Called once from the entry point, before React mounts. */
export function watchInstallability() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    // without this the browser shows its own mini-infobar and never gives us
    // the event again
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export const canInstall = () => deferred !== null;

export function subscribeInstallable(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** True when running as an installed app rather than in a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Shows the real install dialog. Resolves to whether the user accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  // the event is single-use whatever the answer
  deferred = null;
  notify();
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome === 'accepted';
  } catch {
    return false;
  }
}

/* ───────────────────────── storage durability ───────────────────────── */

export interface StorageReport {
  usage: number;
  quota: number;
  persisted: boolean;
  supported: boolean;
}

export async function storageReport(): Promise<StorageReport> {
  const empty: StorageReport = { usage: 0, quota: 0, persisted: false, supported: false };
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return empty;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const persisted = (await navigator.storage.persisted?.()) ?? false;
    return { usage, quota, persisted, supported: true };
  } catch {
    return empty;
  }
}

/** Asks the browser not to evict our data. Safe to call more than once. */
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/* ───────────────────────── opening files from the OS ───────────────── */

type FileConsumer = (files: File[]) => void;

/**
 * When the app is installed it registers as a handler for images, PDFs, audio
 * and video (see the manifest). Double-clicking such a file in Finder or
 * Explorer launches the app with a `launchQueue` payload, which lands in the
 * composer as a staged attachment.
 */
export function consumeLaunchFiles(onFiles: FileConsumer) {
  const queue = (
    window as unknown as {
      launchQueue?: { setConsumer: (cb: (params: { files?: FileSystemHandle[] }) => void) => void };
    }
  ).launchQueue;
  if (!queue?.setConsumer) return;

  queue.setConsumer((params) => {
    void (async () => {
      const handles = params.files ?? [];
      if (!handles.length) return;
      const files: File[] = [];
      for (const handle of handles) {
        const getFile = (handle as unknown as { getFile?: () => Promise<File> }).getFile;
        if (!getFile) continue;
        try {
          files.push(await getFile.call(handle));
        } catch {
          /* the OS withdrew permission; nothing useful to say */
        }
      }
      if (files.length) onFiles(files);
    })();
  });
}
