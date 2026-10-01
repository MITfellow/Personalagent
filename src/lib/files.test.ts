import { describe, expect, it } from 'vitest';
import {
  MAX_BYTES,
  extOf,
  fileKey,
  fileTint,
  fitWithin,
  humanSize,
  isImageFile,
  rejectReason,
  shortName,
  typeLabel,
} from './files';

describe('humanSize', () => {
  it('scales through the units', () => {
    expect(humanSize(0)).toBe('0 B');
    expect(humanSize(512)).toBe('512 B');
    expect(humanSize(1024)).toBe('1.0 KB');
    expect(humanSize(20 * 1024)).toBe('20 KB');
    expect(humanSize(1024 * 1024)).toBe('1.0 MB');
    expect(humanSize(15 * 1024 * 1024)).toBe('15 MB');
    expect(humanSize(2 * 1024 * 1024 * 1024)).toBe('2.0 GB');
  });

  it('does not invent sizes for nonsense input', () => {
    expect(humanSize(NaN)).toBe('—');
    expect(humanSize(-5)).toBe('—');
  });
});

describe('names', () => {
  it('pulls the extension off, lowercased', () => {
    expect(extOf('Report.PDF')).toBe('pdf');
    expect(extOf('archive.tar.gz')).toBe('gz');
    expect(extOf('/a/b/photo.jpeg')).toBe('jpeg');
    expect(extOf('README')).toBe('');
    expect(extOf('.gitignore')).toBe(''); // dotfile, not an extension
    expect(extOf('trailing.')).toBe('');
  });

  it('elides the middle and keeps the extension', () => {
    expect(shortName('short.pdf')).toBe('short.pdf');
    const long = shortName('quarterly-revenue-report-final-v4.pdf');
    expect(long.length).toBeLessThanOrEqual(23);
    expect(long.endsWith('.pdf')).toBe(true);
    expect(long).toContain('…');
  });

  it('labels and tints by type', () => {
    expect(typeLabel('a.pdf')).toBe('PDF');
    expect(typeLabel('a.docx')).toBe('DOCX');
    expect(typeLabel('LICENSE')).toBe('FILE');
    expect(fileTint('a.pdf')).toBe('#FF453A');
    expect(fileTint('a.unknown')).toBe('#8E8E93');
  });

  it('spots images by mime or extension', () => {
    expect(isImageFile('image/png')).toBe(true);
    expect(isImageFile('', 'snap.HEIC')).toBe(true);
    expect(isImageFile('application/pdf', 'a.pdf')).toBe(false);
  });
});

describe('guards', () => {
  it('rejects empty and oversized files', () => {
    expect(rejectReason({ name: 'a.png', size: 1024 })).toBeNull();
    expect(rejectReason({ name: 'a.png', size: 0 })).toMatch(/empty/i);
    expect(rejectReason({ name: 'a.png', size: MAX_BYTES + 1 })).toMatch(/too large/i);
  });

  it('keys files for de-duping on name and size', () => {
    expect(fileKey({ name: 'a.png', size: 10 })).toBe(fileKey({ name: 'a.png', size: 10 }));
    expect(fileKey({ name: 'a.png', size: 10 })).not.toBe(fileKey({ name: 'a.png', size: 11 }));
  });
});

describe('fitWithin', () => {
  it('leaves small images alone', () => {
    expect(fitWithin(800, 600)).toEqual([800, 600]);
  });

  it('clamps the long edge and keeps the ratio', () => {
    expect(fitWithin(4000, 2000)).toEqual([1600, 800]);
    expect(fitWithin(2000, 4000)).toEqual([800, 1600]);
    const [w, h] = fitWithin(3000, 2000);
    expect(w / h).toBeCloseTo(1.5, 2);
  });

  it('never rounds an edge down to zero', () => {
    const [w, h] = fitWithin(10000, 3);
    expect(w).toBe(1600);
    expect(h).toBeGreaterThanOrEqual(1);
  });

  it('shrugs off degenerate dimensions', () => {
    expect(fitWithin(0, 0)).toEqual([0, 0]);
  });
});
