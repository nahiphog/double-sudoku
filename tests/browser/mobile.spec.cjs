const { test, expect } = require('@playwright/test');
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
  await page.locator('[data-nav="generate"]').click();
  await page.locator('[data-nav="play"]').click();
  await expect(page.locator('[data-play-cell="1"]')).toHaveText('3');
  await page.locator('#clearPlay').click();
  await page.reload();
  await expect(page.locator('[data-play-cell="0"]')).toHaveText('1');
  await expect(page.locator('[data-play-cell="1"]')).toHaveText('');
  await expect(page.locator('[data-play-cell="2"]')).toHaveText('');
});

test('remaining navigation and mobile layout work',async({page})=>{const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.locator('body')).toHaveAttribute('data-page','generate');for(const route of ['generate','build','simulation','verify','play']){await page.locator('[data-nav='+route+']').click();await expect(page.locator('body')).toHaveAttribute('data-page',route);}await page.locator('[data-nav=techniques]').click();await expect(page).toHaveURL(/techniques.html$/);await expect(page.locator('[data-nav=daily], [data-nav=archive]')).toHaveCount(0);await page.setViewportSize({width:320,height:568});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);});
