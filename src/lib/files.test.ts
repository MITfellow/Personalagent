import { describe, expect, it } from 'vitest';
import {
  MAX_BYTES,
  classify,
  describeType,
  extOf,
  fileKey,
  fileTint,
  fitWithin,
  humanSize,
  isImageFile,
  rejectReason,
  shortName,
  totalReason,
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

describe('classifying any file', () => {
  it('trusts the MIME type first', () => {
    expect(classify('image/png', 'thing.bin')).toBe('image');
    expect(classify('video/mp4', 'clip')).toBe('video');
    expect(classify('audio/mpeg', 'song')).toBe('audio');
    expect(classify('application/pdf', 'report')).toBe('pdf');
    expect(classify('text/plain', 'notes')).toBe('text');
    expect(classify('application/zip', 'bundle')).toBe('archive');
  });

  it('falls back to the extension when the type is empty', () => {
    // dragging out of an archive often yields an empty type
    expect(classify('', 'holiday.HEIC')).toBe('image');
    expect(classify('', 'render.mkv')).toBe('video');
    expect(classify('', 'podcast.flac')).toBe('audio');
    expect(classify('', 'contract.pdf')).toBe('pdf');
    expect(classify('', 'main.rs')).toBe('text');
    expect(classify('', 'backup.tar.gz')).toBe('archive');
    expect(classify('', 'installer.dmg')).toBe('archive');
  });

  it('calls an unknown thing a file rather than guessing', () => {
    expect(classify('', 'mystery')).toBe('file');
    expect(classify('application/octet-stream', 'firmware.xyz')).toBe('file');
  });

  it('describes the type in words for the file card', () => {
    expect(describeType('application/pdf', 'a.pdf')).toBe('PDF Document');
    expect(describeType('', 'archive.zip')).toBe('ZIP Archive');
    expect(describeType('video/quicktime', 'clip.mov')).toBe('MOV Video');
    expect(describeType('', 'no-extension')).toBe('File');
  });

  it('refuses a file over the per-file ceiling, not an ordinary big one', () => {
    expect(rejectReason({ name: 'clip.mp4', size: 40 * 1024 * 1024 })).toBeNull();
    expect(rejectReason({ name: 'huge.iso', size: 200 * 1024 * 1024 })).toContain('Too large');
    expect(rejectReason({ name: 'empty.txt', size: 0 })).toBe('This file is empty');
  });

  it('refuses a send that is too heavy in total', () => {
    expect(totalReason(100 * 1024 * 1024)).toBeNull();
    expect(totalReason(300 * 1024 * 1024)).toContain('in one message');
  });
});
