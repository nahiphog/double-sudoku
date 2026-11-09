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
// These multi-unit fixtures also drive the advanced technique regression tests.
export function advancedFixture(kind, size = 2, transpose = false) {
  const values = Array(64).fill(0), excluded = Array.from({length:64},()=>[]);
  if (kind === 'pointing') for (const i of region) { if (i % 8 !== 0) excluded[i] = [3]; }
  if (kind === 'claiming') for (const i of row) { if (![2,3].includes(i)) excluded[i] = [3]; }
  if (kind === 'fish') {
    const lines = [0,2,4,6].slice(0,size), covers = [0,2,4,6].slice(0,size);
    for(const r of lines) for(const c of row) if(!covers.includes(c)) excluded[transpose ? c*8+r : r*8+c] = [4];
  }
  if (kind === 'forcing') {
    values[7]=1; values[9]=3; values[24]=1;
    excluded[0]=[3,4]; excluded[1]=[2,4]; excluded[17]=[2,4];
  }
  return {values,excluded};
}
function advancedExample(id, kind, size, unitName, caption) {
  const f = advancedFixture(kind,size), cells = {};
  let pattern, removed;
  if(kind==='pointing') {
    pattern=[0,8,16,24]; removed=Object.fromEntries([32,40,48,56].map(i=>[i,[3]]));
    for(const i of new Set([...region,...column])) cells[i]=[1,2,3,4].filter(d=>!f.excluded[i].includes(d));
  } else if(kind==='claiming') {
    pattern=[2,3]; removed=Object.fromEntries([10,11,18,19,26,27].map(i=>[i,[3]]));
    for(const i of new Set([...row,...tiles.flatMap((v,i)=>v===2?[i]:[])])) cells[i]=[1,2,3,4].filter(d=>!f.excluded[i].includes(d));
  } else if(kind==='fish') {
    const lines=[0,2,4,6].slice(0,size), covers=[0,2,4,6].slice(0,size);
    pattern=lines.flatMap(r=>covers.map(c=>r*8+c)); removed={};
    for(let i=0;i<64;i++) if(lines.includes(i>>3)||covers.includes(i%8)) {
      cells[i]=[1,2,3,4].filter(d=>!f.excluded[i].includes(d));
      if(!lines.includes(i>>3)&&covers.includes(i%8)) removed[i]=[4];
    }
  } else {
    pattern=[0,1,17,7,9,24]; removed={0:[1]};
    for(const i of pattern) cells[i]=f.values[i]||[1,2,3,4].filter(d=>!f.excluded[i].includes(d));
  }
  return {id,advanced:true,fixture:f,kind,size,unitName,cells,pattern,removed,placed:{},caption};
}
examples.push(
  advancedExample('pointing','pointing',0,'region 1 → column 1','Region 1 needs both 3s, and all its candidate 3s lie in column 1. They fill both spaces for 3 in that column. Remove 3 below the region.'),
  advancedExample('claiming','claiming',0,'row 1 → region 2','Row 1 needs both 3s, confined to r1c3 and r1c4 in region 2. They fill that region’s allowance. Remove 3 from its other six cells.'),
  advancedExample('x-wing','fish',2,'two rows → two columns','Rows 1 and 3 need four 4s total, all in columns 1 and 3. These columns have room for exactly four 4s. Remove 4 elsewhere in those columns. In this small example, forced copies can also explain the result.'),
  advancedExample('swordfish','fish',3,'three rows → three columns','Rows 1, 3 and 5 need six 4s total, confined to columns 1, 3 and 5. Those columns have six spaces for 4. Remove 4 from their other rows.'),
  advancedExample('jellyfish','fish',4,'four rows → four columns','Rows 1, 3, 5 and 7 need eight 4s total, confined to columns 1, 3, 5 and 7. Those columns have exactly eight spaces for 4. Remove 4 from their other rows.'),
  advancedExample('forcing-chain','forcing',0,'one assumption → contradiction','Assume r1c1 = 1. Region 1 already has 1 at r4c1, so r1c2 and r3c2 lose 1 and both require 3. But column 2 already has 3 at r2c2: this would make three 3s. Reject the assumption and remove only candidate 1 from r1c1. The branch placements are not applied.')
);
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
