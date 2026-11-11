(() => {
'use strict';
  function exampleGrid(values, puzzle, label) {
    const grid = document.createElement('div');
    grid.className = 'simulation-grid';
    grid.setAttribute('aria-label', label);
    grid.replaceChildren(...values.map((n, i) => {
      const cell = document.createElement('span');
      cell.className = 'simulation-cell' + (n!==null && puzzle[i]===null ? ' simulation-filled' : '');
      cell.textContent = n ?? '';
      cell.setAttribute('aria-label', `Row ${Math.floor(i / 8) + 1}, column ${i % 8 + 1}, ${n ?? 'empty'}`);
      return cell;
    }));
    return grid;
  }

  function gridImage(values, puzzle) {
    const canvas = document.createElement('canvas');
    const cellSize = 60, margin = 12, boardSize = cellSize * 8;
    canvas.width = canvas.height = boardSize + margin * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    values.forEach((n, i) => {
      if (n===null) return;
      ctx.fillStyle = puzzle[i]!==null ? '#111' : '#1455c0';
      ctx.fillText(String(n), margin + (i % 8 + 0.5) * cellSize, margin + (Math.floor(i / 8) + 0.5) * cellSize);
    });
    ctx.strokeStyle = '#111';
    for(let i=0;i<64;i++){const x=margin+(i%8)*cellSize,y=margin+Math.floor(i/8)*cellSize,b=QuadrupleSudoku.borders(i);ctx.lineWidth=b.right?4:1;ctx.beginPath();ctx.moveTo(x+cellSize,y);ctx.lineTo(x+cellSize,y+cellSize);ctx.stroke();ctx.lineWidth=b.bottom?4:1;ctx.beginPath();ctx.moveTo(x,y+cellSize);ctx.lineTo(x+cellSize,y+cellSize);ctx.stroke();}ctx.lineWidth=4;ctx.strokeRect(margin,margin,boardSize,boardSize);
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image unavailable')), 'image/png'));
  }

  function copyControls(values, puzzle, label, number, field) {
    const controls = document.createElement('div');
    controls.className = 'actions';
    const status = document.createElement('p');
    status.className = 'help simulation-copy-status';
    status.setAttribute('role', 'status');
    for (const format of ['text', 'image']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `Copy ${format}`;
      button.dataset.copyFormat = format;
      button.setAttribute('aria-label', `Copy ${label.toLowerCase()} ${number} as ${format}`);
      button.onclick = async () => {
        button.disabled = true;
        status.textContent = `Copying ${format}…`;
        try {
          if (format === 'text') {
            await navigator.clipboard.writeText(field.value);
          } else {
            if (!navigator.clipboard?.write || !window.ClipboardItem) throw new Error('Image clipboard unavailable');
            // Supply the PNG promise during the click to retain user activation
            // in browsers that do not allow clipboard writes after an await.
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': gridImage(values, puzzle) })]);
          }
          status.textContent = `${label} ${format} copied.`;
        } catch {
          status.textContent = format === 'text' ? 'Could not copy text. Select and copy the string below.' : 'Could not copy the image. Your browser may not support image copying or clipboard access may be blocked.';
          if (format === 'text') { field.focus(); field.select(); }
        } finally { button.disabled = false; }
      };
      controls.append(button);
    }
    return [controls, status];
  }

  function createPair(puzzle, solution, number) {
    const pair = document.createElement('div');
    pair.className = 'simulation-pair';
    for (const [values, label, kind] of [[puzzle, 'Dug puzzle', 'puzzle'], [solution, 'Completed grid', 'solution']]) {
      const side = document.createElement('section');
      const heading = document.createElement('h5');
      heading.textContent = label;
      side.append(heading, exampleGrid(values, puzzle, `${label}, example ${number}`));
      const fieldLabel = document.createElement('label');
      const field = document.createElement('textarea');
      field.id = `simulation-${kind}-${number}`;
      field.className = `simulation-${kind}-string`;
      field.readOnly = true; field.rows = 3; field.spellcheck = false;
      field.value = QuadrupleSudoku.stringify(values);
      fieldLabel.htmlFor = field.id;
      fieldLabel.textContent = kind === 'puzzle' ? 'Puzzle string (dots are blanks)' : 'Completed grid string';
      side.append(...copyControls(values, puzzle, label, number, field), fieldLabel, field);
      pair.append(side);
    }
    return pair;
  }
  globalThis.QuadrupleDisplay = { createPair };
})();
