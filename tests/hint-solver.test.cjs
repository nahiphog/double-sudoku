const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const solver = require('../hint-solver.js');
const html = fs.readFileSync('index.html', 'utf8');
const tiles = JSON.parse(html.match(/tiles=(\[[\d,]+\])/)[1]);
const base = JSON.parse(html.match(/const base=(\[[\d,]+\])/)[1]);
function fixture(patterns, givens = {}) {
  const values = Array(64).fill(0);
  for (const [cell, digit] of Object.entries(givens)) values[cell] = digit;
  const excluded = Array.from({ length: 64 }, (_, i) => patterns[i] ? [1,2,3,4].filter(d => !patterns[i].includes(d)) : []);
  return { values, excluded };
}
const hint = f => solver.nextHint(f.values, tiles, f.excluded);
test('two bivalue cells do not exhaust four remaining copies', () => {
  assert.equal(hint(fixture({0:[1,2],1:[1,2]})).status, 'stuck');
});
test('naked pair becomes valid with one placed copy of each digit', () => {
  const step = hint(fixture({0:[1,2],1:[1,2]}, {6:1,7:2}));
  assert.match(step.technique, /Naked pair/);
  assert(step.eliminations.some(e => e.cell === 2 && e.digit === 1));
});
test('three and four cells can reserve repeated copies', () => {
  assert.match(hint(fixture({0:[1,2],1:[1,2],2:[1,2]}, {7:1})).technique, /Naked triple/);
  assert.match(hint(fixture({0:[1,2],1:[1,2],2:[1,2],3:[1,2]})).technique, /Naked quadruple/);
});
test('hidden subsets count copies, not just distinct digits', () => {
  const pair = fixture({0:[1,2,3],1:[1,2,3],2:[3,4],3:[3,4],4:[3,4],5:[3,4]}, {6:1,7:2});
  assert.match(hint(pair).technique, /Hidden pair/);
  const triple = fixture({0:[1,2,3],1:[1,2,3],2:[1,2,3],3:[3,4],4:[3,4],5:[3,4],6:[3,4]}, {7:1});
  assert.match(hint(triple).technique, /Hidden triple/);
});
test('hidden single and two forced copies', () => {
  const patterns = Object.fromEntries([2,3,4,5,6,7].map(i => [i,[2,3,4]]));
  const two = hint(fixture(patterns));
  assert.equal(two.technique, 'Two forced copies');
  assert.deepEqual(two.placements, [{cell:0,digit:1},{cell:1,digit:1}]);
  patterns[1] = [2,3,4];
  assert.equal(hint(fixture(patterns,{7:1})).technique,'Hidden single');
});
test('naked single, completed board, and invalid entries', () => {
  assert.equal(hint(fixture({0:[3]})).technique,'Naked single');
  assert.equal(solver.nextHint(base,tiles).status,'solved');
  assert.equal(hint(fixture({}, {0:1,1:1,2:1})).status,'contradiction');
  assert.equal(hint(fixture(Object.fromEntries([1,2,3,4,5,6,7].map(i=>[i,[2,3,4]])))).status,'contradiction');
});
// Independent backtracking oracle: verify every proposed deduction, without
// feeding the engine's candidate exclusions into the oracle.
const units = solver.unitsFor(tiles).map(u => u.cells);
function possible(values) {
  let best = -1, options;
  for(let i=0;i<64;i++) if(!values[i]) {
    const allowed = [1,2,3,4].filter(d => units.filter(u=>u.includes(i)).every(u=>u.filter(j=>values[j]===d).length<2));
    if (!allowed.length) return false;
    if (!options || allowed.length<options.length) {best=i;options=allowed;}
  }
  if(best<0) return units.every(u=>[1,2,3,4].every(d=>u.filter(i=>values[i]===d).length===2));
  for(const d of options) {values[best]=d;if(possible(values)){values[best]=0;return true;}}
  values[best]=0;return false;
}
test('every step preserves solutions across deterministic sample puzzles', () => {
  let seed=19, checked=0;
  const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  for(let trial=0;trial<12;trial++) {
    const values=base.map(d=>random()<.48?d:0), excluded=Array.from({length:64},()=>[]);
    for(let n=0;n<100;n++) {
      const step=solver.nextHint(values,tiles,excluded);
      assert.notEqual(step.status,'contradiction');
      if(step.status!=='move')break;
      for(const {cell,digit} of step.placements) {
        for(const other of [1,2,3,4].filter(d=>d!==digit)) {
          const alternative=values.slice();alternative[cell]=other;
          assert.equal(possible(alternative),false,`${step.technique}: ${cell} must be ${digit}`);
        }
      }
      for(const {cell,digit} of step.eliminations) {
        const alternative=values.slice();alternative[cell]=digit;
        assert.equal(possible(alternative),false,`${step.technique}: cannot eliminate ${digit} at ${cell}`);
      }
      for(const {cell,digit} of step.placements)values[cell]=digit;
      for(const {cell,digit} of step.eliminations)excluded[cell].push(digit);
      checked++;
    }
  }
  assert(checked>50);
});
test('browser scripts parse', () => {
  new vm.Script(fs.readFileSync('hint-ui.js','utf8'));
  new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
});
