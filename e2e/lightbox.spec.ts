import { expect, test } from '@playwright/test';
import { seedDemoWorld } from './fixture';

/** Drops a second and third photo into the open thread so nav has somewhere to go. */
async function addPhotos(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const raw = localStorage.getItem('messages.app.state');
    const env = JSON.parse(raw as string);
    const s = env.state;
    const chatId = s.chats[0].id;
    s.activeChatId = chatId;
    const px =
      'data:image/svg+xml;utf8,' +
      encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><rect width="80" height="60" fill="#58a"/></svg>');
    for (let i = 0; i < 3; i++) {
      s.messages.push({
        id: `lb-${i}`,
        chatId,
        authorId: 'me',
        text: '',
        at: Date.now() - (3 - i) * 1000,
        status: 'read',
        attachments: [{ kind: 'image', src: px, name: `shot-${i}.png` }],
        reactions: [],
        bubbleEffect: 'none',
        screenEffect: 'none',
      });
    }
    localStorage.setItem('messages.app.state', JSON.stringify(env));
  });
  await page.reload();
}

test('Quick Look opens, walks the thread photos with the keyboard and closes', async ({ page, isMobile }) => {
  await seedDemoWorld(page);
  await page.goto('/');
  await addPhotos(page);
  if (isMobile) await page.locator('.conv-row, .pinned-item').first().click();

  const shots = page.locator('.bubble img, .att-image img');
  await expect(shots.first()).toBeVisible();
  const total = await shots.count();
  expect(total).toBeGreaterThanOrEqual(3);

  await shots.first().click();
  const lb = page.locator('.lightbox');
  await expect(lb).toBeVisible();

  const counter = page.locator('.lb-count');
  await expect(counter).toHaveText(`1 of ${total}`);

  await page.keyboard.press('ArrowRight');
  await expect(counter).toHaveText(`2 of ${total}`);

  await page.keyboard.press('End');
  await expect(counter).toHaveText(`${total} of ${total}`);

  // wraps around off the end, and back off the front
  await page.keyboard.press('ArrowRight');
  await expect(counter).toHaveText(`1 of ${total}`);
  await page.keyboard.press('ArrowLeft');
  await expect(counter).toHaveText(`${total} of ${total}`);
  await page.keyboard.press('Home');
  await expect(counter).toHaveText(`1 of ${total}`);

  await page.keyboard.press('Escape');
  await expect(lb).toHaveCount(0);
});

test('Quick Look closes on a backdrop click without closing on the photo', async ({ page, isMobile }) => {
  await seedDemoWorld(page);
  await page.goto('/');
  await addPhotos(page);
  if (isMobile) await page.locator('.conv-row, .pinned-item').first().click();

  await page.locator('.bubble img, .att-image img').first().click();
  const lb = page.locator('.lightbox');
  await expect(lb).toBeVisible();

  await lb.locator('.lb-figure img').click();
  await expect(lb).toBeVisible();

  // the top bar and the nav arrows swallow their own clicks, so aim at a
  // genuinely empty corner of the backdrop
  const box = (await lb.boundingBox())!;
  await lb.click({ position: { x: 6, y: box.height - 6 } });
  await expect(lb).toHaveCount(0);
});
