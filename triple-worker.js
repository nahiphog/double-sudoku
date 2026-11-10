'use strict';
importScripts('triple-sudoku.js');
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'generate') {
      let random = Math.random;
      if (typeof data.seed === 'string') {
        let seed = 2166136261;
        for (const c of data.seed) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
        random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      }
      self.postMessage({ type: 'result', ...await TripleSudoku.generate(random, undefined, { mode: data.mode }) });
    } else if (data.type === 'verify') {
      self.postMessage({ type: 'result', ...TripleSudoku.solve(data.puzzle) });
    } else if (data.type === 'build') {
      let attempts = 0, lastUpdate = 0;
      while (true) {
        const result = TripleSudoku.customAttempt(data.selected);
        attempts++;
        if (result) { self.postMessage({ type: 'result', ...result, attempts }); return; }
        if (performance.now() - lastUpdate > 100) {
          self.postMessage({ type: 'progress', attempts }); lastUpdate = performance.now();
        }
      }
    } else throw new Error('Unknown operation');
  } catch { self.postMessage({ type: 'error' }); }
};
