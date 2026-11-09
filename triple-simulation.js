(() => {
  'use strict';
  const workerUrl = new URL('triple-simulation-worker.js', document.currentScript.src);
  const get = id => document.getElementById(id);
  let worker = null, frequencies = new Map(), completed = 0, target = 0;
  let sum = 0, smallest = null, started = 0;

  function render() {
    get('simulationProgress').value = completed;
    get('simulationResults').hidden = completed === 0;
    if (!completed) return;
    const counts = [...frequencies.keys()].sort((a, b) => a - b);
    const min = counts[0], max = counts[counts.length - 1];
    const peak = Math.max(...frequencies.values());
    const elapsed = performance.now() - started;
    get('simulationSummary').textContent = `${completed.toLocaleString()} completed · mean ${(sum / completed).toFixed(2)} clues · min ${min} · max ${max} · ${(elapsed / 1000).toFixed(1)} seconds · ${(elapsed / completed).toFixed(1)} ms/puzzle`;
    const bars = [], rows = [];
    // Include unobserved counts between the extremes to preserve the scale.
    for (let clues = min; clues <= max; clues++) {
      const count = frequencies.get(clues) || 0;
      const percentage = (100 * count / completed).toFixed(1);
      const bar = document.createElement('div');
      bar.className = 'simulation-bar-row';
      bar.dataset.clues = clues;
      bar.dataset.count = count;
      bar.setAttribute('aria-label', `${clues} clues: ${count} puzzles, ${percentage} percent`);
      bar.innerHTML = `<span>${clues}</span><span class="simulation-bar-track"><span class="simulation-bar" style="width:${100 * count / peak}%"></span></span><span>${count} (${percentage}%)</span>`;
      bars.push(bar);
      const row = document.createElement('tr');
      row.innerHTML = `<th scope="row">${clues}</th><td>${count}</td><td>${percentage}%</td>`;
      rows.push(row);
    }
    get('simulationHistogram').replaceChildren(...bars);
    get('simulationTable').replaceChildren(...rows);
  }

  function exampleGrid(values, puzzle, label) {
    const grid = document.createElement('div');
    grid.className = 'simulation-grid';
    grid.setAttribute('aria-label', label);
    grid.replaceChildren(...values.map((n, i) => {
      const cell = document.createElement('span');
      cell.className = 'simulation-cell' + (n && !puzzle[i] ? ' simulation-filled' : '');
      cell.textContent = n || '';
      cell.setAttribute('aria-label', `Row ${Math.floor(i / 9) + 1}, column ${i % 9 + 1}, ${n || 'empty'}`);
      return cell;
    }));
    return grid;
  }

  function gridImage(values, puzzle) {
    const canvas = document.createElement('canvas');
    const cellSize = 60, margin = 12, boardSize = cellSize * 9;
    canvas.width = canvas.height = boardSize + margin * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    values.forEach((n, i) => {
      if (!n) return;
      ctx.fillStyle = puzzle[i] ? '#111' : '#1455c0';
      ctx.fillText(String(n), margin + (i % 9 + 0.5) * cellSize, margin + (Math.floor(i / 9) + 0.5) * cellSize);
    });
    ctx.strokeStyle = '#111';
    for (let line = 0; line <= 9; line++) {
      ctx.lineWidth = line % 3 === 0 ? 4 : 1;
      const offset = margin + line * cellSize;
      ctx.beginPath();
      ctx.moveTo(offset, margin); ctx.lineTo(offset, margin + boardSize);
      ctx.moveTo(margin, offset); ctx.lineTo(margin + boardSize, offset);
      ctx.stroke();
    }
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

  function showExample(puzzle, solution, clues, trial) {
    const examples = get('simulationExamples');
    const number = examples.childElementCount + 1;
    const article = document.createElement('article');
    article.className = 'simulation-example';
    article.dataset.trial = trial;
    const title = document.createElement('h4');
    title.textContent = `Example ${number} · trial ${trial}`;
    article.append(title);
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
      field.value = values.map(n => n || '.').join('');
      fieldLabel.htmlFor = field.id;
      fieldLabel.textContent = kind === 'puzzle' ? 'Puzzle string (dots are blanks)' : 'Completed grid string';
      side.append(...copyControls(values, puzzle, label, number, field), fieldLabel, field);
      pair.append(side);
    }
    article.append(pair);
    examples.append(article);
    get('simulationExampleTitle').textContent = `Fewest-clue examples: ${clues} clues · ${number} ${number === 1 ? 'puzzle' : 'puzzles'}`;
  }

  function finish(message) {
    worker?.terminate();
    worker = null;
    render();
    get('simulationRun').disabled = false;
    get('simulationTrials').disabled = false;
    get('simulationStop').disabled = true;
    get('simulationStatus').textContent = message;
  }

  get('simulationForm').onsubmit = event => {
    event.preventDefault();
    if (worker) return;
    const trials = Number(get('simulationTrials').value);
    if (!Number.isSafeInteger(trials) || trials < 1 || trials > 1000000) {
      get('simulationStatus').textContent = 'Enter a whole number of trials from 1 to 1,000,000.';
      return;
    }
    target = trials; completed = 0; sum = 0; smallest = null;
    frequencies = new Map(); started = performance.now();
    get('simulationProgress').max = target;
    get('simulationHistogram').replaceChildren();
    get('simulationTable').replaceChildren();
    get('simulationExamples').replaceChildren();
    get('simulationExampleTitle').textContent = 'Fewest-clue examples';
    get('simulationExample').open = false;
    render();
    get('simulationRun').disabled = true;
    get('simulationTrials').disabled = true;
    get('simulationStop').disabled = false;
    get('simulationStatus').textContent = `Simulating 0 of ${target.toLocaleString()} trials…`;
    try {
      const activeWorker = new Worker(workerUrl);
      worker = activeWorker;
      activeWorker.onmessage = ({ data }) => {
        if (worker !== activeWorker) return;
        if (data.type === 'sample') {
          const clues = data.puzzle.filter(Boolean).length;
          completed = data.completed; sum += clues;
          frequencies.set(clues, (frequencies.get(clues) || 0) + 1);
          if (smallest === null || clues < smallest) {
            smallest = clues;
            get('simulationExamples').replaceChildren();
          }
          if (clues === smallest) showExample(data.puzzle, data.solution, clues, completed);
          render();
          get('simulationStatus').textContent = `Simulating ${completed.toLocaleString()} of ${target.toLocaleString()} trials…`;
        } else if (data.type === 'done') {
          finish(`Simulation complete: ${completed.toLocaleString()} of ${target.toLocaleString()} trials.`);
        } else if (data.type === 'error') finish(data.message);
      };
      activeWorker.onerror = event => {
        event.preventDefault();
        if (worker === activeWorker) finish('The simulation could not finish. Completed results have been kept. Reload the page and try again.');
      };
      activeWorker.postMessage({ trials });
    } catch {
      finish('Background simulation is unavailable in this browser. Try a browser with Web Worker support.');
    }
  };
  get('simulationStop').onclick = () => finish(`Simulation stopped: ${completed.toLocaleString()} of ${target.toLocaleString()} trials. The unfinished puzzle was not counted.`);
  window.addEventListener('pagehide', () => {
    if (worker) finish(`Simulation stopped: ${completed.toLocaleString()} of ${target.toLocaleString()} trials.`);
  });
})();
