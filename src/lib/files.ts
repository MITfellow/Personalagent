/**
 * Attachment plumbing: naming, sizing, type sniffing and image downscaling.
 *
 * Any file can be attached. The bytes are kept as a Blob and handed to
 * IndexedDB as a structured clone — no base64, so a 40 MB video costs 40 MB
 * rather than the 53 MB a data URL would. Images additionally get a
 * downscaled preview so a thread of phone photos stays cheap to render.
 */

/** hard caps, surfaced in the UI rather than failing silently */
export const MAX_FILES = 20;
/**
 * Per-file ceiling. This was 8 MB when everything lived in localStorage;
 * IndexedDB stores binary natively, so the limit is now about what is
 * reasonable to hold in a conversation rather than what the browser allows.
 */
export const MAX_BYTES = 100 * 1024 * 1024;
/** total across one message, so a single send cannot eat the whole quota */
export const MAX_TOTAL_BYTES = 250 * 1024 * 1024;
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

/** Broad buckets that decide how an attachment is rendered. */
export type FileClass = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'archive' | 'file';

const BY_EXT: Record<string, FileClass> = {
  // images
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', avif: 'image',
  bmp: 'image', ico: 'image', svg: 'image', heic: 'image', heif: 'image', tif: 'image', tiff: 'image',
  // video
  mp4: 'video', m4v: 'video', mov: 'video', webm: 'video', ogv: 'video', avi: 'video',
  mkv: 'video', mpg: 'video', mpeg: 'video', '3gp': 'video',
  // audio
  mp3: 'audio', wav: 'audio', m4a: 'audio', aac: 'audio', ogg: 'audio', oga: 'audio',
  opus: 'audio', flac: 'audio', aiff: 'audio', wma: 'audio', mid: 'audio',
  // documents that open as a page
  pdf: 'pdf',
  // text and code
  txt: 'text', md: 'text', markdown: 'text', rtf: 'text', log: 'text', csv: 'text', tsv: 'text',
  json: 'text', xml: 'text', yml: 'text', yaml: 'text', toml: 'text', ini: 'text', env: 'text',
  js: 'text', jsx: 'text', ts: 'text', tsx: 'text', mjs: 'text', cjs: 'text',
  html: 'text', htm: 'text', css: 'text', scss: 'text', less: 'text',
  py: 'text', rb: 'text', go: 'text', rs: 'text', java: 'text', kt: 'text', swift: 'text',
  c: 'text', h: 'text', cpp: 'text', hpp: 'text', cs: 'text', php: 'text', sh: 'text',
  sql: 'text', diff: 'text', patch: 'text',
  // archives
  zip: 'archive', rar: 'archive', '7z': 'archive', gz: 'archive', tgz: 'archive', bz2: 'archive',
  xz: 'archive', tar: 'archive', dmg: 'archive', iso: 'archive', pkg: 'archive', apk: 'archive',
};

/**
 * What kind of thing this is. The MIME type is trusted first — it comes from
 * the OS — and the extension is the fallback, because plenty of files arrive
 * with an empty type (drag from an archive, some Linux file managers).
 */
export function classify(type: string, name = ''): FileClass {
  const t = (type || '').toLowerCase();
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  if (t === 'application/pdf') return 'pdf';
  if (t.startsWith('text/')) return 'text';
  if (/^application\/(json|xml|javascript|x-sh|sql|x-yaml)/.test(t)) return 'text';
  if (/(zip|compressed|tar|rar|7z|gzip)/.test(t)) return 'archive';
  return BY_EXT[extOf(name)] ?? 'file';
}

/** Human type name for the file card: "PDF Document", "ZIP Archive". */
export function describeType(type: string, name = ''): string {
  const ext = extOf(name).toUpperCase();
  switch (classify(type, name)) {
    case 'image': return ext ? `${ext} Image` : 'Image';
    case 'video': return ext ? `${ext} Video` : 'Video';
    case 'audio': return ext ? `${ext} Audio` : 'Audio';
    case 'pdf': return 'PDF Document';
    case 'archive': return ext ? `${ext} Archive` : 'Archive';
    case 'text': return ext ? `${ext} File` : 'Text File';
    default: return ext ? `${ext} File` : 'File';
  }
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
  tsx: '#2F7FD6',
  py: '#3776AB',
  rb: '#CC342D',
  go: '#00ADD8',
  rs: '#DEA584',
  java: '#E76F00',
  swift: '#F05138',
  html: '#E34F26',
  css: '#264DE4',
  sh: '#4EAA25',
  sql: '#DD7F00',
  svg: '#FFB13B',
  heic: '#5AC8FA',
  webm: '#BF5AF2',
  mkv: '#BF5AF2',
  avi: '#BF5AF2',
  flac: '#FF375F',
  aac: '#FF375F',
  ogg: '#FF375F',
  '7z': '#8E8E93',
  tar: '#8E8E93',
  dmg: '#8E8E93',
  iso: '#8E8E93',
  apk: '#A4C639',
  epub: '#8E44AD',
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

/**
 * Whether one send is too heavy in total. A hundred 90 MB files are each
 * individually fine and collectively absurd.
 */
export function totalReason(bytes: number): string | null {
  if (bytes > MAX_TOTAL_BYTES) {
    return `That's ${humanSize(bytes)} in one message — the limit is ${humanSize(MAX_TOTAL_BYTES)}`;
  }
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
