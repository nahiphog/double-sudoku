const { test, expect } = require('@playwright/test');
test('custom build exact pattern, stop, copy controls, play handoff and dual generation', async ({ page }) => {
  test.setTimeout(60000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
  await page.goto('/triple.html');
  await page.getByRole('link',{name:'Custom build'}).click();
  await expect(page).toHaveURL(/triple-build.html$/);
  await page.locator('#buildPuzzle').click();
  await expect(page.locator('#buildStatus')).toContainText('Select at least one');
  await page.locator('#selectAll').click();
  await page.locator('[data-index="0"]').click();
  await page.locator('#buildPuzzle').click();
  await expect(page.locator('#buildStatus')).toContainText('exactly 80 givens');
  const puzzle=await page.locator('.simulation-puzzle-string').inputValue();
  expect(puzzle).toMatch(/^\.[1-3]{80}$/);
  await expect(page.locator('[data-copy-format]')).toHaveCount(4);
  await page.setViewportSize({width:320,height:568});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/triple-builder-mobile.png',fullPage:true});
  await page.locator('#playBuilt').click();
  await expect(page).toHaveURL(/triple.html$/);
  await expect(page.locator('#grid .given')).toHaveCount(80);
  await page.locator('#digMode').selectOption('dual');
  await page.locator('#newPuzzle').click();
  await expect(page.locator('#grid')).toHaveAttribute('aria-busy','false',{timeout:30000});
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('triple-sudoku-progress-v1')).mode)).toBe('dual');
  await page.locator('#simulationTrials').fill('1');
  await page.locator('#simulationThreshold').fill('81');
  await page.locator('#simulationDigMode').selectOption('dual');
  await page.locator('#simulationRun').click();
  await expect(page.locator('#simulationStatus')).toHaveText('Simulation complete: 1 of 1 trials.',{timeout:30000});
  await expect(page.locator('.simulation-example')).toHaveCount(1);
  await page.getByRole('link',{name:'Custom build'}).click();
  await page.locator('[data-index="0"]').click();
  await page.locator('#buildPuzzle').click();
  await expect(page.locator('#stopBuild')).toBeEnabled();
  await page.locator('#stopBuild').click();
  await expect(page.locator('#buildStatus')).toContainText('Search stopped');
  await expect(page.locator('#buildPuzzle')).toBeEnabled();
  await page.locator('#clearSelection').click();
  await expect(page.locator('#selectionCount')).toHaveText('0 cells selected');
  expect(errors).toEqual([]);
});
test('Triple Sudoku navigation, play, notes, persistence, reveal and mobile layout', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
  await page.goto('/');
  await page.getByRole('link', { name: 'Triple Sudoku', exact: true }).click();
  await expect(page).toHaveURL(/triple.html$/);
  await expect(page.locator('#status')).toContainText('unique solution');
  await expect(page.locator('.cell')).toHaveCount(81);
  const cell = page.locator('.cell:not(.given)').first();
  const index = await cell.getAttribute('data-cell');
  await cell.focus();
  await page.keyboard.press('2');
  await expect(cell).toHaveText('2');
  await page.reload();
  await expect(page.locator(`[data-cell="${index}"]`)).toHaveText('2');
  await page.locator('#reset').click();
  await expect(cell).toHaveText('');
  await page.locator('#notes').click();
  await cell.click();
  await expect(cell).toHaveText('1');
  await expect(cell).toHaveClass(/pencil/);
  await page.locator('#reveal').click();
  await expect(page.locator('#status')).toContainText('Solution shown');
  await page.locator('#reveal').click();
  await expect(cell).toHaveClass(/pencil/);
  await page.setViewportSize({ width: 320, height: 568 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/triple-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'Double Sudoku' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-page', 'daily');
  expect(errors).toEqual([]);
});

test('simulation reports completed samples, stops, restarts and preserves play', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
  await page.goto('/triple.html');
  await expect(page.locator('#grid')).toHaveAttribute('aria-busy', 'false');
  const originalGrid = await page.locator('#grid').textContent();
  await page.locator('#simulationThreshold').fill('81');
  await page.locator('#simulationTrials').fill('8');
  await page.locator('#simulationRun').click();
  await expect(page.locator('#simulationStatus')).toHaveText('Simulation complete: 8 of 8 trials.');
  const distribution = await page.locator('.simulation-bar-row').evaluateAll(rows => rows.map(row => ({ clues: Number(row.dataset.clues), count: Number(row.dataset.count) })));
  expect(distribution.reduce((sum, row) => sum + row.count, 0)).toBe(8);
  const mean = distribution.reduce((sum, row) => sum + row.clues * row.count, 0) / 8;
  await expect(page.locator('#simulationSummary')).toContainText(`mean ${mean.toFixed(2)} clues`);
  await expect(page.locator('#simulationProgress')).toHaveAttribute('value', '8');
  const puzzle = await page.locator('.simulation-puzzle-string').first().inputValue();
  expect(puzzle).toMatch(/^[1-3.]{81}$/);
  const verification = await page.evaluate(puzzleString => {
    const puzzle = [...puzzleString].map(c => c === '.' ? 0 : Number(c));
    return { unique: TripleSudoku.solve(puzzle).count === 1, minimal: puzzle.every((n, i) => {
      if (!n) return true;
      const removed = puzzle.slice(); removed[i] = 0;
      return TripleSudoku.solve(removed).count === 2;
    }) };
  }, puzzle);
  expect(verification).toEqual({ unique: true, minimal: true });
  await expect(page.locator('.simulation-example')).toHaveCount(8);
  const pairs = await page.locator('.simulation-example').evaluateAll(examples => examples.map(example => ({
    puzzle: example.querySelector('.simulation-puzzle-string').value,
    solution: example.querySelector('.simulation-solution-string').value,
  })));
  expect(await page.evaluate(pairs => pairs.every(({puzzle, solution}) => {
    const values = [...solution].map(Number);
    return values.length === 81 && values.every(n => n >= 1 && n <= 3) && !TripleSudoku.conflicts(values).size &&
      [...puzzle].every((n, i) => n === '.' || n === solution[i]);
  }), pairs)).toBe(true);
  await expect(page.locator('#grid')).toHaveText(originalGrid);
  await page.locator('#simulationTrials').fill('10000');
  await page.locator('#simulationRun').click();
  await expect.poll(async () => Number(await page.locator('#simulationProgress').getAttribute('value'))).toBeGreaterThan(0);
  await expect(page.locator('#simulationThreshold')).toBeDisabled();
  // Generating a playable puzzle must not disable the independent Stop button.
  await page.locator('#newPuzzle').click();
  await expect(page.locator('#simulationStop')).toBeEnabled();
  await page.locator('#simulationStop').click();
  await expect(page.locator('#simulationStatus')).toContainText('Simulation stopped:');
  await expect(page.locator('#simulationStop')).toBeDisabled();
  await expect(page.locator('#simulationThreshold')).toBeEnabled();
  const stopped = await page.locator('#simulationProgress').getAttribute('value');
  await page.waitForTimeout(250);
  await expect(page.locator('#simulationProgress')).toHaveAttribute('value', stopped);
  await page.locator('#simulationTrials').fill('3');
  await page.locator('#simulationRun').click();
  await expect(page.locator('#simulationStatus')).toHaveText('Simulation complete: 3 of 3 trials.');
  expect(await page.locator('.simulation-bar-row').evaluateAll(rows => rows.reduce((sum, r) => sum + Number(r.dataset.count), 0))).toBe(3);
  await page.locator('#simulationExample summary').click();
  await page.setViewportSize({ width: 320, height: 568 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#simulation').screenshot({ path: 'test-results/triple-simulation-mobile.png' });
  expect(errors).toEqual([]);
});

test('simulation validates trials and recovers from a worker load failure', async ({ page }) => {
  await page.goto('/triple.html');
  await page.locator('#simulationTrials').fill('1.5');
  await page.locator('#simulationRun').click();
  await expect(page.locator('#simulationRun')).toBeEnabled();
  expect(await page.locator('#simulationTrials').evaluate(input => input.validity.stepMismatch)).toBe(true);
  await page.route('**/triple-simulation-worker.js', route => route.abort());
  await page.locator('#simulationTrials').fill('3');
  await page.locator('#simulationRun').click();
  await expect(page.locator('#simulationStatus')).toContainText('could not finish');
  await expect(page.locator('#simulationRun')).toBeEnabled();
  await expect(page.locator('#simulationStop')).toBeDisabled();
});

test('threshold includes every puzzle at or below it, preserves earlier matches, and resets on rerun', async ({ page }) => {
  await page.route('**/triple-simulation-worker.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `importScripts('triple-sudoku.js');
      onmessage = ({data}) => {
        const base = TripleSudoku.completedGrid(() => 0.5);
        [40, 40, 39, 39, 41].slice(0, data.trials).forEach((clues, i) => {
          const solution = base.map(n => (n + i) % 3 + 1);
          const puzzle = solution.map((n, j) => j < clues ? n : 0);
          postMessage({type:'sample', puzzle, solution, completed:i+1});
        });
        postMessage({type:'done'});
      };`,
  }));
  await page.goto('/triple.html');
  await page.locator('#simulationTrials').fill('5');
  await page.locator('#simulationThreshold').fill('40');
  await page.locator('#simulationRun').click();
  await expect(page.locator('#simulationStatus')).toContainText('Simulation complete');
  await expect(page.locator('.simulation-example')).toHaveCount(4);
  await expect(page.locator('#simulationExampleTitle')).toHaveText('Puzzles with at most 40 clues · 4 puzzles');
  expect(await page.locator('.simulation-example').evaluateAll(nodes => nodes.map(n => n.dataset.trial))).toEqual(['1', '2', '3', '4']);
  await expect(page.locator('.simulation-pair .simulation-grid')).toHaveCount(8);
  await expect(page.locator('.simulation-solution-string')).toHaveCount(4);
  await expect(page.locator('.simulation-filled')).toHaveCount(166);
  await expect(page.locator('#simulationMatches')).toHaveText('4 of 5 completed puzzles have 40 or fewer clues.');
  expect(await page.locator('.simulation-bar-row').evaluateAll(rows => rows.reduce((sum, r) => sum + Number(r.dataset.count), 0))).toBe(5);
  await page.locator('#simulationExample summary').click();
  await page.setViewportSize({ width: 320, height: 568 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#simulationExample').screenshot({ path: 'test-results/triple-tied-examples.png' });
  await page.locator('#simulationThreshold').fill('39');
  await page.locator('#simulationRun').click();
  await expect(page.locator('#simulationStatus')).toHaveText('Simulation complete: 5 of 5 trials.');
  await expect(page.locator('.simulation-example')).toHaveCount(2);
  await expect(page.locator('#simulationExampleTitle')).toHaveText('Puzzles with at most 39 clues · 2 puzzles');
  for (const invalid of ['-1', '82', '1.5', '']) {
    await page.locator('#simulationThreshold').fill(invalid);
    await page.locator('#simulationRun').click();
    expect(await page.locator('#simulationThreshold').evaluate(input => input.checkValidity())).toBe(false);
    await expect(page.locator('.simulation-example')).toHaveCount(2);
  }
  await page.locator('#simulationThreshold').fill('0');
  await page.locator('#simulationRun').click();
  await expect(page.locator('#simulationStatus')).toHaveText('Simulation complete: 5 of 5 trials.');
  await expect(page.locator('.simulation-example')).toHaveCount(0);
  await expect(page.locator('#simulationMatches')).toHaveText('No puzzles with 0 or fewer clues found in 5 completed trials.');
});

test('each example copies its own puzzle and solution as text and PNG, with failure feedback', async ({ page }) => {
  await page.addInitScript(() => {
    window.copiedTexts = []; window.copiedImages = []; window.rejectCopy = false;
    Object.defineProperty(navigator, 'clipboard', { value: {
      writeText: async text => {
        if (window.rejectCopy) throw new Error('Denied');
        window.copiedTexts.push(text);
      },
      write: async items => {
        if (window.rejectCopy) throw new Error('Denied');
        for (const item of items) {
          const blob = await item.getType('image/png');
          const bitmap = await createImageBitmap(blob);
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width; canvas.height = bitmap.height;
          canvas.getContext('2d').drawImage(bitmap, 0, 0);
          window.copiedImages.push(canvas.toDataURL());
          bitmap.close();
        }
      },
    } });
  });
  await page.route('**/triple-simulation-worker.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `importScripts('triple-sudoku.js'); onmessage=()=>{
      const base=TripleSudoku.completedGrid(()=>0.5);
      for(let i=0;i<2;i++) { const solution=base.map(n=>(n+i)%3+1);
        postMessage({type:'sample',puzzle:solution.map((n,j)=>j<30?n:0),solution,completed:i+1}); }
      postMessage({type:'done'});
    };`,
  }));
  await page.goto('/triple.html');
  await page.locator('#simulationTrials').fill('2');
  await page.locator('#simulationRun').click();
  await expect(page.locator('#simulationStatus')).toHaveText('Simulation complete: 2 of 2 trials.');
  await page.locator('#simulationExample summary').click();
  const sides = page.locator('.simulation-pair section');
  await expect(sides).toHaveCount(4);
  const expectedTexts = [];
  for (let i = 0; i < 4; i++) {
    const side = sides.nth(i);
    expectedTexts.push(await side.locator('textarea').inputValue());
    await side.locator('[data-copy-format="text"]').click();
    await expect(side.locator('[role="status"]')).toContainText('text copied.');
    await side.locator('[data-copy-format="image"]').click();
    await expect(side.locator('[role="status"]')).toContainText('image copied.');
  }
  expect(await page.evaluate(() => window.copiedTexts)).toEqual(expectedTexts);
  const images = await page.evaluate(() => window.copiedImages);
  expect(new Set(images).size).toBe(4);
  const pixels = await page.evaluate(async () => {
    return Promise.all(window.copiedImages.slice(0, 2).map(async url => {
      const bitmap = await createImageBitmap(await (await fetch(url)).blob());
      const canvas = document.createElement('canvas'); canvas.width=bitmap.width; canvas.height=bitmap.height;
      const ctx=canvas.getContext('2d'); ctx.drawImage(bitmap,0,0);
      // Cell 80 is blank in the puzzle and filled blue in its solution.
      const data=ctx.getImageData(498,498,48,48).data;
      let blue=0;for(let i=0;i<data.length;i+=4)if(data[i+2]>data[i]+50&&data[i+2]>data[i+1]+50)blue++;
      return {width:bitmap.width,height:bitmap.height,blue};
    }));
  });
  expect(pixels[0]).toEqual({width:564,height:564,blue:0});
  expect(pixels[1].blue).toBeGreaterThan(0);
  const fs = require('node:fs');
  fs.writeFileSync('test-results/triple-copied-solution.png', Buffer.from(images[1].split(',')[1], 'base64'));
  await page.evaluate(() => window.rejectCopy = true);
  await sides.first().locator('[data-copy-format="text"]').click();
  await expect(sides.first().locator('[role="status"]')).toContainText('Could not copy text');
  await sides.first().locator('[data-copy-format="image"]').click();
  await expect(sides.first().locator('[role="status"]')).toContainText('Could not copy the image');
  await expect(sides.first().locator('[data-copy-format="image"]')).toBeEnabled();
  await page.setViewportSize({width:320,height:568});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
