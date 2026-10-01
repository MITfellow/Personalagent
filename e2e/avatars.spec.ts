import { expect, test } from '@playwright/test';
import { seedDemoWorld } from './fixture';

test.beforeEach(async ({ page }) => {
  await seedDemoWorld(page);
});

async function openSettings(page: import('@playwright/test').Page, isMobile: boolean) {
  await page.goto('/');
  // on mobile the sidebar toolbar only exists in the list pane, and the seeded
  // world opens straight into a thread — close it so the list is showing
  if (isMobile) {
    await page.evaluate(() => {
      const raw = localStorage.getItem('messages.app.state');
      if (!raw) return;
      const env = JSON.parse(raw);
      env.state.activeChatId = null;
      localStorage.setItem('messages.app.state', JSON.stringify(env));
    });
    await page.reload();
  }
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('.me-card')).toBeVisible();
}

test('I can pick my own Memoji and it sticks across a reload', async ({ page, isMobile }) => {
  await openSettings(page, isMobile);
  await page.locator('.me-card').click();

  const tiles = page.locator('.modal .memoji-tile');
  await expect(tiles).toHaveCount(12);
  await expect(page.locator('.modal .memoji-tile.selected')).toHaveCount(0);

  const chosen = tiles.nth(3);
  const name = (await chosen.getAttribute('aria-label')) ?? '';
  await chosen.click();

  await expect(page.locator('.modal .memoji-tile.selected')).toHaveCount(1);
  await expect(page.locator('.modal .memoji-tile.selected')).toHaveAttribute('aria-label', name);
  await expect(page.locator('.me-card svg')).toBeVisible();

  // persistence is debounced; wait for the write before cycling the page
  await page.waitForFunction(
    (label) => {
      const raw = localStorage.getItem('messages.app.state');
      return !!raw && typeof JSON.parse(raw)?.state?.me?.avatar === 'string' && !!label;
    },
    name,
    { timeout: 5000 },
  );
  await page.reload();
  await openSettings(page, isMobile);
  await expect(page.locator('.me-card svg')).toBeVisible();
  await page.locator('.me-card').click();
  await expect(page.locator('.modal .memoji-tile.selected')).toHaveAttribute('aria-label', name);
});

test('a contact Memoji replaces their initials everywhere at once', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the details panel is desktop-only');
  await page.goto('/');
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('messages.app.state') as string);
    raw.state.settings.showDetails = true;
    localStorage.setItem('messages.app.state', JSON.stringify(raw));
  });
  await page.reload();

  const details = page.locator('.details');
  if (!(await details.count())) test.skip(true, 'details panel is hidden on this viewport');

  const hero = page.locator('.hero-avatar');
  await expect(hero).toBeVisible();
  await expect(hero.locator('svg')).toHaveCount(0); // initials to begin with

  await hero.click();
  const tiles = page.locator('.details .memoji-tile');
  await expect(tiles).toHaveCount(12);
  await tiles.nth(2).click();

  // the grid closes and the character now renders in the hero and the sidebar
  await expect(page.locator('.details .memoji-grid')).toHaveCount(0);
  await expect(hero.locator('svg')).toHaveCount(1);
  await expect(page.locator('.sidebar svg').first()).toBeVisible();

  // and it can be taken back off
  await hero.click();
  await page.locator('.memoji-clear').click();
  await expect(hero.locator('svg')).toHaveCount(0);
});
