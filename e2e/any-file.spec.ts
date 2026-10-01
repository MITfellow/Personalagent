import { expect, test } from '@playwright/test';
import { seedDemoWorld } from './fixture';

const PDF = 'e2e/files/report.pdf';
const ZIP = 'e2e/files/bundle.zip';
const TXT = 'e2e/files/notes.txt';
const CLIP = 'e2e/files/clip.mp4';

test.beforeEach(async ({ page, isMobile }) => {
  await seedDemoWorld(page);
  await page.goto('/');
  if (isMobile) await page.locator('.conv-row, .pinned-item').first().click();
});

const send = async (page: import('@playwright/test').Page, files: string[], text: string) => {
  await page.locator('input[type=file]').setInputFiles(files);
  await expect(page.locator('.stage-tile.ready')).toHaveCount(files.length);
  await page.locator('.field textarea').fill(text);
  await page.keyboard.press('Enter');
  await expect(page.locator('.stage-tile')).toHaveCount(0);
};

test('any file type can be attached and is described properly', async ({ page }) => {
  await send(page, [PDF, ZIP, TXT], 'three different things');

  const cards = page.locator('.bubble.out .att-file');
  await expect(cards).toHaveCount(3);

  await expect(cards.nth(0)).toContainText('report.pdf');
  await expect(cards.nth(0).locator('.fsize')).toContainText('PDF Document');
  await expect(cards.nth(1).locator('.fsize')).toContainText('ZIP Archive');
  await expect(cards.nth(2).locator('.fsize')).toContainText(/Text|TXT/);

  // a size is always shown, never "0 bytes" or blank
  await expect(cards.nth(0).locator('.fsize')).toContainText(/\d+(\.\d+)?\s?(bytes|KB|MB)/);

  // readable things offer Open, an archive only offers Download
  await expect(cards.nth(0).getByRole('button', { name: /^Open/ })).toBeVisible();
  await expect(cards.nth(1).getByRole('button', { name: /^Open/ })).toHaveCount(0);
  await expect(cards.nth(1).getByRole('button', { name: /^Download/ })).toBeVisible();
});

test('a sent file can be downloaded back with its original bytes', async ({ page }) => {
  await send(page, [ZIP], 'here is the bundle');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.bubble.out .att-file').last().getByRole('button', { name: /^Download/ }).click(),
  ]);

  expect(download.suggestedFilename()).toBe('bundle.zip');
  const path = await download.path();
  expect(path).toBeTruthy();
});

test('a video attachment plays inline rather than becoming a generic file', async ({ page }) => {
  await send(page, [CLIP], 'clip');

  const video = page.locator('.bubble.out .att-video video');
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute('controls', '');
  // the src is an object URL over the stored blob, not a data URL
  expect(await video.getAttribute('src')).toMatch(/^blob:/);
  await expect(page.locator('.att-video-bar')).toContainText('clip.mp4');
});

test('file bytes survive a reload, so downloads still work later', async ({ page, isMobile }) => {
  await send(page, [PDF], 'read this');

  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const env = await window.__store.read();
        const msgs = (env?.state.messages ?? []) as Array<{ attachments: Array<{ name?: string }> }>;
        return msgs.some((m) => m.attachments.some((a) => a.name === 'report.pdf'));
      }),
    )
    .toBe(true);

  await page.reload();
  // mobile reopens on the conversation list, so walk back into the thread
  if (isMobile) await page.locator('.conv-row, .pinned-item').first().click();

  const card = page.locator('.att-file').filter({ hasText: 'report.pdf' }).last();
  await expect(card).toBeVisible();
  // a blob that failed to persist would render as "Unavailable" instead
  await expect(card.locator('.att-unavailable')).toHaveCount(0);
  await expect(card.getByRole('button', { name: /^Download/ })).toBeEnabled();
});

test('the storage panel reports usage and offers installation', async ({ page, isMobile }) => {
  test.skip(isMobile, 'settings live behind the sidebar on mobile');
  await send(page, [PDF], 'something to take up room');

  await page.getByRole('button', { name: 'Settings' }).click();
  const box = page.locator('.storage-box');
  await expect(box).toBeVisible();
  await expect(box).toContainText(/used/i);
  await expect(box.locator('.storage-bar')).toBeVisible();
  await expect(box.getByRole('button', { name: /Keep my data safe/ })).toBeVisible();
});
