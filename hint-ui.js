/* The hint engine keeps logical eliminations separate from hand-written notes. */
(() => {
  const engine = DoubleSudokuHints;
  const sessions = new Map();
  let techniqueDialog;
  function showTechnique(section, technique, opener) {
    if (!techniqueDialog) {
      techniqueDialog = document.createElement('dialog');
      techniqueDialog.className = 'hint-technique-dialog';
      techniqueDialog.setAttribute('aria-labelledby', 'hint-technique-title');
      techniqueDialog.setAttribute('aria-modal', 'false');
      techniqueDialog.innerHTML = '<header><h2 id="hint-technique-title"></h2><button type="button" data-hint-drag title="Drag to move, or use arrow keys" aria-label="Move explanation: drag or use arrow keys">↔ Move</button><button type="button" data-hint-close>Close explanation</button></header><iframe title="Technique explanation and interactive grid example"></iframe>';
      document.body.append(techniqueDialog);
      techniqueDialog.querySelector('[data-hint-close]').onclick = () => techniqueDialog.close();
      const header = techniqueDialog.querySelector('header');
      function moveTo(left, top) {
        const rect = techniqueDialog.getBoundingClientRect();
        techniqueDialog.style.left = `${Math.max(0, Math.min(left, innerWidth - rect.width))}px`;
        techniqueDialog.style.top = `${Math.max(0, Math.min(top, innerHeight - rect.height))}px`;
        techniqueDialog.style.right = 'auto';
      }
      let drag;
      header.addEventListener('pointerdown', event => {
        if (event.button !== 0 || event.target.closest('[data-hint-close]')) return;
        const rect = techniqueDialog.getBoundingClientRect();
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
        header.setPointerCapture(event.pointerId);
        techniqueDialog.classList.add('dragging');
        event.preventDefault();
      });
      header.addEventListener('pointermove', event => {
        if (drag?.id === event.pointerId) moveTo(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y);
      });
      function stopDrag() { drag = null; techniqueDialog.classList.remove('dragging'); }
      header.addEventListener('lostpointercapture', stopDrag);
      header.addEventListener('pointerup', stopDrag);
      header.addEventListener('pointercancel', stopDrag);
      header.querySelector('[data-hint-drag]').addEventListener('keydown', event => {
        const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
        if (!direction) return;
        event.preventDefault();
        const rect = techniqueDialog.getBoundingClientRect(), step = event.shiftKey ? 50 : 20;
        moveTo(rect.left + direction[0] * step, rect.top + direction[1] * step);
      });
      window.addEventListener('resize', () => {
        if (!techniqueDialog.open) return;
        const rect = techniqueDialog.getBoundingClientRect(); moveTo(rect.left, rect.top);
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && techniqueDialog.open) techniqueDialog.close();
      });
      // Escape also works while keyboard focus is inside the example frame.
      techniqueDialog.querySelector('iframe').addEventListener('load', event => {
        event.target.contentDocument?.addEventListener('keydown', event => {
          if (event.key === 'Escape') { event.preventDefault(); techniqueDialog.close(); }
        });
      });
    }
    techniqueDialog.querySelector('h2').textContent = technique;
    techniqueDialog.querySelector('iframe').src = `/double-sudoku/techniques/?example=${encodeURIComponent(section)}`;
    techniqueDialog.onclose = () => {
      if (opener.isConnected && (document.activeElement === document.body || techniqueDialog.contains(document.activeElement))) opener.focus();
    };
    if (!techniqueDialog.open) techniqueDialog.show();
  }
  function techniqueLink(technique) {
    const section = {
      'Naked single': 'naked-single', 'Hidden single': 'hidden-single',
      'Two forced copies': 'forced-copies',
      'Naked pair': 'naked-pair', 'Naked triple': 'naked-triple', 'Naked quadruple': 'naked-quadruple',
      'Hidden pair': 'hidden-pair', 'Hidden triple': 'hidden-triple', 'Hidden quadruple': 'hidden-quadruple',
      'Locked candidates (pointing)': 'pointing', 'Locked candidates (claiming)': 'claiming',
      'X-Wing': 'x-wing', 'Swordfish': 'swordfish', 'Jellyfish': 'jellyfish',
      'Fish': 'fish', 'Short forcing chain': 'forcing-chain'
    }[technique?.replace(/ \(remaining copies\)$/, '')];
    if (!section) return null;
    const link = document.createElement('button');
    link.type = 'button';
    link.setAttribute('aria-haspopup', 'dialog');
    link.textContent = `Learn ${technique}: explanation and visual example`;
    link.onclick = () => showTechnique(section, technique, link);
    return link;
  }
  function state(key) {
    return { values: playValues, givens: playGivens };
  }
  function gridFor(key) {
    return [document.querySelector('#playGrid')];
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
    text.textContent = s.pending ? s.pending.proof ? 'Short forcing chain: follow the temporary assumption to a contradiction. Only the final candidate removal will be applied.' : `${s.pending.technique ? s.pending.technique + ': ' : ''}${s.pending.explanation}` : s.history.length ? 'Move applied. Ask for the next hint.' : 'Get an explained logical move. Hints use all legal candidates, not your pencil notes. Editing numbers resets previous hint deductions.';
    let proof = panel.querySelector('.hint-proof');
    if (!proof) { proof = document.createElement('ol'); proof.className = 'hint-proof'; text.after(proof); }
    proof.hidden = !s.pending?.proof;
    proof.replaceChildren(...(s.pending?.proof || []).map(reason => {
      const li = document.createElement('li'); li.textContent = reason; return li;
    }));
    let guide = panel.querySelector('[data-hint-guide]');
    if (!guide) { guide = document.createElement('p'); guide.dataset.hintGuide = ''; proof.after(guide); }
    const link = techniqueLink(s.pending?.technique);
    guide.hidden = !link;
    guide.replaceChildren(...(link ? [link] : []));
    panel.querySelector('[data-hint-apply]').disabled = s.pending?.status !== 'move';
    panel.querySelector('[data-hint-candidates]').textContent = s.active ? 'Show my notes' : 'Show solver candidates';
    panel.querySelector('[data-hint-history]').replaceChildren(...s.history.map(move => {
      const li = document.createElement('li'); li.textContent = `${move.technique}: ${move.explanation}`;
      const link = techniqueLink(move.technique);
      if (link) { const guide = document.createElement('p'); guide.append(link); li.append(guide); }
      return li;
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
    const grids = [...document.querySelectorAll('#playGrid')];
    for (const grid of grids) {
      const key = 'play';
      if (!grid.parentElement.querySelector('[data-hint-panel]')) {
        const panel = document.createElement('section');
        panel.className = 'hint-panel'; panel.dataset.hintPanel = key;
        panel.innerHTML = '<h3>Step-by-step hints</h3><p><a href="/double-sudoku/double/techniques/">Learn all solving techniques →</a></p><div class="actions"><button type="button" data-hint-next>Get hint</button><button type="button" data-hint-apply disabled>Apply move</button><button type="button" data-hint-candidates>Show solver candidates</button></div><p data-hint-message role="status" aria-live="polite"></p><p class="play-help">Blue outline: cells explaining the move. Dashed orange outline: cells losing candidates. Small digits show solver candidates while hints are active.</p><details><summary>Applied moves</summary><ol data-hint-history></ol></details>';
        grid.after(panel);
        panel.querySelector('[data-hint-next]').onclick = () => {
          const s = session(key); s.active = true;
          s.pending = engine.nextHint(state(key).values, tiles, s.excluded); paint(key);
        };
        panel.querySelector('[data-hint-candidates]').onclick = () => {
          const s = session(key); s.active = !s.active;
          renderPlay();
        };
        panel.querySelector('[data-hint-apply]').onclick = () => {
          const s = session(key), move = s.pending;
          if (move?.status !== 'move') return;
          const current = state(key);
          for (const { cell, digit } of move.placements) if (!current.givens.has(cell)) current.values[cell] = digit;
          for (const { cell, digit } of move.eliminations) if (!s.excluded[cell].includes(digit)) s.excluded[cell].push(digit);
          s.fingerprint = current.values.join(''); s.history.push(move); s.pending = null;
          renderPlay();
          paint(key);
        };
      }
      paint(key);
    }
  }
  const originalPlay = renderPlay;
  renderPlay = function () { originalPlay(); attach(); };
  // Reloading or clearing a play grid explicitly starts a fresh hint session.
  for (const id of ['loadPlay', 'clearPlay']) {
    const button = document.getElementById(id), original = button.onclick;
    button.onclick = function () { sessions.delete('play'); original.call(this); attach(); };
  }
  attach();
})();
