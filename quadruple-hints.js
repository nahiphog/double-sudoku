(function(root){
'use strict';
const engine=typeof module!=='undefined'&&module.exports?require('./quadruple-sudoku.js'):root.QuadrupleSudoku;
const cellName=i=>`r${Math.floor(i/8)+1}c${i%8+1}`;
const unitName=id=>id<8?`row ${id+1}`:id<16?`column ${id-7}`:`region ${id-15}`;
function nextHint(values){
 if(!engine.validInput(values)||engine.conflicts(values).size)return {status:'contradiction',explanation:'Correct the entries: each row, column and outlined region must have four 0s and four 1s.'};
 if(values.every(engine.filled))return {status:'solved',explanation:'Solved! Every row, column and outlined region has four 0s and four 1s.'};
 const counts=engine.units.map(u=>[u.filter(i=>values[i]===0).length,u.filter(i=>values[i]===1).length]);
 const candidates=values.map((v,i)=>v!==null?[]:[0,1].filter(d=>engine.memberships[i].every(id=>counts[id][d]<4)));
 if(values.some((v,i)=>v===null&&!candidates[i].length))return {status:'contradiction',explanation:'An empty cell has no legal value under the four-copy rule.'};
 const move=(technique,explanation,cells,placements)=>({status:'move',technique,explanation,cells,placements,eliminations:[]});
 for(let id=0;id<24;id++)for(const d of [0,1])if(counts[id][d]===4){const empty=engine.units[id].filter(i=>values[i]===null);if(empty.length)return move('Completed digit count',`${unitName(id)} already contains four ${d}s. Its remaining cells must be ${1-d}.`,engine.units[id].filter(i=>values[i]===d),empty.map(cell=>({cell,digit:1-d})));}
 for(let i=0;i<64;i++)if(candidates[i].length===1)return move('Naked single',`${cellName(i)} can only be ${candidates[i][0]}; the other digit has already reached four copies in its row, column or region.`,[i],[{cell:i,digit:candidates[i][0]}]);
 for(let id=0;id<24;id++)for(const d of [0,1]){const remaining=4-counts[id][d],cells=engine.units[id].filter(i=>candidates[i].includes(d));if(cells.length<remaining)return {status:'contradiction',explanation:`${unitName(id)} has too few places for its remaining ${d}s.`};if(remaining>0&&cells.length===remaining)return move('Forced copies',`${unitName(id)} needs ${remaining} more ${d}s, and exactly ${remaining} cells allow ${d}. Fill those cells.`,cells,cells.map(cell=>({cell,digit:d})));}
 // Exact alternatives are explicitly distinguished from elementary deductions.
 if(engine.solve(values).count===0)return {status:'contradiction',explanation:'These entries have no valid completion.'};
 for(let i=0;i<64;i++)if(values[i]===null)for(const d of [0,1]){const trial=values.slice();trial[i]=d;if(engine.solve(trial).count===0)return move('Search-assisted contradiction',`Assuming ${d} at ${cellName(i)} leaves no valid completion after an exhaustive check of the four-copy constraints. Therefore this cell must be ${1-d}. This step uses search rather than a short counting deduction.`,[i],[{cell:i,digit:1-d}]);}
 return {status:'stuck',explanation:'No forced value was found. This puzzle may have multiple completions; no guess has been applied.'};
}
const api={nextHint};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.QuadrupleSudokuHints=api;
})(globalThis);
