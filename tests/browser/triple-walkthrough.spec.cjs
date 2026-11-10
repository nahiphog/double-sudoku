const {test,expect}=require('@playwright/test');
const triple=require('../../triple-sudoku.js');
test('walkthrough previews, applies, undoes and restarts deductions without editing play',async({page})=>{
  const solution=triple.completedGrid(()=>0.5),puzzle=solution.slice();puzzle[0]=0;
  const notes=Array.from({length:81},()=>[]);notes[0]=[2];
  const saved={puzzle,solution,values:puzzle.slice(),notes};
  await page.addInitScript(saved=>localStorage.setItem('triple-sudoku-progress-v1',JSON.stringify(saved)),saved);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
  await page.goto('/triple.html?route=walkthrough');
  await expect(page.locator('#walkStart')).toBeEnabled();
  await page.locator('#walkStart').click();
  await expect(page.locator('.walk-cell')).toHaveCount(81);
  await page.locator('#walkNext').click();
  await expect(page.locator('#walkTechnique')).toHaveText('Completed digit count');
  await expect(page.locator('.walk-remove')).toHaveCount(1);
  await expect(page.locator('.walk-support')).toHaveCount(3);
  await expect(page.locator('#walkCount')).toContainText('0 steps applied');
  await expect(page.locator('#walkNext')).toBeDisabled();
  await page.setViewportSize({width:320,height:568});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#walkthrough').screenshot({path:'test-results/triple-walkthrough.png'});
  await page.locator('#walkApply').click();
  await expect(page.locator('#walkCount')).toContainText('1 steps applied');
  await page.locator('#walkUndo').click();
  await expect(page.locator('#walkCount')).toContainText('0 steps applied');
  await expect(page.locator('.walk-cell').first()).toHaveText('123');
  for(let step=0;step<3;step++) {
    await page.locator('#walkNext').click();await expect(page.locator('#walkApply')).toBeEnabled();
    await page.locator('#walkApply').click();
  }
  await expect(page.locator('#walkTechnique')).toHaveText('Solved');
  await expect(page.locator('#walkCount')).toContainText('81 of 81');
  await expect(page.locator('#walkSteps li')).toHaveCount(3);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('triple-sudoku-progress-v1')))).toEqual(saved);
  await expect(page.locator('#grid .cell').first()).toHaveClass(/pencil/);
  await page.locator('#walkStart').click();
  await expect(page.locator('#walkCount')).toContainText('0 steps applied');
  await expect(page.locator('#walkSteps li')).toHaveCount(0);
  await page.locator('#walkNext').click();
  await page.locator('[data-nav="play"]').click();
  await expect(page.locator('#grid')).toHaveAttribute('aria-busy','false');
  await page.locator('#newPuzzle').click();
  await expect(page.locator('#grid')).toHaveAttribute('aria-busy','false');
  await page.locator('[data-nav="walkthrough"]').click();
  await expect(page.locator('#walkContent')).toBeHidden();
  expect(errors).toEqual([]);
});

test('walkthrough reports worker failure and permits retry',async({page})=>{
  await page.goto('/triple.html?route=walkthrough');await expect(page.locator('#walkStart')).toBeEnabled();
  await page.locator('#walkStart').click();
  await page.route('**/triple-hint-worker.js',route=>route.abort());
  await page.locator('#walkNext').click();
  await expect(page.locator('#walkExplanation')).toContainText('Could not load');
  await expect(page.locator('#walkNext')).toBeEnabled();
  await expect(page.locator('#walkApply')).toBeDisabled();
});
