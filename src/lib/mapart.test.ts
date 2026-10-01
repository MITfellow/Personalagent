import { describe, expect, it } from 'vitest';
import {
  accuracyLabel,
  accuracyRadius,
  buildMapArt,
  formatCoords,
  formatDms,
  mapsUrl,
  mulberry32,
  seedFromCoords,
} from './mapart';

describe('map generation', () => {
  it('draws the same place the same way every time', () => {
    const a = buildMapArt(28.6692, 77.4538);
    const b = buildMapArt(28.6692, 77.4538);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('draws different places differently', () => {
    const delhi = buildMapArt(28.6692, 77.4538);
    const paris = buildMapArt(48.8566, 2.3522);
    expect(JSON.stringify(delhi)).not.toBe(JSON.stringify(paris));
  });

  it('ignores GPS jitter below the rounding threshold', () => {
    // ~1 m apart: the neighbourhood should not redraw itself
    const a = seedFromCoords(28.669200, 77.453800);
    const b = seedFromCoords(28.669203, 77.453801);
    expect(a).toBe(b);
  });

  it('redraws for a genuinely different location', () => {
    expect(seedFromCoords(28.6692, 77.4538)).not.toBe(seedFromCoords(28.6792, 77.4538));
  });

  it('fills the card with roads and blocks', () => {
    const art = buildMapArt(1.3521, 103.8198, 320, 190);
    expect(art.width).toBe(320);
    expect(art.roads.length).toBeGreaterThan(6);
    expect(art.blocks.length).toBeGreaterThan(3);
    // every road is a drawable path
    for (const r of art.roads) {
      expect(r.d).toMatch(/^M-?[\d.]+ -?[\d.]+ [LC]/);
      expect(r.width).toBeGreaterThan(0);
    }
  });

  it('keeps blocks inside sensible bounds', () => {
    const art = buildMapArt(-33.8688, 151.2093, 300, 176);
    for (const b of art.blocks) {
      expect(b.w).toBeGreaterThan(0);
      expect(b.h).toBeGreaterThan(0);
      expect(b.x).toBeGreaterThan(-20);
      expect(b.y).toBeGreaterThan(-20);
    }
  });

  it('is stable across card sizes for the same seed', () => {
    const big = buildMapArt(40.7128, -74.006, 300, 176);
    const small = buildMapArt(40.7128, -74.006, 150, 92);
    expect(big.roads.length).toBeGreaterThan(0);
    expect(small.roads.length).toBeGreaterThan(0);
  });
});

describe('mulberry32', () => {
  it('is deterministic and stays in range', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 50; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('coordinate labels', () => {
  it('formats both hemispheres', () => {
    expect(formatCoords(28.6692, 77.4538)).toBe('28.669200° N, 77.453800° E');
    expect(formatCoords(-33.8688, -70.6693)).toBe('33.868800° S, 70.669300° W');
  });

  it('formats degrees, minutes and seconds the way Maps does', () => {
    expect(formatDms(28.6692, 77.4538)).toBe('28°40\'09.1"N 77°27\'13.7"E');
    expect(formatDms(-33.8688, 151.2093)).toMatch(/^33°52'.*S 151°12'.*E$/);
  });

  it('describes accuracy in the right unit', () => {
    expect(accuracyLabel(0)).toBe('Current Location');
    expect(accuracyLabel(12.4)).toBe('Accurate to 12 m');
    expect(accuracyLabel(2400)).toBe('Accurate to 2.4 km');
  });

  it('scales the accuracy ring but never off the card', () => {
    expect(accuracyRadius(0)).toBe(0);
    expect(accuracyRadius(5)).toBe(10); // a tight fix still needs to be visible
    expect(accuracyRadius(50)).toBeCloseTo(70);
    expect(accuracyRadius(100_000, 320)).toBeLessThanOrEqual(320 * 0.46);
  });

  it('links to the real place', () => {
    expect(mapsUrl(28.6692, 77.4538)).toContain('ll=28.6692,77.4538');
  });
});
