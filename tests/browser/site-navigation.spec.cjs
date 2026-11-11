const {test,expect}=require('@playwright/test');
const triple=require('../../triple-sudoku.js');
const pages=['generate','build','simulation','verify','play','walkthrough','techniques'];
test('all shared subpages preserve their section when toggling variants',async({page})=>{
  test.setTimeout(90000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
  await page.goto('/');
  for(const section of pages){
    await page.locator(`[data-nav="${section}"]`).click();
    await expect(page.locator('html')).toHaveAttribute('data-section',section);
    const labels=await page.locator('.site-tabs a').allTextContents();
    await page.locator('.variant-toggle [data-variant="triple"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-variant','triple');
    await expect(page.locator('html')).toHaveAttribute('data-section',section);
    expect(await page.locator('.site-tabs a').allTextContents()).toEqual(labels);
    await expect(page.locator(`.site-tabs [data-nav="${section}"]`)).toHaveAttribute('aria-current','page');
    if(section==='simulation') {await expect(page.locator('#simulation')).toBeVisible();await expect(page.locator('#playControls')).toBeHidden();await expect(page.locator('#walkthrough')).toBeHidden();}
    if(section==='verify')await expect(page.locator('#tripleVerify')).toBeVisible();
    if(section==='generate')await expect(page.locator('#generatePage')).toBeVisible();
    if(section==='walkthrough')await expect(page.locator('#walkthrough')).toBeVisible();
    await page.setViewportSize({width:320,height:568});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('.variant-toggle [data-variant="double"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-variant','double');
    await expect(page.locator('html')).toHaveAttribute('data-section',section);
  }
  expect(errors).toEqual([]);
});
test('Triple verify distinguishes solutions and imported play survives variant toggles',async({page})=>{
  const solution=triple.completedGrid(()=>0.5),puzzle='.'+solution.slice(1).join('');
  await page.goto('/triple.html?route=verify');
  await page.locator('#tripleVerifyInput').fill('invalid');await page.locator('#tripleVerifyButton').click();await expect(page.locator('#tripleVerifyStatus')).toContainText('exactly 81');
  await page.locator('#tripleVerifyInput').fill('1111'+'.'.repeat(77));await page.locator('#tripleVerifyButton').click();await expect(page.locator('#tripleVerifyStatus')).toContainText('no solution');
  await page.locator('#tripleVerifyInput').fill('.'.repeat(81));await page.locator('#tripleVerifyButton').click();await expect(page.locator('#tripleVerifyStatus')).toContainText('multiple solutions');await expect(page.locator('#tripleVerifyOutput article')).toHaveCount(2);
  await page.locator('#tripleVerifyInput').fill(puzzle);await page.locator('#tripleVerifyButton').click();await expect(page.locator('#tripleVerifyStatus')).toHaveText('Unique solution verified.');
  await page.locator('[data-nav="play"]').click();await expect(page.locator('#grid')).toHaveAttribute('aria-busy','false');
  await page.locator('#triplePlayInput').fill(puzzle);await page.locator('#loadTriplePlay').click();await expect(page.locator('#loadTripleStatus')).toHaveText('Unique solution verified.');
  await expect(page.locator('#grid .given')).toHaveCount(80);
  await page.locator('.variant-toggle [data-variant="double"]').click();await page.locator('.variant-toggle [data-variant="triple"]').click();await expect(page.locator('#grid .given')).toHaveCount(80);
});
test('Generate uses pair-only mode and opens the same puzzle in Play or Walkthrough',async({page})=>{
  test.setTimeout(60000);
  await page.goto('/triple.html?route=generate');await expect(page.locator('#generatePlay')).toBeEnabled();
  await page.locator('#generateMode').selectOption('dual');await page.locator('#generateNew').click();
  await expect(page.locator('#generateStatus')).toContainText('pairs only',{timeout:30000});
  const puzzle=await page.locator('#generateOutput .simulation-puzzle-string').inputValue();
  expect((puzzle.match(/\./g)||[]).length%2).toBe(0);
  await page.locator('#generateWalkthrough').click();await expect(page.locator('#walkStart')).toBeEnabled();await page.locator('#walkStart').click();
  await expect(page.locator('.walk-given')).toHaveCount(puzzle.replaceAll('.','').length);
  await page.locator('[data-nav="generate"]').click();await expect(page.locator('#generatePlay')).toBeEnabled();await page.locator('#generatePlay').click();
  await expect(page.locator('#grid .given')).toHaveCount(puzzle.replaceAll('.','').length);
});
test('legacy Triple section links still resolve to the corresponding page',async({page})=>{
  for(const section of ['simulation','walkthrough']){await page.goto('/triple.html#'+section);await expect(page.locator('html')).toHaveAttribute('data-section',section);await expect(page.locator('#'+section)).toBeVisible();}
});
