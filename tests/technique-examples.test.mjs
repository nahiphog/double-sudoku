import { test } from 'node:test';
import assert from 'node:assert/strict';
import { examples, renderExample, tiles } from '../scripts/technique-examples.mjs';

for (const e of examples) test(`${e.id}: illustrated deduction is valid`, () => {
  if(e.id === 'naked-single') {
    const target=0;
    const peers=[Array.from({length:8},(_,i)=>i),Array.from({length:8},(_,i)=>i*8),tiles.flatMap((v,i)=>v===tiles[target]?[i]:[])];
    for(const d of [1,2,4]) assert(peers.some(unit=>unit.filter(i=>e.cells[i]===d).length===2));
    assert.equal(e.placed[target],3);
    return;
  }
  let solutions=0;
  const counts=[0,0,0,0,0], assignment={};
  function search(index) {
    if(index===e.unit.length) {
      assert.deepEqual(counts.slice(1),[2,2,2,2]);
      solutions++;
      for(const [cell,digits] of Object.entries(e.removed))assert(!digits.includes(assignment[cell]),`${cell} cannot lose ${assignment[cell]}`);
      for(const [cell,digit] of Object.entries(e.placed))assert.equal(assignment[cell],digit);
      return;
    }
    const cell=e.unit[index], entry=e.cells[cell];
    for(const digit of Array.isArray(entry)?entry:[entry]) {
      if(counts[digit]===2)continue;
      counts[digit]++;assignment[cell]=digit;search(index+1);counts[digit]--;
    }
  }
  search(0);
  assert(solutions>0,'Example must be feasible');
});
test('each diagram has 64 labeled cells and a before/after control', () => {
  assert.equal(examples.length,9);
  for(const example of examples) {
    const html=renderExample(example);
    assert.equal((html.match(/aria-label="r\d+c\d+:/g)||[]).length,64);
    assert(html.includes('Show after move'));
    assert(html.includes('Partial candidate example'));
  }
});
