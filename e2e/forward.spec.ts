import { expect, test } from '@playwright/test';
import { seedDemoWorld } from './fixture';

test.beforeEach(async ({ page }) => {
  await seedDemoWorld(page);
  await page.goto('/');
});

test('a message can be forwarded to another conversation', async ({ page, isMobile }) => {
  test.skip(isMobile, 'needs the list and the thread side by side');

  await page.locator('.conv-row, .pinned-item').first().click();
  const source = page.locator('.bubble').last();
  const text = (await source.innerText()).trim();

  await source.click({ button: 'right' });
  await page.getByRole('button', { name: 'Forward…' }).click();

  const dialog = page.getByRole('dialog', { name: 'Forward message' });
  await expect(dialog).toBeVisible();
  // the message being passed on is shown, so you cannot forward the wrong one
  await expect(dialog.locator('.fwd-quote')).toContainText(text.slice(0, 20));

  const target = dialog.locator('.contact-pick').first();
  const targetName = (await target.locator('.nm').innerText()).trim();
  await target.click();

  // forwarding lands you in the conversation it went to
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.chat-title, .chat-header')).toContainText(targetName.split(' ')[0]);

  const sent = page.locator('.bubble.out').last();
  await expect(sent).toContainText(text);
  await expect(page.locator('.forwarded-tag').last()).toContainText('Forwarded');
});

test('the forward picker never offers the conversation you are already in', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'needs the list and the thread side by side');

  await page.locator('.conv-row, .pinned-item').first().click();
  const here = (await page.locator('.chat-title, .chat-header').first().innerText()).trim();

  await page.locator('.bubble').last().click({ button: 'right' });
  await page.getByRole('button', { name: 'Forward…' }).click();

  const names = await page.getByRole('dialog').locator('.nm').allInnerTexts();
  expect(names.length).toBeGreaterThan(0);
  expect(names.map((n) => n.trim())).not.toContain(here);
});

test('a forwarded file arrives with its bytes, not just its name', async ({ page, isMobile }) => {
  test.skip(isMobile, 'needs the list and the thread side by side');

  await page.locator('.conv-row, .pinned-item').first().click();
  await page.locator('input[type=file]').setInputFiles('e2e/files/report.pdf');
  await page.locator('.field textarea').fill('passing this along');
  await page.keyboard.press('Enter');
  await expect(page.locator('.stage-tile')).toHaveCount(0);

  await page.locator('.bubble.out').last().click({ button: 'right' });
  await page.getByRole('button', { name: 'Forward…' }).click();
  await page.getByRole('dialog').locator('.contact-pick').first().click();

  const card = page.locator('.att-file').filter({ hasText: 'report.pdf' }).last();
  await expect(card).toBeVisible();
  await expect(card.locator('.att-unavailable')).toHaveCount(0);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    card.getByRole('button', { name: /^Download/ }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('report.pdf');
});
