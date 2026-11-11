(() => {
  'use strict';
  const workerUrl = new URL('quadruple-worker.js', document.currentScript.src);
  const get = id => document.getElementById(id);
  const selected = new Set();
  let worker = null, result = null, attempts = 0, started = 0;
  const cells = Array.from({length:64}, (_, i) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'cell build-cell'; button.dataset.index = i;
    button.setAttribute('aria-label', `Select row ${Math.floor(i / 8) + 1}, column ${i % 8 + 1}`);
    button.onclick = () => { selected.has(i) ? selected.delete(i) : selected.add(i); update(); };
    return button;
  });
  get('builderGrid').replaceChildren(...cells);
  function update() {
    cells.forEach((cell, i) => { cell.setAttribute('aria-pressed', String(selected.has(i))); cell.textContent = selected.has(i) ? '•' : ''; });
    get('selectionCount').textContent = `${selected.size} cells selected`;
    // Results always belong to the exact displayed selection.
    result = null; get('buildResults').hidden = true;
  }
  function setBusy(busy) {
    cells.forEach(cell => cell.disabled = busy);
    for (const id of ['buildPuzzle','selectAll','clearSelection']) get(id).disabled = busy;
    get('stopBuild').disabled = !busy;
  }
  function stop(message) { worker?.terminate(); worker = null; setBusy(false); get('buildStatus').textContent = message; }
  get('selectAll').onclick = () => { for(let i=0;i<64;i++) selected.add(i); update(); };
  get('clearSelection').onclick = () => { selected.clear(); update(); };
  get('builderGrid').onkeydown = event => {
    const offset = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[event.key];
    if (offset && event.target.dataset.index !== undefined) { event.preventDefault(); cells[Math.max(0,Math.min(63,Number(event.target.dataset.index)+offset))].focus(); }
  };
  get('buildPuzzle').onclick = () => {
    if (worker) return;
    if (!selected.size) { get('buildStatus').textContent = 'Select at least one clue cell first.'; return; }
    result = null; attempts = 0; started = performance.now(); get('buildResults').hidden = true;
    setBusy(true); get('buildStatus').textContent = 'Searching for a unique puzzle…';
    try {
      const active = new Worker(workerUrl); worker = active;
      active.onmessage = ({data}) => {
        if (worker !== active) return;
        if (data.type === 'progress') { attempts = data.attempts; get('buildStatus').textContent = `Searching: ${attempts.toLocaleString()} attempts · ${((performance.now()-started)/1000).toFixed(1)} seconds. Stop at any time to change the pattern.`; }
        else if (data.type === 'result') {
          result = data;
          stop(`Build complete: exactly ${selected.size} givens · unique solution · ${data.attempts.toLocaleString()} attempts.`);
          get('buildPair').replaceChildren(QuadrupleDisplay.createPair(data.puzzle, data.solution, 1));
          get('buildResults').hidden = false;
        } else stop('The search failed. Please try again.');
      };
      active.onerror = event => { event.preventDefault(); if(worker===active) stop('The search could not start. Reload and try again.'); };
      active.postMessage({type:'build',selected:[...selected]});
    } catch { stop('Background search is unavailable in this browser.'); }
  };
  get('stopBuild').onclick = () => stop(`Search stopped after at least ${attempts.toLocaleString()} attempts. Change the pattern or try again.`);
  get('playBuilt').onclick = () => {
    if (!result) return;
    try {
      localStorage.setItem('quadruple-sudoku-progress-v1', JSON.stringify({...result, values:result.puzzle.slice(), notes:Array.from({length:64},()=>[])}));
      location.href = SudokuSite.href('quadruple', 'play');
    } catch { get('buildStatus').textContent = 'Could not save this puzzle for play. You can still copy it below.'; }
  };
  window.addEventListener('pagehide',()=>{if(worker)stop('Search stopped when leaving the page.');});
  update();
})();
