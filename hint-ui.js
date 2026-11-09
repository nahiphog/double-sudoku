/* The hint engine keeps logical eliminations separate from hand-written notes. */
(() => {
  const engine = DoubleSudokuHints;
  const sessions = new Map();
  function state(key) {
    return key === 'play' ? { values: playValues, givens: playGivens } : dailyEntryState(key);
  }
  function gridFor(key) {
    return key === 'play' ? [document.querySelector('#playGrid')] : [...document.querySelectorAll(`[data-daily-entry-grid="${key}"]`)];
  }
  function session(key) {
    const fingerprint = state(key).values.join('');
    let s = sessions.get(key);
    if (!s || s.fingerprint !== fingerprint) {
      s = { fingerprint, excluded: Array.from({ length: 64 }, () => []), history: [], pending: null, active: false };
      sessions.set(key, s);
    }
    return s;
  }
  function paint(key) {
    for (const grid of gridFor(key)) {
    if (!grid) continue;
    const s = session(key), values = state(key).values;
    const panel = grid.parentElement.querySelector('[data-hint-panel]');
    if (!panel) continue;
    const text = panel.querySelector('[data-hint-message]');
    text.textContent = s.pending ? `${s.pending.technique ? s.pending.technique + ': ' : ''}${s.pending.explanation}` : s.history.length ? 'Move applied. Ask for the next hint.' : 'Get an explained logical move. Hints use all legal candidates, not your pencil notes. Editing numbers resets previous hint deductions.';
    panel.querySelector('[data-hint-apply]').disabled = s.pending?.status !== 'move';
    panel.querySelector('[data-hint-candidates]').textContent = s.active ? 'Show my notes' : 'Show solver candidates';
    panel.querySelector('[data-hint-history]').replaceChildren(...s.history.map(move => {
      const li = document.createElement('li'); li.textContent = `${move.technique}: ${move.explanation}`; return li;
    }));
    const candidates = engine.analyze(values, tiles, s.excluded).candidates;
    [...grid.children].forEach((cell, i) => {
      cell.classList.toggle('hint-source', !!s.pending?.cells?.includes(i));
      cell.classList.toggle('hint-target', !!s.pending?.eliminations?.some(e => e.cell === i));
      if (s.active && !values[i]) {
        const notes = document.createElement('span'); notes.className = 'hint-candidates';
        notes.textContent = candidates[i].join(' ');
        cell.replaceChildren(notes);
        cell.setAttribute('aria-label', `${engine.cellName(i)}, candidates ${candidates[i].join(', ')}`);
      } else cell.removeAttribute('aria-label');
    });
    }
  }
  function attach() {
    const grids = [...document.querySelectorAll('#playGrid, [data-daily-entry-grid]')];
    for (const grid of grids) {
      const key = grid.id === 'playGrid' ? 'play' : grid.dataset.dailyEntryGrid;
      if (!grid.parentElement.querySelector('[data-hint-panel]')) {
        const panel = document.createElement('section');
        panel.className = 'hint-panel'; panel.dataset.hintPanel = key;
        panel.innerHTML = '<h3>Step-by-step hints</h3><p><a href="/double-sudoku/techniques/">Learn all solving techniques →</a></p><div class="actions"><button type="button" data-hint-next>Get hint</button><button type="button" data-hint-apply disabled>Apply move</button><button type="button" data-hint-candidates>Show solver candidates</button></div><p data-hint-message role="status" aria-live="polite"></p><p class="play-help">Blue outline: cells explaining the move. Dashed orange outline: cells losing candidates. Small digits show solver candidates while hints are active.</p><details><summary>Applied moves</summary><ol data-hint-history></ol></details>';
        grid.after(panel);
        panel.querySelector('[data-hint-next]').onclick = () => {
          const s = session(key); s.active = true;
          s.pending = engine.nextHint(state(key).values, tiles, s.excluded); paint(key);
        };
        panel.querySelector('[data-hint-candidates]').onclick = () => {
          const s = session(key); s.active = !s.active;
          if (key === 'play') renderPlay(); else refreshDailyEntry(key);
        };
        panel.querySelector('[data-hint-apply]').onclick = () => {
          const s = session(key), move = s.pending;
          if (move?.status !== 'move') return;
          const current = state(key);
          for (const { cell, digit } of move.placements) if (!current.givens.has(cell)) current.values[cell] = digit;
          for (const { cell, digit } of move.eliminations) if (!s.excluded[cell].includes(digit)) s.excluded[cell].push(digit);
          s.fingerprint = current.values.join(''); s.history.push(move); s.pending = null;
          if (key === 'play') renderPlay(); else refreshDailyEntry(key);
          paint(key);
        };
      }
      paint(key);
    }
  }
  const originalPlay = renderPlay;
  renderPlay = function () { originalPlay(); attach(); };
  const originalRefresh = refreshDailyEntry;
  refreshDailyEntry = function (key) { originalRefresh(key); attach(); };
  const originalDaily = renderDaily;
  renderDaily = function () { originalDaily(); attach(); };
  // Reloading or clearing a play grid explicitly starts a fresh hint session.
  for (const id of ['loadPlay', 'clearPlay']) {
    const button = document.getElementById(id), original = button.onclick;
    button.onclick = function () { sessions.delete('play'); original.call(this); attach(); };
  }
  attach();
})();
