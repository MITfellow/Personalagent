import { expect, test } from '@playwright/test';
import { seedDemoWorld } from './fixture';

test.beforeEach(async ({ page }) => {
  await seedDemoWorld(page);
});

/**
 * The account used to live in localStorage, which caps out around 5 MB. Past
 * that the app either dropped photos to make room or failed to save at all and
 * booted empty. These specs pin down that the ceiling is gone.
 */
test('an account far larger than the localStorage ceiling survives a reload', async ({ page }) => {
  await page.goto('/');
  await page.locator('.conv-row, .pinned-item').first().waitFor();

  const { bytes, chatId } = await page.evaluate(async () => {
    const env = (await window.__store.read())!;
    const s = env.state;
    const chatId = s.chats[0].id;
    s.activeChatId = chatId;

    // 12 photos of ~700 KB each: ~8 MB, comfortably past the old limit
    const big =
      'data:image/png;base64,' +
      'iVBORw0KGgoAAAANSUhEUg'.repeat(32_000);
    for (let i = 0; i < 12; i++) {
      s.messages.push({
        id: `huge-${i}`,
        chatId,
        authorId: 'me',
        text: `photo ${i}`,
        at: Date.now() - (12 - i) * 1000,
        status: 'read',
        attachments: [{ kind: 'image', src: big, name: `huge-${i}.png`, width: 40, height: 30 }],
        reactions: [],
        bubbleEffect: 'none',
        screenEffect: 'none',
      });
    }
    await window.__store.write(env);
    return { bytes: JSON.stringify(env).length, chatId };
  });

  expect(bytes).toBeGreaterThan(5 * 1024 * 1024);

  await page.reload();
  await page.locator('.conv-row, .pinned-item').first().waitFor();

  const after = await page.evaluate(async () => {
    const env = (await window.__store.read())!;
    const kept = (env.state.messages as Array<{ id: string; attachments: Array<{ src?: string; name?: string }> }>)
      .filter((m) => m.id.startsWith('huge-'));
    return {
      count: kept.length,
      // the old quota handler replaced dropped photos with this placeholder
      freed: kept.filter((m) => m.attachments[0]?.name?.includes('freed')).length,
      withImage: kept.filter((m) => (m.attachments[0]?.src ?? '').startsWith('data:image')).length,
      chats: env.state.chats.length,
    };
  });

  expect(after.chats).toBeGreaterThan(0); // it did not boot empty
  expect(after.count).toBe(12);
  expect(after.freed).toBe(0); // nothing was deleted to save space
  expect(after.withImage).toBe(12);
  expect(chatId).toBeTruthy();
});

test('a payload that size genuinely does not fit in localStorage', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    try {
      localStorage.setItem('quota-probe', 'x'.repeat(8 * 1024 * 1024));
      localStorage.removeItem('quota-probe');
      return 'fits';
    } catch {
      return 'rejected';
    }
  });
  // this is why the store moved: the same account in localStorage is refused
  expect(result).toBe('rejected');
});

test('an existing localStorage account is migrated into the database', async ({ page }) => {
  await page.goto('/');
  await page.locator('.conv-row, .pinned-item').first().waitFor();

  // the fixture seeds localStorage the way an older build left it behind; once
  // the app has booted, the legacy copy is gone and the data is in the database
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem('messages.app.state')))
    .toBeNull();

  const inDb = await page.evaluate(
    async () =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open('messages', 1);
        req.onsuccess = () => {
          const tx = req.result.transaction('app', 'readonly');
          const get = tx.objectStore('app').get('state');
          get.onsuccess = () => resolve((get.result?.state?.messages ?? []).length);
          get.onerror = () => resolve(-1);
        };
        req.onerror = () => resolve(-1);
      }),
  );
  expect(inDb).toBeGreaterThan(0);
});
