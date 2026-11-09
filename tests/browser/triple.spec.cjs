const { test, expect } = require('@playwright/test');
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
  await expect(page.locator('.simulation-example')).toHaveCount(distribution[0].count);
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
  // Generating a playable puzzle must not disable the independent Stop button.
  await page.locator('#newPuzzle').click();
  await expect(page.locator('#simulationStop')).toBeEnabled();
  await page.locator('#simulationStop').click();
  await expect(page.locator('#simulationStatus')).toContainText('Simulation stopped:');
  await expect(page.locator('#simulationStop')).toBeDisabled();
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

test('all minimum ties have matching solutions and a new minimum replaces earlier ties', async ({ page }) => {
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
  await page.locator('#simulationRun').click();
  await expect(page.locator('#simulationStatus')).toContainText('Simulation complete');
  await expect(page.locator('.simulation-example')).toHaveCount(2);
  await expect(page.locator('#simulationExampleTitle')).toHaveText('Fewest-clue examples: 39 clues · 2 puzzles');
  expect(await page.locator('.simulation-example').evaluateAll(nodes => nodes.map(n => n.dataset.trial))).toEqual(['3', '4']);
  await expect(page.locator('.simulation-pair .simulation-grid')).toHaveCount(4);
  await expect(page.locator('.simulation-solution-string')).toHaveCount(2);
  await expect(page.locator('.simulation-filled')).toHaveCount(84);
  await page.locator('#simulationExample summary').click();
  await page.setViewportSize({ width: 320, height: 568 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#simulationExample').screenshot({ path: 'test-results/triple-tied-examples.png' });
  await page.locator('#simulationTrials').fill('1');
  await page.locator('#simulationRun').click();
  await expect(page.locator('#simulationStatus')).toHaveText('Simulation complete: 1 of 1 trials.');
  await expect(page.locator('.simulation-example')).toHaveCount(1);
  await expect(page.locator('#simulationExampleTitle')).toHaveText('Fewest-clue examples: 40 clues · 1 puzzle');
});
