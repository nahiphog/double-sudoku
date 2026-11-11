(function(root){
'use strict';
const regions=[1,1,2,2,3,3,3,3,1,1,2,2,3,3,3,3,1,1,2,2,4,4,4,4,1,1,2,2,4,4,4,4,5,5,5,5,6,6,7,7,5,5,5,5,6,6,7,7,8,8,8,8,6,6,7,7,8,8,8,8,6,6,7,7];
const units=Array.from({length:24},()=>[]);
const memberships=regions.map((region,i)=>{const ids=[Math.floor(i/8),8+i%8,15+region];ids.forEach(id=>units[id].push(i));return ids;});
const filled=n=>n===0||n===1;
const validInput=grid=>Array.isArray(grid)&&grid.length===64&&grid.every(n=>n===null||filled(n));
const parse=text=>{const s=text.replace(/\s/g,'');return /^[01.]{64}$/.test(s)?[...s].map(c=>c==='.'?null:Number(c)):null;};
const stringify=grid=>grid.map(n=>n===null?'.':String(n)).join('');
function conflicts(grid){const bad=new Set();for(const unit of units)for(const d of [0,1]){const cells=unit.filter(i=>grid[i]===d);if(cells.length>4)cells.forEach(i=>bad.add(i));}return bad;}
function shuffle(a,random=Math.random){const out=a.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
// Exact search, stopping after two solutions for uniqueness checks. Null alone is blank.
function search(input,limit=2,random=null){
 if(!validInput(input)||conflicts(input).size)return {count:0,solution:null,solutions:[],complete:true};
 const grid=input.slice(),counts=units.map(u=>[u.filter(i=>grid[i]===0).length,u.filter(i=>grid[i]===1).length]);
 const order=random?shuffle([...Array(64).keys()],random):[...Array(64).keys()],solutions=[];
 function visit(){let chosen=-1,choices=null;const candidates=Array(64).fill(0);
  for(const i of order)if(grid[i]===null){const opts=[0,1].filter(d=>memberships[i].every(id=>counts[id][d]<4));if(!opts.length)return; candidates[i]=opts.reduce((mask,d)=>mask|(1<<d),0);if(!choices||opts.length<choices.length){chosen=i;choices=opts;}}
  if(chosen===-1){solutions.push(grid.slice());return;}
  for(let id=0;id<24;id++)for(const d of [0,1])if(counts[id][d]+units[id].filter(i=>candidates[i]&(1<<d)).length<4)return;
  for(const d of random?shuffle(choices,random):choices){grid[chosen]=d;memberships[chosen].forEach(id=>counts[id][d]++);visit();memberships[chosen].forEach(id=>counts[id][d]--);grid[chosen]=null;if(solutions.length>=limit)return;}
 }
 visit();return {count:solutions.length,solution:solutions[0]||null,solutions,complete:true};
}
const solve=input=>search(input);
const completedGrid=(random=Math.random)=>search(Array(64).fill(null),1,random).solution;
async function generate(random=Math.random,pause=()=>Promise.resolve(),{mode='dual'}={}){
 if(!['single','dual'].includes(mode))throw Error('Unknown digging mode');
 const solution=completedGrid(random),puzzle=solution.slice();
 const groups=mode==='dual'?Array.from({length:32},(_,i)=>[i,63-i]):Array.from({length:64},(_,i)=>[i]);
 for(const group of shuffle(groups,random)){const saved=group.map(i=>puzzle[i]);group.forEach(i=>puzzle[i]=null);if(solve(puzzle).count!==1)group.forEach((i,k)=>puzzle[i]=saved[k]);await pause();}
 return {puzzle,solution,mode};
}
function customAttempt(selected,random=Math.random){if(!Array.isArray(selected)||!selected.length||selected.some(i=>!Number.isInteger(i)||i<0||i>=64))throw Error('Select clue cells');const solution=completedGrid(random),mask=new Set(selected),puzzle=solution.map((n,i)=>mask.has(i)?n:null);return solve(puzzle).count===1?{puzzle,solution}:null;}
function borders(i){return {right:i%8===7||regions[i]!==regions[i+1],bottom:i>=56||regions[i]!==regions[i+8]};}
const api={regions,units,memberships,filled,validInput,parse,stringify,conflicts,solve,completedGrid,generate,customAttempt,borders};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.QuadrupleSudoku=api;
})(globalThis);
