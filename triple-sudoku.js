(function (root) {
  'use strict';
  const units = Array.from({ length: 27 }, () => []);
  const memberships = Array.from({ length: 81 }, (_, i) => {
    const row = Math.floor(i / 9), col = i % 9;
    const ids = [row, 9 + col, 18 + Math.floor(row / 3) * 3 + Math.floor(col / 3)];
    ids.forEach(id => units[id].push(i));
    return ids;
  });
  function validInput(grid) {
    return Array.isArray(grid) && grid.length === 81 && grid.every(n => Number.isInteger(n) && n >= 0 && n <= 3);
  }
  function conflicts(grid) {
    const bad = new Set();
    for (const unit of units) for (let digit = 1; digit <= 3; digit++) {
      const cells = unit.filter(i => grid[i] === digit);
      if (cells.length > 3) cells.forEach(i => bad.add(i));
    }
    return bad;
  }
  // Search without a node limit; two solutions suffice to disprove uniqueness.
  function solve(input) {
    if (!validInput(input) || conflicts(input).size) return { count: 0, complete: true, solution: null };
    const grid = input.slice(), counts = units.map(unit => [0, ...[1, 2, 3].map(d => unit.filter(i => grid[i] === d).length)]);
    let count = 0, solution = null;
    function visit() {
      let chosen = -1, choices = null;
      const candidates = new Map();
      for (let i = 0; i < 81; i++) if (!grid[i]) {
        const options = [1, 2, 3].filter(d => memberships[i].every(id => counts[id][d] < 3));
        if (!options.length) return;
        candidates.set(i, options);
        if (!choices || options.length < choices.length) { chosen = i; choices = options; }
      }
      if (chosen === -1) { count++; solution ||= grid.slice(); return; }
      for (let id = 0; id < 27; id++) for (let d = 1; d <= 3; d++) {
        if (counts[id][d] + units[id].filter(i => candidates.get(i)?.includes(d)).length < 3) return;
      }
      for (const d of choices) {
        grid[chosen] = d;
        memberships[chosen].forEach(id => counts[id][d]++);
        visit();
        memberships[chosen].forEach(id => counts[id][d]--);
        grid[chosen] = 0;
        if (count >= 2) return;
      }
    }
    visit();
    return { count, complete: true, solution };
  }
  function shuffle(values, random = Math.random) {
    const result = values.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function completedGrid(random = Math.random) {
    const order = () => shuffle([0, 1, 2], random).flatMap(b => shuffle([0, 1, 2], random).map(n => b * 3 + n));
    const rows = order(), cols = order(), digits = shuffle([1, 2, 3], random);
    return rows.flatMap(r => cols.map(c => digits[(r + Math.floor(r / 3) + c) % 3]));
  }
  async function generate(random = Math.random, pause = () => Promise.resolve()) {
    const solution = completedGrid(random), puzzle = solution.slice();
    for (const i of shuffle(Array.from({ length: 81 }, (_, i) => i), random)) {
      const saved = puzzle[i];
      puzzle[i] = 0;
      const result = solve(puzzle);
      if (result.count !== 1) puzzle[i] = saved;
      await pause();
    }
    // A rejected removal stays non-unique after further removals, so one full
    // pass is sufficient: every remaining clue is necessary for uniqueness.
    return { puzzle, solution };
  }
  const api = { units, validInput, conflicts, solve, completedGrid, generate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TripleSudoku = api;
})(globalThis);
