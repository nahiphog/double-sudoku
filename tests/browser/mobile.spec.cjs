const { test, expect } = require('@playwright/test');

test('bundled navigation, archive and techniques work without server rewrites', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(r.url()); });
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-page', 'daily');
  for (const route of ['generate', 'build', 'simulation', 'verify', 'play', 'archive']) {
    await page.locator(`[data-nav="${route}"]`).click();
    await expect(page.locator('body')).toHaveAttribute('data-page', route);
  }
  await page.locator('[data-daily-date="2026-09-01"]').click();
  await expect(page.locator('[data-daily-entry-grid="2026-09-01"]')).toBeVisible();
  await page.locator('#archivePage').getByRole('link', { name: 'Learn all solving techniques' }).click();
  await expect(page).toHaveURL(/techniques.html$/);
  await page.getByRole('link', { name: 'Daily', exact: true }).first().click();
  await expect(page.locator('body')).toHaveAttribute('data-page', 'daily');
  expect(errors).toEqual([]);
});

test('custom entries and notes survive reload, navigation and clear', async ({ page }) => {
  await page.goto('/index.html?route=play');
  await page.locator('#playInput').fill('1' + '.'.repeat(63));
  await page.locator('#loadPlay').click();
  await page.locator('[data-play-digit="3"]').click();
  await page.locator('[data-play-cell="1"]').click();
  await page.locator('[data-play-mode="note"]').click();
  await page.locator('[data-play-digit="2"]').click();
  await page.locator('[data-play-cell="2"]').click();
  await page.reload();
  await expect(page.locator('[data-play-cell="0"]')).toHaveText('1');
  await expect(page.locator('[data-play-cell="1"]')).toHaveText('3');
  await expect(page.locator('[data-play-cell="2"]')).toHaveText('2');
  await page.locator('[data-nav="daily"]').click();
  await page.locator('[data-nav="play"]').click();
  await expect(page.locator('[data-play-cell="1"]')).toHaveText('3');
  await page.locator('#clearPlay').click();
  await page.reload();
  await expect(page.locator('[data-play-cell="0"]')).toHaveText('1');
  await expect(page.locator('[data-play-cell="1"]')).toHaveText('');
  await expect(page.locator('[data-play-cell="2"]')).toHaveText('');
});

test('archive saves survive restart and remain separate by date', async ({ page }) => {
  await page.goto('/index.html?route=archive/2026/09/01');
  const cell = page.locator('#archivePage .daily-edit-cell').first();
  const index = await cell.getAttribute('data-daily-entry');
  await page.locator('#archivePage [data-daily-entry-digit="4"]').click();
  await cell.click();
  await page.reload();
  await expect(page.locator(`#archivePage [data-daily-entry="${index}"]`)).toHaveText('4');
  await page.locator('.archive-back').click();
  await page.locator('[data-daily-date="2026-09-02"]').click();
  await expect(page.locator('[data-daily-entry-grid="2026-09-02"]')).toBeVisible();
  await page.goto('/index.html?route=archive/2026/09/01');
  await expect(page.locator(`#archivePage [data-daily-entry="${index}"]`)).toHaveText('4');
});

test('small iPhone layout fits and bundled assets never request the internet', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const remote = [];
  await page.route('**/*', route => {
    if (!route.request().url().startsWith('http://127.0.0.1:4173/')) { remote.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  for (const route of ['daily', 'play', 'archive', 'generate', 'build', 'verify']) {
    await page.goto('/index.html?route=' + route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(remote).toEqual([]);
  await page.goto('/index.html?route=daily');
  const grid = await page.locator('#dailyPage [data-daily-entry-grid]').boundingBox();
  expect(Math.abs(grid.width - grid.height)).toBeLessThan(2);
  await page.screenshot({ path: 'test-results/iphone-daily.png', fullPage: true });
});

test('daily pencil notes and hint placements are saved', async ({ page }) => {
  await page.goto('/index.html?route=daily');
  const cell = page.locator('#dailyPage .daily-edit-cell').first();
  const index = await cell.getAttribute('data-daily-entry');
  await page.locator('#dailyPage [data-daily-entry-mode="note"]').click();
  await page.locator('#dailyPage [data-daily-entry-digit="2"]').click();
  await cell.click();
  await page.reload();
  await expect(page.locator(`#dailyPage [data-daily-entry="${index}"] .notes`)).toHaveText('2');
  await page.goto('/index.html?route=play');
  const base = await page.evaluate(() => base.slice());
  // A single missing digit makes the hint deterministic and checks actual placement persistence.
  await page.locator('#playInput').fill('.' + base.slice(1).join(''));
  await page.locator('#loadPlay').click();
  await page.locator('#playPage [data-hint-next]').click();
  await page.locator('#playPage [data-hint-apply]').click();
  await page.reload();
  await expect(page.locator('[data-play-cell="0"]')).toHaveText(String(base[0]));
});
