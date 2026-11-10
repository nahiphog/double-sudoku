'use strict';
importScripts('triple-sudoku.js');
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'generate') {
      self.postMessage({ type: 'result', ...await TripleSudoku.generate(Math.random, undefined, { mode: data.mode }) });
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
