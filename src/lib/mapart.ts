/**
 * Draws a map without a map server.
 *
 * Sharing a location should look like Maps, but the app has no backend and
 * fetching tiles would leak the user's coordinates to a third party on every
 * render. So the card draws a street plan generated *deterministically from
 * the coordinates themselves*: the same place always produces the same map,
 * two different places produce different ones, and nothing leaves the device.
 *
 * It is an illustration of a location, not a survey of one — the pin, the
 * coordinates and the accuracy ring are the real data.
 */

/** Small fast PRNG. Same seed, same map, forever. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hashes a position into a seed. Rounded to ~11 m so tiny GPS jitter doesn't
 * redraw the whole neighbourhood between two readings at the same desk.
 */
export function seedFromCoords(lat: number, lon: number): number {
  const a = Math.round(lat * 10000);
  const b = Math.round(lon * 10000);
  let h = 2166136261 >>> 0;
  for (const v of [a, b]) {
    h ^= v & 0xffff;
    h = Math.imul(h, 16777619) >>> 0;
    h ^= (v >> 16) & 0xffff;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export interface Road {
  d: string;
  width: number;
  major: boolean;
}

export interface MapArt {
  width: number;
  height: number;
  roads: Road[];
  blocks: { x: number; y: number; w: number; h: number }[];
  park: { x: number; y: number; w: number; h: number } | null;
  water: string | null;
}

/**
 * Builds the street plan. Avenues and streets are laid on an irregular grid,
 * then one diagonal and sometimes a river cut across it — which is what stops
 * the result from reading as graph paper.
 */
export function buildMapArt(lat: number, lon: number, width = 320, height = 190): MapArt {
  const rnd = mulberry32(seedFromCoords(lat, lon));
  const roads: Road[] = [];
  const blocks: MapArt['blocks'] = [];

  // vertical avenues
  const cols: number[] = [];
  let x = -10 + rnd() * 30;
  while (x < width + 10) {
    cols.push(x);
    x += 38 + rnd() * 44;
  }
  // horizontal streets
  const rows: number[] = [];
  let y = -10 + rnd() * 24;
  while (y < height + 10) {
    rows.push(y);
    y += 30 + rnd() * 34;
  }

  for (const c of cols) {
    const major = rnd() > 0.68;
    roads.push({ d: `M${c.toFixed(1)} -8 L${(c + (rnd() - 0.5) * 10).toFixed(1)} ${height + 8}`, width: major ? 7 : 3.4, major });
  }
  for (const r of rows) {
    const major = rnd() > 0.74;
    roads.push({ d: `M-8 ${r.toFixed(1)} L${width + 8} ${(r + (rnd() - 0.5) * 8).toFixed(1)}`, width: major ? 7 : 3.4, major });
  }

  // one diagonal thoroughfare
  const dx = rnd() * width;
  roads.push({
    d: `M${dx.toFixed(1)} -8 L${(dx + (rnd() - 0.5) * 220).toFixed(1)} ${height + 8}`,
    width: 6,
    major: true,
  });

  // city blocks between the streets
  for (let i = 0; i < cols.length - 1; i++) {
    for (let j = 0; j < rows.length - 1; j++) {
      const bx = cols[i] + 5;
      const by = rows[j] + 5;
      const bw = cols[i + 1] - cols[i] - 10;
      const bh = rows[j + 1] - rows[j] - 10;
      if (bw > 8 && bh > 8 && rnd() > 0.22) blocks.push({ x: bx, y: by, w: bw, h: bh });
    }
  }

  const park =
    rnd() > 0.45 && cols.length > 2 && rows.length > 2
      ? {
          x: cols[1] + 4,
          y: rows[1] + 4,
          w: Math.max(26, cols[2] - cols[1] - 8),
          h: Math.max(22, rows[2] - rows[1] - 8),
        }
      : null;

  const water =
    rnd() > 0.62
      ? `M-10 ${(height * (0.55 + rnd() * 0.3)).toFixed(1)} C ${(width * 0.3).toFixed(1)} ${(height * (0.4 + rnd() * 0.3)).toFixed(1)}, ${(width * 0.6).toFixed(1)} ${(height * (0.75 + rnd() * 0.2)).toFixed(1)}, ${width + 10} ${(height * (0.5 + rnd() * 0.35)).toFixed(1)}`
      : null;

  return { width, height, roads, blocks, park, water };
}

/* ───────────────────────── labels ───────────────────────── */

/** "28.669200° N, 77.453800° E" — the honest version of an address. */
export function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(6)}° ${ns}, ${Math.abs(lon).toFixed(6)}° ${ew}`;
}

/** Degrees–minutes–seconds, the way Maps shows a dropped pin. */
export function formatDms(lat: number, lon: number): string {
  const part = (v: number, pos: string, neg: string) => {
    const hemi = v >= 0 ? pos : neg;
    const abs = Math.abs(v);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = ((abs - d - m / 60) * 3600).toFixed(1);
    return `${d}°${String(m).padStart(2, '0')}'${s.padStart(4, '0')}"${hemi}`;
  };
  return `${part(lat, 'N', 'S')} ${part(lon, 'E', 'W')}`;
}

export function accuracyLabel(metres: number): string {
  if (!metres || metres <= 0) return 'Current Location';
  if (metres < 1000) return `Accurate to ${Math.round(metres)} m`;
  return `Accurate to ${(metres / 1000).toFixed(1)} km`;
}

/** Opens the real place in whatever maps app the OS prefers. */
export function mapsUrl(lat: number, lon: number): string {
  return `https://maps.apple.com/?ll=${lat},${lon}&q=${encodeURIComponent('Shared Location')}`;
}

/**
 * Where the pin sits inside the card. Fixed at the centre — the map is drawn
 * *around* the coordinates, so the pin is always the subject.
 */
export const PIN = { x: 0.5, y: 0.46 } as const;

/**
 * Accuracy ring radius in card pixels. A 10 m fix is a dot; a 2 km fix is a
 * ring that covers the card, which is the honest way to show a bad fix.
 */
export function accuracyRadius(metres: number, cardWidth = 320): number {
  if (!metres || metres <= 0) return 0;
  // ~1.4 px per metre at the card's nominal zoom, clamped so it stays readable
  return Math.max(10, Math.min(cardWidth * 0.46, metres * 1.4));
}
