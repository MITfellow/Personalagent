import { expect, test } from '@playwright/test';
import { seedDemoWorld } from './fixture';

const WIDE = 'e2e/files/wide.png';
const PDF = 'e2e/files/report.pdf';
const EMPTY = 'e2e/files/empty.csv';
const BIG = 'e2e/files/oversize.bin';

test.beforeEach(async ({ page, isMobile }) => {
  await seedDemoWorld(page);
  await page.goto('/');
  if (isMobile) await page.locator('.conv-row, .pinned-item').first().click();
});

test('staged files show a real preview, type and size before sending', async ({ page }) => {
  await page.locator('input[type=file]').setInputFiles([WIDE, PDF]);

  await expect(page.locator('.stage-tile')).toHaveCount(2);
  await expect(page.locator('.stage-tile.ready')).toHaveCount(2);

  // the image gets a thumbnail, the document a tinted type badge
  await expect(page.locator('.stage-tile').nth(0).locator('img')).toBeVisible();
  await expect(page.locator('.stage-tile').nth(1).locator('.stage-ext')).toHaveText('PDF');

  await expect(page.locator('.stage-name').nth(0)).toHaveText('wide.png');
  await expect(page.locator('.stage-size').nth(1)).toHaveText(/KB|MB/);
  await expect(page.locator('.stage-head')).toContainText('2 attachments');
});

test('oversized and empty files are refused with a reason, not silently dropped', async ({ page }) => {
  await page.locator('input[type=file]').setInputFiles([WIDE, BIG, EMPTY]);

  await expect(page.locator('.stage-tile')).toHaveCount(3);
  await expect(page.locator('.stage-tile.error')).toHaveCount(2);
  await expect(page.locator('.stage-size.bad').nth(0)).toContainText(/too large/i);
  await expect(page.locator('.stage-size.bad').nth(1)).toContainText(/empty/i);

  // only the good one counts towards the total, and only it is sent
  await expect(page.locator('.stage-head')).toContainText('1 attachment');
  await page.locator('.field textarea').fill('one good file');
  await page.keyboard.press('Enter');
  await expect(page.locator('.stage-tile')).toHaveCount(0);
  await expect(page.locator('.bubble.out .att-image').last()).toBeVisible();
});

test('the same file twice is de-duped with a notice', async ({ page }) => {
  const input = page.locator('input[type=file]');
  await input.setInputFiles([PDF]);
  await expect(page.locator('.stage-tile')).toHaveCount(1);

  await input.setInputFiles([PDF]);
  await expect(page.locator('.stage-tile')).toHaveCount(1);
  await expect(page.locator('.stage-notice')).toContainText('already attached');
});

test('a staged image can be removed, cleared and previewed', async ({ page }) => {
  await page.locator('input[type=file]').setInputFiles([WIDE, PDF]);
  await expect(page.locator('.stage-tile')).toHaveCount(2);

  // preview opens Quick Look and says it is not sent yet
  await page.locator('.stage-thumb[role=button]').first().click();
  await expect(page.locator('.lightbox')).toBeVisible();
  await expect(page.locator('.lb-figure figcaption')).toContainText('Not sent yet');
  await page.keyboard.press('Escape');
  await expect(page.locator('.lightbox')).toHaveCount(0);

  await page.locator('.stage-tile').first().hover();
  await page.locator('.stage-x').first().click();
  await expect(page.locator('.stage-tile')).toHaveCount(1);

  await page.locator('.stage-clear').click();
  await expect(page.locator('.stage')).toHaveCount(0);
});

test('a big photo is downscaled before it is stored', async ({ page }) => {
  await page.locator('input[type=file]').setInputFiles([WIDE]);
  await expect(page.locator('.stage-tile.ready')).toHaveCount(1);
  await page.locator('.field textarea').fill('big photo');
  await page.keyboard.press('Enter');

  // persistence is debounced; wait for the message to actually hit storage
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('messages.app.state');
    if (!raw) return false;
    const msgs = JSON.parse(raw).state.messages as Array<{ attachments: Array<{ kind: string; src?: string }> }>;
    return msgs.some((m) => m.attachments.some((a) => a.kind === 'image' && a.src?.startsWith('data:')));
  });

  const dims = await page.evaluate(async () => {
    const raw = localStorage.getItem('messages.app.state');
    const env = JSON.parse(raw as string);
    const msgs = env.state.messages as Array<{ attachments: Array<{ kind: string; src?: string; width?: number; height?: number }> }>;
    const att = msgs.flatMap((m) => m.attachments).filter((a) => a.kind === 'image' && a.src?.startsWith('data:')).pop();
    if (!att) return null;
    const real = await new Promise<[number, number]>((res) => {
      const i = new Image();
      i.onload = () => res([i.naturalWidth, i.naturalHeight]);
      i.src = att.src as string;
    });
    return { declared: [att.width, att.height], real };
  });

  expect(dims).not.toBeNull();
  // 2400x1200 source, clamped to a 1600px long edge
  expect(dims!.real[0]).toBe(1600);
  expect(dims!.real[1]).toBe(800);
  // and the stored metadata matches the pixels it describes
  expect(dims!.declared).toEqual(dims!.real);
});

test('dragging files over the composer offers a drop target', async ({ page }) => {
  await expect(page.locator('.drop-veil')).toHaveCount(0);

  await page.evaluate(() => {
    const el = document.querySelector('.composer-wrap')!;
    const dt = new DataTransfer();
    dt.items.add(new File(['x'], 'drop.png', { type: 'image/png' }));
    el.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer: dt }));
  });
  await expect(page.locator('.drop-veil')).toBeVisible();
  await expect(page.locator('.drop-title')).toHaveText('Drop to attach');

  await page.evaluate(() => {
    document.querySelector('.composer-wrap')!.dispatchEvent(new DragEvent('dragleave', { bubbles: true }));
  });
  await expect(page.locator('.drop-veil')).toHaveCount(0);
});

test('a draft survives switching threads and reloading', async ({ page, isMobile }) => {
  test.skip(isMobile, 'needs two visible threads');

  const field = page.locator('.field textarea');
  await field.fill('half-written thought');

  // switch away and back: the draft is committed on the way out
  await page.locator('.conv-row, .pinned-item').nth(1).click();
  await expect(field).toHaveValue('');
  await page.locator('.conv-row, .pinned-item').nth(0).click();
  await expect(field).toHaveValue('half-written thought');

  // and it is still there after a reload
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('messages.app.state');
    return !!raw && JSON.parse(raw).state.chats.some((c: { draft: string }) => c.draft === 'half-written thought');
  });
  await page.reload();
  await expect(page.locator('.field textarea')).toHaveValue('half-written thought');
});
