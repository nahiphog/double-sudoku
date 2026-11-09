const region = [0,1,8,9,16,17,24,25];
const row = Array.from({length:8}, (_,i)=>i);
const column = Array.from({length:8}, (_,i)=>i*8);
export const tiles = [1,1,2,2,3,3,3,3,1,1,2,2,3,3,3,3,1,1,2,2,4,4,4,4,1,1,2,2,4,4,4,4,5,5,5,5,6,6,7,7,5,5,5,5,6,6,7,7,8,8,8,8,6,6,7,7,8,8,8,8,6,6,7,7];
function example(id, unit, unitName, entries, pattern, removed, placed, caption) {
  return {id,unit,unitName,cells:Object.fromEntries(unit.map((cell,i)=>[cell,entries[i]])),pattern,removed,placed,caption};
}
export const examples = [
  {id:'naked-single',unit:row,unitName:'row, column and region of r1c1',cells:{0:[3],1:1,2:1,32:2,48:2,8:4,9:4},pattern:[1,2,32,48,8,9],removed:{},placed:{0:3},caption:'The two 1s in row 1, two 2s in column 1, and two 4s in region 1 leave only 3 at r1c1.'},
  example('hidden-single',row.map(i=>i+16),'row 3', [2,[1,3,4],[1,3,4],[1,3,4],[1,2,3,4],[1,3,4],[1,3,4],[1,3,4]], [16,20],{}, {20:2}, 'Row 3 already has one 2. Only r3c5 can hold its second copy: place 2 there.'),
  example('forced-copies',region,'region 1',[[1,2,3,4],[1,2,3],[1,2,3,4],[1,2,3],[1,2,3],[1,2,3],[1,2,3],[1,2,3]],[0,8],{},{0:4,8:4},'Region 1 needs two 4s. Only r1c1 and r2c1 have candidate 4, so both become 4.'),
  example('naked-pair',row,'row 1',[[1,2],[1,2],[1,2,3,4],[1,2,3,4],[1,2,3,4],[1,2,3,4],1,2],[0,1],{2:[1,2],3:[1,2],4:[1,2],5:[1,2]}, {},'One 1 and one 2 are already placed. The blue pair uses the remaining 1 and 2. Cross out 1 and 2 in the four orange cells.'),
  example('naked-triple',row,'row 1',[[1,2],[1,2],[1,2],[1,2,3,4],[1,2,3,4],[1,2,3,4],[1,2,3,4],1],[0,1,2],{3:[1,2],4:[1,2],5:[1,2],6:[1,2]}, {},'The blue cells must hold 1,2,2. Remove 1 and 2 from the other empty cells of row 1.'),
  example('naked-quadruple',region,'region 1',[[1,2],[1,2],[1,2],[1,2],[1,2,3,4],[1,2,3,4],[1,2,3,4],[1,2,3,4]],[0,1,8,9],{16:[1,2],17:[1,2],24:[1,2],25:[1,2]}, {},'The four blue cells reserve 1,1,2,2 in region 1. Remove 1 and 2 from its four other cells.'),
  example('hidden-pair',column,'column 1',[[1,2,3],[1,2,4],[3,4],[3,4],[3,4],[3,4],1,2],[0,8],{0:[3],8:[4]}, {},'Column 1 needs one more 1 and one more 2, both confined to the top two cells. Remove their extra candidates 3 and 4.'),
  example('hidden-triple',region,'region 1',[[1,2,3],[1,2,4],[1,2,3,4],[3,4],[3,4],[3,4],[3,4],1],[0,1,8],{0:[3],1:[4],8:[3,4]}, {},'Region 1 needs 1,2,2, and only the three outlined cells can hold them. Remove 3 and 4 from those cells.'),
  example('hidden-quadruple',row,'row 1',[[1,2,3],[1,2,4],[1,2,3,4],[1,2,3,4],[3,4],[3,4],[3,4],[3,4]],[0,1,2,3],{0:[3],1:[4],2:[3,4],3:[3,4]}, {},'Both 1s and both 2s are confined to the first four cells. Remove their 3 and 4 candidates; the other four cells keep {3,4}.')
];
const name = i=>`r${(i>>3)+1}c${i%8+1}`;
export function renderExample(e) {
  let cells = '<span class="diagram-axis" aria-hidden="true"></span>' + row.map(i=>`<span class="diagram-axis" aria-hidden="true">${i+1}</span>`).join('');
  for(let i=0;i<64;i++) {
    if(i%8===0) cells+=`<span class="diagram-axis" aria-hidden="true">${(i>>3)+1}</span>`;
    const entry=e.cells[i], removal=e.removed[i]||[], placement=e.placed[i];
    const classes=['diagram-cell',e.pattern.includes(i)?'diagram-pattern':'',removal.length?'diagram-removal':'',placement?'diagram-placement':'',entry===undefined?'diagram-muted':'',i%8===7||tiles[i+1]!==tiles[i]?'diagram-right':'',i>55||tiles[i+8]!==tiles[i]?'diagram-bottom':'',i<8?'diagram-top':'',i%8===0?'diagram-left':''].filter(Boolean).join(' ');
    let content, label=name(i)+': ';
    if(entry===undefined) {content='<span aria-hidden="true">·</span>';label+='outside this example';}
    else if(typeof entry==='number'){content=`<span class="diagram-given">${entry}</span>`;label+=`placed ${entry}`;}
    else {
      label+=`candidates ${entry.join(', ')}`+(removal.length?`; remove ${removal.join(', ')}`:'')+(placement?`; place ${placement}`:'');
      content='<span class="diagram-notes">'+[1,2,3,4].map(d=>`<span class="${removal.includes(d)?'diagram-crossed':''}">${entry.includes(d)?d:''}</span>`).join('')+'</span>';
      if(placement)content+=`<span class="diagram-answer">${placement}</span>`;
    }
    cells+=`<span class="${classes}" aria-label="${label}">${content}</span>`;
  }
  return `<figure class="technique-figure" data-example="${e.id}"><figcaption><strong>Grid example · ${e.unitName}</strong><p>${e.caption}</p></figcaption><div class="technique-grid" role="group" aria-label="${e.id.replaceAll('-',' ')} grid example">${cells}</div><div class="diagram-controls"><button type="button" class="diagram-toggle" aria-pressed="false">Show after move</button><span class="diagram-state" aria-live="polite">Before move</span></div><p class="diagram-legend"><span>Blue outline: pattern or supporting givens.</span> <span>Dashed orange: crossed-out candidates to remove.</span> <span>Green outline: digit to place.</span></p><p class="diagram-footnote">Partial candidate example. Dots are cells not shown; other candidate restrictions may come from earlier deductions.</p></figure>`;
}
