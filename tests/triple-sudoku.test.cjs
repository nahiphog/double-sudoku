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
test('completed grids and uniquely solvable puzzles obey triple rules across seeds', async () => {
  for (let seed = 1; seed <= 12; seed++) {
    const { puzzle, solution } = await triple.generate(seeded(seed));
    assertComplete(solution);
    assert.ok(puzzle.includes(0));
    assert.ok(puzzle.every((n, i) => !n || n === solution[i]));
    const result = triple.solve(puzzle);
    assert.equal(result.complete, true);
    assert.equal(result.count, 1);
    assert.deepEqual(result.solution, solution);
  }
});
test('accepts three repeats, rejects four, and distinguishes ambiguous and bounded searches', () => {
  const grid = Array(81).fill(0);
  grid[0] = grid[1] = grid[2] = 1;
  assert.equal(triple.conflicts(grid).size, 0);
  grid[3] = 1;
  assert.deepEqual([...triple.conflicts(grid)], [0, 1, 2, 3]);
  assert.equal(triple.solve(grid).count, 0);
  assert.equal(triple.solve(Array(81).fill(0)).count, 2);
  assert.equal(triple.solve(Array(81).fill(0), 1).complete, false);
  assert.equal(triple.solve([4]).count, 0);
});
