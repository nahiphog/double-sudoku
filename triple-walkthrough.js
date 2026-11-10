(() => {
  'use strict';
  const url = new URL('triple-hint-worker.js', document.currentScript.src);
  const get = id => document.getElementById(id);
  let original = null, values = [], excluded = [], pending = null, history = [], worker = null;
  const name = i => `r${Math.floor(i/9)+1}c${i%9+1}`;
  function cancel() { worker?.terminate(); worker = null; }
  function render() {
    get('walkGrid').replaceChildren(...values.map((value,i) => {
      const cell = document.createElement('div');
      const targets = [...(pending?.placements || []), ...(pending?.eliminations || [])].filter(p=>p.cell===i);
      cell.className = 'walk-cell' + (original[i] ? ' walk-given' : '') + (pending?.cells?.includes(i) ? ' walk-support' : '') + (targets.length ? ' walk-target' : '');
      const candidates = value ? [] : [1,2,3].filter(d=>!excluded[i].includes(d));
      cell.setAttribute('aria-label', `${name(i)}: ${value || 'candidates '+candidates.join(', ')}${pending?.cells?.includes(i)?'; supports deduction':''}${targets.length?'; affected by deduction':''}`);
      if (value) cell.textContent = value;
      else {
        cell.classList.add('walk-candidates');
        for (const d of candidates) {
          const mark = document.createElement('span'); mark.textContent = d;
          if(pending?.eliminations?.some(e=>e.cell===i&&e.digit===d))mark.className='walk-remove';
          if(pending?.placements?.some(e=>e.cell===i&&e.digit===d))mark.className='walk-place';
          cell.append(mark);
        }
      }
      return cell;
    }));
    get('walkApply').disabled = !!worker || pending?.status !== 'move';
    get('walkNext').disabled = !!worker || values.every(Boolean) || pending?.status === 'move';
    get('walkUndo').disabled = !!worker || history.length === 0;
    get('walkSteps').replaceChildren(...history.map(item=>{
      const li=document.createElement('li');li.textContent=`${item.step.technique}: ${item.step.explanation}`;return li;
    }));
    get('walkCount').textContent = `${history.length} steps applied · ${values.filter(Boolean).length} of 81 cells filled`;
  }
  function explain(step) {
    get('walkTechnique').textContent=step.technique || (step.status==='solved'?'Solved':step.status==='stuck'?'No further logical step found':step.status==='contradiction'?'Contradiction':'Walkthrough');
    get('walkExplanation').textContent=step.explanation;
    get('walkProof').replaceChildren(...(step.proof || []).map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
    get('walkChanges').textContent = [
      ...(step.placements||[]).map(p=>`Place ${p.digit} at ${name(p.cell)}.`),
      ...(step.eliminations||[]).map(p=>`Remove ${p.digit} from ${name(p.cell)}.`),
    ].join(' ');
  }
  function restart() {
    if(!original)return;
    cancel();values=original.slice();excluded=Array.from({length:81},()=>[]);pending=null;history=[];
    get('walkContent').hidden=false;
    explain({explanation:'Start from the original clues. Choose Next deduction to see a reasoned move; Apply step makes that change on this walkthrough board.'});render();
  }
  get('walkStart').onclick=restart;
  get('walkNext').onclick=()=>{
    if(worker||!original)return;
    pending=null;explain({explanation:'Finding the next logical deduction…'});
    try {
      const active=new Worker(url);worker=active;render();
      active.onmessage=({data})=>{if(worker!==active)return;cancel();pending=data;explain(data);render();};
      active.onerror=event=>{event.preventDefault();if(worker!==active)return;cancel();explain({explanation:'Could not load the hint engine. Reload and try again.'});render();};
      active.postMessage({values,excluded});
    }catch{cancel();explain({explanation:'Background hints are unavailable in this browser.'});render();}
  };
  get('walkApply').onclick=()=>{
    if(worker||pending?.status!=='move')return;
    history.push({values:values.slice(),excluded:excluded.map(a=>a.slice()),step:pending});
    for(const p of pending.placements) { values[p.cell]=p.digit; excluded[p.cell]=[]; }
    for(const e of pending.eliminations)if(!excluded[e.cell].includes(e.digit))excluded[e.cell].push(e.digit);
    const technique=pending.technique;pending=null;
    explain(values.every(Boolean)?{status:'solved',explanation:'Solved by deductions. Every row, column and box contains three copies of each digit.'}:{explanation:`Applied ${technique}. Choose Next deduction to continue.`});
    render();
  };
  get('walkUndo').onclick=()=>{
    if(worker||!history.length)return;
    const previous=history.pop();values=previous.values;excluded=previous.excluded;pending=null;
    explain({explanation:`Undid ${previous.step.technique}. Choose Next deduction to review it again.`});render();
  };
  globalThis.TripleWalkthrough={load(puzzle){
    if(original?.join('')===puzzle.join(''))return;
    cancel();original=puzzle.slice();pending=null;history=[];
    get('walkContent').hidden=true;get('walkStart').disabled=false;
  }};
  window.addEventListener('pagehide',cancel);
})();
