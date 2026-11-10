const {test}=require('node:test');
const assert=require('node:assert/strict');
const hints=require('../triple-hints.js');
const triple=require('../triple-sudoku.js');
const empty=()=>Array(81).fill(0);
const exclusions=()=>Array.from({length:81},()=>[]);
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

// Independent search enforces both the three-copy rules and prior exclusions.
function feasible(input,excluded) {
  const values=input.slice();
  function search() {
    const counts=triple.units.map(u=>[0,...[1,2,3].map(d=>u.filter(i=>values[i]===d).length)]);
    if(counts.some(cs=>cs.some(n=>n>3)))return false;
    let best=-1,options=[];const candidates=Array.from({length:81},()=>[]);
    for(let i=0;i<81;i++)if(!values[i]) {
      const ds=[1,2,3].filter(d=>!excluded[i].includes(d)&&triple.units.every((u,j)=>!u.includes(i)||counts[j][d]<3));
      if(!ds.length)return false;
      candidates[i]=ds;
      if(best<0||ds.length<options.length){best=i;options=ds;}
    }
    for(let u=0;u<27;u++)for(const d of [1,2,3])if(counts[u][d]+triple.units[u].filter(i=>candidates[i].includes(d)).length<3)return false;
    if(best<0)return true;
    for(const d of options){values[best]=d;if(search()){values[best]=0;return true;}values[best]=0;}
    return false;
  }
  return search();
}
function verify(values,excluded,step) {
  assert.equal(step.status,'move');
  assert(feasible(values,excluded));
  for(const e of step.eliminations) {const trial=values.slice();trial[e.cell]=e.digit;assert.equal(feasible(trial,excluded),false);}
  for(const p of step.placements) for(const d of [1,2,3].filter(d=>d!==p.digit&&!excluded[p.cell].includes(d))) {
    const trial=values.slice();trial[p.cell]=d;assert.equal(feasible(trial,excluded),false);
  }
}
test('three forced copies and completed counts are explained without changing input',()=>{
  const v=empty(),e=exclusions();for(let i=3;i<9;i++)e[i]=[1];
  const before=JSON.stringify([v,e]);const step=hints.nextHint(v,e);
  assert.equal(step.technique,'Three forced copies');assert.equal(step.placements.length,3);verify(v,e,step);
  assert.equal(JSON.stringify([v,e]),before);
  v[0]=v[1]=v[2]=1;
  const count=hints.nextHint(v,exclusions());assert.equal(count.technique,'Completed digit count');verify(v,exclusions(),count);
});
test('two bivalue cells do not exhaust six remaining copies',()=>{
  const e=exclusions();e[0]=e[1]=[3];
  assert.equal(hints.nextHint(empty(),e).status,'stuck');
});
test('locked candidates exhaust the target allowance and fish balance remaining copies',()=>{
  const v=empty(),e=exclusions();
  for(const i of [9,10,11,18,19,20])e[i]=[1];
  const locked=hints.findLocked(v,e);assert.match(locked.technique,/Locked candidates/);verify(v,e,locked);
  const f=exclusions();for(const r of [0,3,6])for(let c=0;c<9;c++)if(![0,3,6].includes(c))f[r*9+c]=[1];
  const fish=hints.findFish(v,f);assert.match(fish.technique,/Swordfish/);verify(v,f,fish);
});
test('every walkthrough deduction preserves generated solutions in both digging modes',async()=>{
  const techniques=new Set();
  for(let seed=1;seed<=6;seed++) {
    const {puzzle,solution}=await triple.generate(seeded(seed),undefined,{mode:seed===6?'dual':'single'});
    const values=puzzle.slice(),excluded=exclusions();
    for(let n=0;n<300;n++) {
      const before=JSON.stringify([values,excluded]);
      const step=hints.nextHint(values,excluded);
      assert.equal(JSON.stringify([values,excluded]),before);
      assert.notEqual(step.status,'contradiction');
      if(step.status!=='move') {assert.ok(['solved','stuck'].includes(step.status));break;}
      techniques.add(step.technique);
      assert.ok(step.placements.length+step.eliminations.length>0);
      for(const p of step.placements){assert.equal(p.digit,solution[p.cell]);assert.equal(values[p.cell],0);values[p.cell]=p.digit;}
      for(const e of step.eliminations){assert.notEqual(e.digit,solution[e.cell]);assert(!excluded[e.cell].includes(e.digit));excluded[e.cell].push(e.digit);}
      assert.ok(n<299,'walkthrough must terminate');
    }
  }
  assert(techniques.has('Naked single'));assert(techniques.has('Completed digit count'));
});
test('invalid and solved boards are reported honestly',()=>{
  const v=triple.completedGrid(seeded(4));assert.equal(hints.nextHint(v).status,'solved');
  assert.equal(hints.nextHint([4]).status,'contradiction');
  const invalid=empty();invalid[0]=invalid[1]=invalid[2]=invalid[3]=1;
  assert.equal(hints.nextHint(invalid).status,'contradiction');
});
