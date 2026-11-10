const { test } = require('node:test');
const assert = require('node:assert/strict');
const triple = require('../triple-sudoku.js');
function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
function assertComplete(grid) {
  assert.equal(grid.length, 81);
  for (const unit of triple.units) for (const digit of [1, 2, 3]) {
    assert.equal(unit.filter(i => grid[i] === digit).length, 3);
  }
}
test('generated puzzles obey triple rules and every remaining clue is necessary', async () => {
  for (let seed = 1; seed <= 12; seed++) {
    const { puzzle, solution } = await triple.generate(seeded(seed));
    assertComplete(solution);
    assert.ok(puzzle.includes(0));
    assert.ok(puzzle.every((n, i) => !n || n === solution[i]));
    const result = triple.solve(puzzle);
    assert.equal(result.complete, true);
    assert.equal(result.count, 1);
    assert.deepEqual(result.solution, solution);
    for (let i = 0; i < puzzle.length; i++) if (puzzle[i]) {
      const removed = puzzle.slice();
      removed[i] = 0;
      const withoutClue = triple.solve(removed);
      assert.equal(withoutClue.complete, true);
      assert.equal(withoutClue.count, 2, `seed ${seed}, clue ${i} must be necessary`);
    }
  }
});
test('accepts three repeats, rejects four, and detects ambiguous puzzles', () => {
  const grid = Array(81).fill(0);
  grid[0] = grid[1] = grid[2] = 1;
  assert.equal(triple.conflicts(grid).size, 0);
  grid[3] = 1;
  assert.deepEqual([...triple.conflicts(grid)], [0, 1, 2, 3]);
  assert.equal(triple.solve(grid).count, 0);
  assert.equal(triple.solve(Array(81).fill(0)).count, 2);
  assert.equal(triple.solve(Array(81).fill(0)).complete, true);
  assert.equal(triple.solve([4]).count, 0);
});

test('dual-cell digging removes only pairs and leaves no uniquely removable pair', async () => {
  for (const seed of [10, 20, 30]) {
    const {puzzle, solution, mode} = await triple.generate(seeded(seed), undefined, {mode:'dual'});
    assert.equal(mode, 'dual'); assertComplete(solution);
    assert.equal(triple.solve(puzzle).count, 1);
    assert.equal((81-puzzle.filter(Boolean).length)%2,0);
    assert.ok(puzzle.every((n,i)=>!n||n===solution[i]));
    for (let i=0;i<81;i++) if(puzzle[i]) for(let j=i+1;j<81;j++)if(puzzle[j]) {
      const removed=puzzle.slice(); removed[i]=removed[j]=0;
      assert.equal(triple.solve(removed).count,2,`pair ${i},${j} must not be removable`);
    }
  }
});

test('custom builder uses exactly the selected cells and rejects nonunique attempts', () => {
  const selected=Array.from({length:80},(_,i)=>i+1);
  const result=triple.customAttempt(selected,seeded(9));
  assert.ok(result); assertComplete(result.solution);
  assert.equal(result.puzzle[0],0);
  assert.ok(selected.every(i=>result.puzzle[i]===result.solution[i]));
  assert.equal(triple.solve(result.puzzle).count,1);
  assert.equal(triple.customAttempt([0],seeded(9)),null);
  assert.throws(()=>triple.customAttempt([]));
});
