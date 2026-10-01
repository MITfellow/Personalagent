import { describe, expect, it } from 'vitest';
import { describeDeviceError, MediaError, resampleWaveform } from './media';

describe('device errors', () => {
  it('explains a blocked permission rather than echoing the exception', () => {
    const e = describeDeviceError({ name: 'NotAllowedError' }, 'camera');
    expect(e).toBeInstanceOf(MediaError);
    expect(e.kind).toBe('denied');
    expect(e.message).toContain('Camera access was blocked');
    expect(e.message).toContain('site settings');
  });

  it('names the right device', () => {
    expect(describeDeviceError({ name: 'NotFoundError' }, 'microphone').message).toBe(
      'No microphone found on this device.',
    );
    expect(describeDeviceError({ name: 'NotFoundError' }, 'camera').message).toBe(
      'No camera found on this device.',
    );
  });

  it('distinguishes a device another app is holding', () => {
    const e = describeDeviceError({ name: 'NotReadableError' }, 'camera');
    expect(e.kind).toBe('busy');
    expect(e.message).toContain('Another app');
  });

  it('falls back to something readable for an unknown failure', () => {
    const e = describeDeviceError(new Error('kaboom'), 'microphone');
    expect(e.kind).toBe('failed');
    expect(e.message).toBe('Could not start the microphone.');
  });
});

describe('waveform', () => {
  it('condenses a long take into the bars a bubble draws', () => {
    const levels = Array.from({ length: 900 }, (_, i) => Math.abs(Math.sin(i / 20)));
    const wf = resampleWaveform(levels, 34);
    expect(wf).toHaveLength(34);
    for (const v of wf) {
      expect(v).toBeGreaterThanOrEqual(0.06);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('keeps the shape of what was said', () => {
    // silence, then a shout, then silence
    const levels = [...Array(30).fill(0.01), ...Array(30).fill(0.9), ...Array(30).fill(0.01)];
    const wf = resampleWaveform(levels, 9);
    expect(wf[1]).toBeLessThan(0.3);
    expect(wf[4]).toBeGreaterThan(0.8);
    expect(wf[7]).toBeLessThan(0.3);
  });

  it('lifts a quietly recorded memo so it still reads as a waveform', () => {
    const quiet = Array.from({ length: 100 }, () => 0.05);
    const wf = resampleWaveform(quiet, 20);
    expect(Math.max(...wf)).toBeGreaterThan(0.8);
  });

  it('survives a take with no samples at all', () => {
    const wf = resampleWaveform([], 34);
    expect(wf).toHaveLength(34);
    expect(Math.max(...wf)).toBeLessThan(0.2);
  });

  it('never returns a bar taller than the box', () => {
    const loud = Array.from({ length: 200 }, () => 4);
    expect(Math.max(...resampleWaveform(loud))).toBeLessThanOrEqual(1);
  });
});
