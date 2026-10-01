import { expect, test } from '@playwright/test';
import { seedDemoWorld } from './fixture';

test.beforeEach(async ({ page, isMobile }) => {
  await seedDemoWorld(page);
  await page.goto('/');
  await page.waitForTimeout(400);
  // the phone layout opens on the list, so drill into a thread first
  if (isMobile) {
    await page.locator('.conv-row, .pinned-item').first().click();
    await page.waitForTimeout(400);
  }
});

test('bubble tails paint behind the text, never over the last glyph', async ({ page }) => {
  const tails = page.locator('.bubble.tail');
  await expect(tails.first()).toBeVisible();
  const z = await tails.evaluateAll((els) =>
    els.map((el) => [
      getComputedStyle(el, '::before').zIndex,
      getComputedStyle(el, '::after').zIndex,
    ]),
  );
  // the wedge reaches ~15px back into the bubble; at any z-index above the text
  // it shaves the descenders/right edge of the final character
  expect(z.every(([a, b]) => a === '-1' && b === '-1')).toBe(true);
});

test('no text is clipped by its own box', async ({ page }) => {
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.bubble, .conv-row *, .hit-row *')]
      .filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') return false;
        if (/auto|scroll/.test(cs.overflowX)) return false;
        return el.children.length === 0 && !!el.textContent?.trim() && el.scrollWidth > el.clientWidth + 1;
      })
      .map((el) => `${el.className}: ${el.textContent?.slice(0, 30)}`),
  );
  expect(clipped).toEqual([]);
});

test('popovers stay inside the window even when anchored at the edge', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the emoji popover is a pointer affordance');
  await page.locator('.composer .round').last().click();
  const pop = page.locator('.pop');
  await expect(pop).toBeVisible();
  await page.waitForTimeout(400); // let the open animation finish
  const box = (await pop.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
});

test('a reply quote hugs its text instead of stretching the column', async ({ page }) => {
  const quote = page.locator('.reply-quote').first();
  await expect(quote).toBeVisible();
  const ratio = await quote.evaluate((el) => {
    const stack = el.closest('.stack') as HTMLElement;
    return el.getBoundingClientRect().width / stack.getBoundingClientRect().width;
  });
  expect(ratio).toBeLessThan(0.98);
});

test('elevated surfaces are distinguishable from the sidebar in dark mode', async ({ page }) => {
  await page.evaluate(() => {
    const k = 'messages.app.state';
    const env = JSON.parse(localStorage.getItem(k)!);
    env.state.settings.theme = 'dark';
    localStorage.setItem(k, JSON.stringify(env));
  });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const [elevated, sidebar] = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return [cs.getPropertyValue('--bg-elevated').trim(), cs.getPropertyValue('--bg-sidebar').trim()];
  });
  expect(elevated).not.toBe(sidebar);
});
