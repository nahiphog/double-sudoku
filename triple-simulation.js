(() => {
  'use strict';
  const workerUrl = new URL('triple-simulation-worker.js', document.currentScript.src);
  const get = id => document.getElementById(id);
  let worker = null, frequencies = new Map(), completed = 0, target = 0;
  let sum = 0, threshold = 30, started = 0;

  function render() {
    get('simulationProgress').value = completed;
    get('simulationResults').hidden = completed === 0;
    const matches = get('simulationExamples').childElementCount;
    get('simulationExampleTitle').textContent = `Puzzles with at most ${threshold} clues · ${matches} ${matches === 1 ? 'puzzle' : 'puzzles'}`;
    get('simulationMatches').textContent = matches ? `${matches.toLocaleString()} of ${completed.toLocaleString()} completed puzzles have ${threshold} or fewer clues.` : `No puzzles with ${threshold} or fewer clues found in ${completed.toLocaleString()} completed trials.`;
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

  function showExample(puzzle, solution, clues, trial) {
    const examples = get('simulationExamples');
    const number = examples.childElementCount + 1;
    const article = document.createElement('article');
    article.className = 'simulation-example';
    article.dataset.trial = trial;
    article.dataset.clues = clues;
    const title = document.createElement('h4');
    title.textContent = `Example ${number} · ${clues} clues · trial ${trial}`;
    article.append(title);
    const pair = TripleDisplay.createPair(puzzle, solution, number);
    article.append(pair);
    examples.append(article);
  }

  function finish(message) {
    worker?.terminate();
    worker = null;
    render();
    get('simulationRun').disabled = false;
    get('simulationTrials').disabled = false;
    get('simulationThreshold').disabled = false;
    get('simulationDigMode').disabled = false;
    get('simulationStop').disabled = true;
    get('simulationStatus').textContent = message;
  }

  get('simulationForm').onsubmit = event => {
    event.preventDefault();
    if (worker) return;
    const trials = Number(get('simulationTrials').value);
    const chosenThreshold = Number(get('simulationThreshold').value);
    if (!Number.isSafeInteger(trials) || trials < 1 || trials > 1000000) {
      get('simulationStatus').textContent = 'Enter a whole number of trials from 1 to 1,000,000.';
      return;
    }
    if (get('simulationThreshold').value.trim() === '' || !Number.isInteger(chosenThreshold) || chosenThreshold < 0 || chosenThreshold > 81) {
      get('simulationStatus').textContent = 'Enter a whole-number clue threshold from 0 to 81.';
      return;
    }
    target = trials; completed = 0; sum = 0; threshold = chosenThreshold;
    frequencies = new Map(); started = performance.now();
    get('simulationProgress').max = target;
    get('simulationHistogram').replaceChildren();
    get('simulationTable').replaceChildren();
    get('simulationExamples').replaceChildren();
    get('simulationExample').open = false;
    render();
    get('simulationRun').disabled = true;
    get('simulationTrials').disabled = true;
    get('simulationThreshold').disabled = true;
    get('simulationDigMode').disabled = true;
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
          if (clues <= threshold) showExample(data.puzzle, data.solution, clues, completed);
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
      activeWorker.postMessage({ trials, mode: get('simulationDigMode').value });
    } catch {
      finish('Background simulation is unavailable in this browser. Try a browser with Web Worker support.');
    }
  };
  get('simulationStop').onclick = () => finish(`Simulation stopped: ${completed.toLocaleString()} of ${target.toLocaleString()} trials. The unfinished puzzle was not counted.`);
  window.addEventListener('pagehide', () => {
    if (worker) finish(`Simulation stopped: ${completed.toLocaleString()} of ${target.toLocaleString()} trials.`);
  });
})();
