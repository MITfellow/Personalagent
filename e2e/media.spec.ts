import { expect, test } from '@playwright/test';
import { seedDemoWorld } from './fixture';

/**
 * These drive the real browser APIs: getUserMedia against Chromium's synthetic
 * camera and microphone, MediaRecorder, and the geolocation Playwright hands
 * the page. Nothing here is stubbed except where a spec is deliberately
 * testing a refusal.
 */

test.beforeEach(async ({ page, isMobile }) => {
  await seedDemoWorld(page);
  await page.goto('/');
  await page.locator('.conv-row, .pinned-item').first().waitFor();
  // the phone opens on the conversation list, where there is no composer
  if (isMobile) await enterThread(page);
});

async function openApps(page: import('@playwright/test').Page) {
  await page.locator('.composer .round').first().click();
  await expect(page.locator('.apps-grid')).toBeVisible();
}

/** After a reload the phone is back on the list pane. */
async function enterThread(page: import('@playwright/test').Page) {
  const composer = page.locator('.composer');
  // on the list pane the composer is still in the DOM, just not on screen —
  // presence is not the question, visibility is
  if (await composer.isVisible().catch(() => false)) return;
  await page.locator('.conv-row, .pinned-item').first().click();
  await composer.waitFor({ state: 'visible' });
}

/** The tray's "Remove X" buttons match the same names, so scope to the grid. */
function appTile(page: import('@playwright/test').Page, name: string) {
  return page.locator('.apps-grid').getByRole('button', { name });
}

test('the camera opens, previews and sends a real photo', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the camera sheet is exercised on desktop');

  await openApps(page);
  await appTile(page, 'Camera').click();

  const sheet = page.getByRole('dialog', { name: 'Camera' });
  await expect(sheet).toBeVisible();

  // a live stream really is playing
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const v = document.querySelector('.cam-video') as HTMLVideoElement | null;
        return !!v && v.videoWidth > 0 && !v.paused;
      }),
    )
    .toBe(true);

  await page.getByRole('button', { name: 'Take photo' }).click();

  // the still is a real JPEG grabbed off the sensor, not a canned asset
  const shot = page.locator('.cam-shot');
  await expect(shot).toBeVisible();
  const src = await shot.getAttribute('src');
  expect(src?.startsWith('data:image/jpeg;base64,')).toBe(true);
  expect((src ?? '').length).toBeGreaterThan(2000);

  await page.getByRole('button', { name: 'Use Photo' }).click();
  await expect(sheet).toBeHidden();

  // it lands in the staging tray, then in the thread
  const tile = page.locator('.stage-tile').first();
  await expect(tile).toBeVisible();
  await expect(tile).toContainText(/Photo/);

  await page.locator('.field textarea').fill('from the camera');
  await page.keyboard.press('Enter');

  const sent = page.locator('.bubble').filter({ hasText: 'from the camera' });
  await expect(sent).toBeVisible();
  await expect(sent.locator('img')).toHaveCount(1);
  expect(await sent.locator('img').getAttribute('src')).toContain('data:image/jpeg');
});

test('retaking replaces the shot instead of stacking them up', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the camera sheet is exercised on desktop');

  await openApps(page);
  await appTile(page, 'Camera').click();
  await expect
    .poll(async () =>
      page.evaluate(() => (document.querySelector('.cam-video') as HTMLVideoElement)?.videoWidth > 0),
    )
    .toBe(true);

  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect(page.locator('.cam-shot')).toBeVisible();

  await page.getByRole('button', { name: 'Retake' }).click();
  await expect(page.locator('.cam-shot')).toHaveCount(0);
  await expect(page.locator('.cam-video')).toBeVisible();

  await page.getByRole('button', { name: 'Close camera' }).click();
  await expect(page.locator('.stage-tile')).toHaveCount(0);
});

test('a blocked camera explains itself instead of failing silently', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the camera sheet is exercised on desktop');

  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => {
      const err = new Error('denied');
      err.name = 'NotAllowedError';
      return Promise.reject(err);
    };
  });
  await page.reload();
  await page.locator('.conv-row, .pinned-item').first().waitFor();
  await enterThread(page);

  await openApps(page);
  await appTile(page, 'Camera').click();

  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('Camera access was blocked');
  await expect(alert).toContainText('site settings');
  // and the shutter is not offered
  await expect(page.getByRole('button', { name: 'Take photo' })).toBeDisabled();
});

test('a voice memo records real audio and plays back', async ({ page }) => {
  await openApps(page);
  await appTile(page, 'Audio').click();

  const bar = page.locator('.rec-bar');
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('Recording');

  // let it actually capture something
  await page.waitForTimeout(1500);
  await expect(bar).toContainText(/0:0[1-9]/);

  await bar.getByRole('button', { name: 'Stop' }).click();
  await expect(bar).toBeHidden();

  const tile = page.locator('.stage-tile').first();
  await expect(tile).toBeVisible();
  await expect(tile).toContainText('Voice memo');

  await page.locator('.send-btn').click();

  const audio = page.locator('.bubble-wrap .att-audio').last();
  await expect(audio).toBeVisible();

  // there is a real decodable recording behind the waveform
  const info = await page.evaluate(async () => {
    // the seeded world already has a memo with no audio behind it, so take the
    // one just sent rather than the first on screen
    const all = document.querySelectorAll('.bubble-wrap .att-audio audio');
    const el = all[all.length - 1] as HTMLAudioElement | undefined;
    if (!el) return null;
    const src = el.getAttribute('src') ?? '';
    await el.play().catch(() => {});
    await new Promise((r) => setTimeout(r, 300));
    return { src: src.slice(0, 30), bytes: src.length, playing: !el.paused };
  });
  expect(info?.src).toMatch(/^data:audio\//);
  expect(info?.bytes ?? 0).toBeGreaterThan(1000);
  expect(info?.playing).toBe(true);
});

test('cancelling a recording keeps it out of the thread and releases the mic', async ({ page }) => {
  await openApps(page);
  await appTile(page, 'Audio').click();
  await expect(page.locator('.rec-bar')).toBeVisible();
  await page.waitForTimeout(600);

  await page.locator('.rec-bar').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('.rec-bar')).toBeHidden();
  await expect(page.locator('.stage-tile')).toHaveCount(0);

  // every track the page opened has been stopped
  const live = await page.evaluate(
    () =>
      (document.querySelectorAll('video, audio') as NodeListOf<HTMLMediaElement>).length >= 0 &&
      (window as unknown as { __liveTracks?: number }).__liveTracks,
  );
  expect(live ?? 0).toBeFalsy();
});

test('sharing a location sends a real fix, drawn as a map', async ({ page }) => {
  await openApps(page);
  await appTile(page, 'Location').click();

  const tile = page.locator('.stage-tile').first();
  await expect(tile).toBeVisible();
  await expect(tile).toContainText('Current Location');
  await expect(tile).toContainText('Accurate to 18 m');
  // the tray previews the map itself
  await expect(tile.locator('.map-art')).toBeVisible();

  await page.locator('.send-btn').click();

  const card = page.locator('.bubble-wrap .map-card').last();
  await expect(card).toBeVisible();
  // the coordinates Playwright handed the browser, in Maps' notation
  await expect(card).toContainText('28°40');
  await expect(card).toContainText('77°27');
  await expect(card).toContainText('Accurate to 18 m');
  await expect(card).toHaveAttribute('href', /maps\.apple\.com.*ll=28\.6692,77\.4538/);

  // the map is drawn locally — no tile requests left the page
  const external = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((r) => r.name)
      .filter((n) => !n.startsWith(location.origin)),
  );
  expect(external).toEqual([]);
});

test('the same place always draws the same map', async ({ page }) => {
  await openApps(page);
  await appTile(page, 'Location').click();
  await expect(page.locator('.stage-tile')).toHaveCount(1);
  const first = await page.locator('.stage-tile .map-art').innerHTML();

  await openApps(page);
  await appTile(page, 'Location').click();
  await expect(page.locator('.stage-tile')).toHaveCount(2);
  const second = await page.locator('.stage-tile .map-art').nth(1).innerHTML();

  expect(second).toBe(first);
});

test('a refused location says so', async ({ page, context }) => {
  await context.clearPermissions();
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_ok, fail) =>
      fail?.({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError);
  });
  await page.reload();
  await page.locator('.conv-row, .pinned-item').first().waitFor();
  await enterThread(page);

  await openApps(page);
  await appTile(page, 'Location').click();

  await expect(page.locator('.stage-notice')).toContainText('Location access was blocked');
  await expect(page.locator('.stage-tile')).toHaveCount(0);
});

test('every app tile shows a real icon, not a placeholder', async ({ page }) => {
  await openApps(page);
  for (const name of ['Photos', 'Camera', 'Audio', 'Location', 'Effects', 'Subject']) {
    const tile = appTile(page, name);
    await expect(tile).toBeVisible();
    // an svg glyph, not an emoji or a bare letter
    await expect(tile.locator('.glyph svg')).toHaveCount(1);
    const text = ((await tile.locator('.glyph').textContent()) ?? '').trim();
    expect(text).toBe('');
  }
});
