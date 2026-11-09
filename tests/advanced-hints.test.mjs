import { test } from 'node:test';
import assert from 'node:assert/strict';
import solver from '../hint-solver.js';
import { examples, advancedFixture, tiles } from '../scripts/technique-examples.mjs';
const units=solver.unitsFor(tiles).map(u=>u.cells);
// Enumerate one digit's placements, with exactly two in all 24 units.
// Every complete puzzle solution must pass this independent necessary test.
function digitFeasible(input, excluded, digit) {
  const fixed=input.flatMap((v,i)=>v===digit?[i]:[]);
  const available=input.flatMap((v,i)=>!v&&!excluded[i].includes(digit)?[i]:[]);
  function search(chosen, allowed) {
    let best, bestNeed, bestCount=Infinity;
    for(const unit of units) {
      const need=2-unit.filter(i=>chosen.has(i)).length;
      const cells=unit.filter(i=>allowed.has(i));
      if(need<0||cells.length<need)return false;
      if(!need) { if(cells.length) { const next=new Set(allowed);cells.forEach(i=>next.delete(i));return search(chosen,next); } continue; }
      const count=need===1?cells.length:cells.length*(cells.length-1)/2;
      if(count<bestCount){best=cells;bestNeed=need;bestCount=count;}
    }
    if(!best)return true;
    for(let a=0;a<best.length;a++)for(let b=bestNeed===1?a:a+1;b<best.length;b++) {
      const picks=bestNeed===1?[best[a]]:[best[a],best[b]];
      const next=new Set(allowed);best.forEach(i=>next.delete(i));
      if(search(new Set([...chosen,...picks]),next))return true;
      if(bestNeed===1)break;
    }
    return false;
  }
  return search(new Set(fixed),new Set(available));
}
// Independent constraint search, respecting the example's prior eliminations.
function feasible(input, excluded) {
  const values=input.slice();
  function search() {
    const counts=units.map(u=>[1,2,3,4].map(d=>u.filter(i=>values[i]===d).length));
    if(counts.some(cs=>cs.some(n=>n>2)))return false;
    const c=values.map((v,i)=>v?[]:[1,2,3,4].filter(d=>!excluded[i].includes(d)&&units.every((u,j)=>!u.includes(i)||counts[j][d-1]<2)));
    if(values.some((v,i)=>!v&&!c[i].length))return false;
    for(let j=0;j<units.length;j++)for(let d=1;d<=4;d++) {
      const need=2-counts[j][d-1], cells=units[j].filter(i=>c[i].includes(d));
      if(cells.length<need)return false;
      if(need&&cells.length===need) {
        const i=cells[0];values[i]=d;const ok=search();values[i]=0;return ok;
      }
    }
    let next=-1;
    for(let i=0;i<64;i++)if(!values[i]&&(next<0||c[i].length<c[next].length))next=i;
    if(next<0)return true;
    for(const d of c[next]) {values[next]=d;const ok=search();values[next]=0;if(ok)return true;}
    return false;
  }
  return search();
}
for(const e of examples.filter(e=>e.advanced)) test(`${e.id}: solver and diagram agree with independent solution search`,()=>{
  const {values,excluded}=e.fixture;
  for(const d of [1,2,3,4])assert(digitFeasible(values,excluded,d),'fixture must admit placements of each digit');
  const before=JSON.stringify(e.fixture);
  const finder=e.kind==='fish'?solver.findFish:e.kind==='forcing'?solver.findForcing:solver.findLocked;
  const step=finder(values,tiles,excluded);
  assert.equal(step?.status,'move');
  assert.equal(JSON.stringify(e.fixture),before,'finding hints cannot mutate state');
  for(const [cell,ds] of Object.entries(e.removed))for(const d of ds) {
    const trial=values.slice();trial[cell]=d;
    assert.equal(e.kind==='forcing'?feasible(trial,excluded):digitFeasible(trial,excluded,d),false,`diagram cannot remove ${d} from ${cell}`);
    assert(step.eliminations.some(x=>x.cell===Number(cell)&&x.digit===d));
  }
  if(e.kind==='fish')assert.match(step.technique,new RegExp(e.size===2?'X-Wing':e.size===3?'Swordfish':'Jellyfish'));
  if(e.kind==='forcing') {
    assert.deepEqual(step.assumption,{cell:0,digit:1});
    assert(step.trail.length>0&&step.trail.length<=6);
    assert.equal(step.placements.length,0);
    assert.match(step.proof.at(-2),/Contradiction/);
    assert.equal(solver.findForcing(values,tiles,excluded,0),null,'a cutoff is not proof');
  }
});
test('pointing does not clear spare capacity',()=>{
  const f=advancedFixture('pointing');f.values[1]=3;
  const step=solver.findLocked(f.values,tiles,f.excluded);
  assert(!step?.eliminations.some(e=>e.cell===32&&e.digit===3));
});
test('fish works with columns as bases and refuses spare capacity',()=>{
  const f=advancedFixture('fish',3,true);
  assert.match(solver.findFish(f.values,tiles,f.excluded)?.technique,/Swordfish/);
  const spare=advancedFixture('fish',3);spare.values[7]=4;
  const step=solver.findFish(spare.values,tiles,spare.excluded);
  assert(!step?.eliminations.some(e=>e.cell===8&&e.digit===4));
});
test('forcing branches that stall are not eliminations',()=>{
  assert.equal(solver.findForcing(Array(64).fill(0),tiles,Array.from({length:64},()=>[])),null);
});
