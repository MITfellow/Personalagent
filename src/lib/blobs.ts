import { useEffect, useMemo } from 'react';
import type { Attachment } from '../types';

/**
 * Attachment bytes.
 *
 * Files are kept as `Blob`s on the attachment and written straight into
 * IndexedDB, which stores them as a structured clone — binary, not base64. A
 * 40 MB video costs 40 MB instead of the ~53 MB a data URL would, and nothing
 * has to be stringified on the way in or out.
 *
 * Blobs cannot be put on an `<img src>` directly, so rendering goes through
 * object URLs. Those are a manual-memory API: every `createObjectURL` holds
 * its blob in memory until it is revoked, so each one here is owned by the
 * hook that made it and released on unmount.
 */

/** Object URL for an attachment, revoked when the component goes away. */
export function useAttachmentUrl(att: Attachment | undefined | null): string | undefined {
  const blob = att?.blob;
  const src = att?.src;

  // Creating the URL in a memo (rather than in an effect) means the very first
  // paint already has a src, so a video or image does not flash empty. The
  // effect below owns releasing it.
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : undefined), [blob]);

  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return blob ? url : src;
}

/** Saves an attachment to disk under its original name. */
export function downloadAttachment(att: Attachment) {
  const url = att.blob ? URL.createObjectURL(att.blob) : att.src;
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = att.name || 'download';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // the anchor has already started the download; the URL can go
  if (att.blob) setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Opens an attachment in a new tab (PDFs, text, anything the browser renders). */
export function openAttachment(att: Attachment) {
  const url = att.blob ? URL.createObjectURL(att.blob) : att.src;
  if (!url) return;
  window.open(url, '_blank', 'noopener');
  if (att.blob) setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('read failed'));
    r.readAsDataURL(blob);
  });

/** Parses `data:<mime>;base64,<payload>` back into bytes. */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) return null;
  const [, mime, isB64, payload] = match;
  try {
    if (isB64) {
      const bin = atob(payload);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes], { type: mime || 'application/octet-stream' });
    }
    return new Blob([decodeURIComponent(payload)], { type: mime || 'text/plain' });
  } catch {
    return null;
  }
}

/**
 * JSON cannot hold a Blob — `JSON.stringify(blob)` quietly produces `{}`.
 * Backups and the localStorage fallback both go through JSON, so blobs are
 * converted to data URLs on the way out.
 */
export async function inlineBlobs<T extends { messages: { attachments: Attachment[] }[] }>(
  state: T,
): Promise<T> {
  const messages = await Promise.all(
    state.messages.map(async (m) => {
      if (!m.attachments.some((a) => a.blob)) return m;
      const attachments = await Promise.all(
        m.attachments.map(async (a) => {
          if (!a.blob) return a;
          const { blob, ...rest } = a;
          return { ...rest, src: await blobToDataUrl(blob) };
        }),
      );
      return { ...m, attachments };
    }),
  );
  return { ...state, messages };
}

/** The inverse, used when a backup is imported. */
export function restoreBlobs<T extends { messages: { attachments: Attachment[] }[] }>(state: T): T {
  const messages = state.messages.map((m) => {
    if (!m.attachments.some((a) => a.src?.startsWith('data:') && a.kind !== 'image')) return m;
    const attachments = m.attachments.map((a) => {
      // images keep their data URL: it doubles as the inline preview
      if (a.kind === 'image' || !a.src?.startsWith('data:')) return a;
      const blob = dataUrlToBlob(a.src);
      return blob ? { ...a, blob, src: undefined } : a;
    });
    return { ...m, attachments };
  });
  return { ...state, messages };
}

/** Rough byte count of everything stored, for the storage panel. */
export function attachmentBytes(messages: { attachments: Attachment[] }[]): number {
  let total = 0;
  for (const m of messages) {
    for (const a of m.attachments) {
      if (a.blob) total += a.blob.size;
      else if (a.src?.startsWith('data:')) total += Math.round(a.src.length * 0.75);
    }
  }
  return total;
}
