import { describe, expect, it } from 'vitest';
import type { Attachment } from '../types';
import { attachmentBytes, blobToDataUrl, dataUrlToBlob, inlineBlobs, restoreBlobs } from './blobs';

const att = (over: Partial<Attachment>): Attachment => ({
  id: 'a',
  kind: 'file',
  name: 'thing.bin',
  ...over,
});

const wrap = (attachments: Attachment[]) => ({ messages: [{ attachments }] });

describe('blob round-tripping', () => {
  it('turns a blob into a data URL and back without losing bytes', async () => {
    const blob = new Blob(['hello \u00e9 world'], { type: 'text/plain' });
    const url = await blobToDataUrl(blob);
    expect(url.startsWith('data:text/plain')).toBe(true);

    const back = dataUrlToBlob(url);
    expect(back).not.toBeNull();
    expect(back?.type).toBe('text/plain');
    expect(await back?.text()).toBe('hello \u00e9 world');
  });

  it('returns null for something that is not a data URL', () => {
    expect(dataUrlToBlob('blob:http://x/123')).toBeNull();
    expect(dataUrlToBlob('not a url at all')).toBeNull();
  });

  it('inlines blobs for export, because JSON.stringify(blob) is {}', async () => {
    const blob = new Blob(['PDF'], { type: 'application/pdf' });
    const out = await inlineBlobs(wrap([att({ kind: 'file', blob, name: 'a.pdf' })]));
    const a = out.messages[0].attachments[0];

    expect(a.blob).toBeUndefined();
    expect(a.src?.startsWith('data:application/pdf')).toBe(true);
    expect(JSON.stringify(out)).toContain('data:application/pdf');
  });

  it('leaves attachments without blobs untouched', async () => {
    const input = wrap([att({ kind: 'image', src: 'data:image/png;base64,AAA' })]);
    const out = await inlineBlobs(input);
    expect(out.messages[0]).toBe(input.messages[0]);
  });

  it('rebuilds blobs on import, but keeps images as data URLs', () => {
    const out = restoreBlobs(
      wrap([
        att({ kind: 'file', name: 'a.pdf', src: 'data:application/pdf;base64,UERG' }),
        att({ id: 'b', kind: 'image', src: 'data:image/png;base64,AAA' }),
      ]),
    );
    const [file, image] = out.messages[0].attachments;

    expect(file.blob).toBeInstanceOf(Blob);
    expect(file.src).toBeUndefined();
    // the image data URL doubles as its inline preview
    expect(image.blob).toBeUndefined();
    expect(image.src).toBe('data:image/png;base64,AAA');
  });

  it('survives a full export/import cycle through JSON', async () => {
    const original = new Blob(['zip bytes'], { type: 'application/zip' });
    const exported = await inlineBlobs(wrap([att({ blob: original, name: 'x.zip' })]));
    const imported = restoreBlobs(JSON.parse(JSON.stringify(exported)));
    const back = imported.messages[0].attachments[0].blob;

    expect(await back?.text()).toBe('zip bytes');
    expect(back?.size).toBe(original.size);
  });

  it('counts stored bytes from blobs and data URLs alike', () => {
    const total = attachmentBytes([
      { attachments: [att({ blob: new Blob([new Uint8Array(1000)]) })] },
      { attachments: [att({ id: 'b', kind: 'image', src: `data:image/png;base64,${'A'.repeat(400)}` })] },
      { attachments: [att({ id: 'c', src: 'blob:http://x/1' })] },
    ]);
    expect(total).toBe(1000 + Math.round(`data:image/png;base64,${'A'.repeat(400)}`.length * 0.75));
  });
});
