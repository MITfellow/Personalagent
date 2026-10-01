/**
 * Attachment plumbing: naming, sizing, type sniffing and image downscaling.
 *
 * Everything the app stores lives in localStorage, so a handful of phone
 * photos at full resolution would blow the quota on the first send. Images are
 * re-encoded to a sane edge length before they ever reach the store.
 */

/** hard caps, surfaced in the UI rather than failing silently */
export const MAX_FILES = 10;
export const MAX_BYTES = 8 * 1024 * 1024;
export const MAX_EDGE = 1600;
export const JPEG_QUALITY = 0.82;

export function humanSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export function extOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return '';
  return base.slice(dot + 1).toLowerCase();
}

/** shorten the middle, never the extension: "quarterly-report-final.pdf" */
export function shortName(name: string, max = 22): string {
  if (name.length <= max) return name;
  const ext = extOf(name);
  const stem = ext ? name.slice(0, -(ext.length + 1)) : name;
  const keep = Math.max(4, max - ext.length - 4);
  const head = Math.ceil(keep * 0.6);
  const tail = Math.floor(keep * 0.4);
  return `${stem.slice(0, head)}…${stem.slice(-tail)}${ext ? `.${ext}` : ''}`;
}

const TINTS: Record<string, string> = {
  pdf: '#FF453A',
  doc: '#2F7FD6',
  docx: '#2F7FD6',
  pages: '#2F7FD6',
  xls: '#30A14E',
  xlsx: '#30A14E',
  csv: '#30A14E',
  numbers: '#30A14E',
  ppt: '#FF9F0A',
  pptx: '#FF9F0A',
  key: '#FF9F0A',
  zip: '#8E8E93',
  rar: '#8E8E93',
  gz: '#8E8E93',
  mp3: '#FF375F',
  wav: '#FF375F',
  m4a: '#FF375F',
  mp4: '#BF5AF2',
  mov: '#BF5AF2',
  txt: '#636366',
  md: '#636366',
  json: '#FFD60A',
  js: '#FFD60A',
  ts: '#2F7FD6',
};

/** the colour of the little type badge */
export function fileTint(name: string): string {
  return TINTS[extOf(name)] ?? '#8E8E93';
}

/** what the badge says: "PDF", "DOCX", or "FILE" when there's no extension */
export function typeLabel(name: string): string {
  const ext = extOf(name);
  return ext ? ext.toUpperCase().slice(0, 4) : 'FILE';
}

export const isImageFile = (type: string, name = '') =>
  type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'heic'].includes(extOf(name));

/** why a file was rejected, or null when it's fine */
export function rejectReason(file: { size: number; name: string }): string | null {
  if (file.size === 0) return 'This file is empty';
  if (file.size > MAX_BYTES) return `Too large — ${humanSize(file.size)}, limit is ${humanSize(MAX_BYTES)}`;
  return null;
}

/** two files are "the same" for de-duping if the name and byte count match */
export const fileKey = (f: { name: string; size: number }) => `${f.name}:${f.size}`;

export interface DecodedImage {
  src: string;
  width: number;
  height: number;
}

/** longest edge clamped to MAX_EDGE, preserving the aspect ratio */
export function fitWithin(w: number, h: number, max = MAX_EDGE): [number, number] {
  if (w <= 0 || h <= 0) return [0, 0];
  if (w <= max && h <= max) return [Math.round(w), Math.round(h)];
  const scale = max / Math.max(w, h);
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
}

const readDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('read failed'));
    r.readAsDataURL(file);
  });

/**
 * Decode, downscale and re-encode an image. Falls back to the untouched data
 * URL when the browser can't give us a canvas (older Safari, jsdom in tests).
 */
export async function decodeImage(file: File): Promise<DecodedImage> {
  const original = await readDataUrl(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode failed'));
      el.src = original;
    });
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const [w, h] = fitWithin(nw, nh);
    const resized = w !== nw || h !== nh;

    // already small and already cheap: nothing to gain by re-encoding
    if (!resized && file.size < 600 * 1024) return { src: original, width: nw, height: nh };

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { src: original, width: nw, height: nh };
    ctx.drawImage(img, 0, 0, w, h);
    // PNGs with transparency stay PNG; everything else is cheaper as JPEG
    const type = file.type === 'image/png' || file.type === 'image/gif' ? 'image/png' : 'image/jpeg';
    const src = canvas.toDataURL(type, JPEG_QUALITY);

    // When we actually scaled the image down we must keep the canvas output:
    // falling back to the original would report the new dimensions against the
    // old pixels. Only the same-size re-encode is allowed to lose the race.
    if (resized) return { src, width: w, height: h };
    return src.length < original.length
      ? { src, width: w, height: h }
      : { src: original, width: nw, height: nh };
  } catch {
    return { src: original, width: 0, height: 0 };
  }
}
