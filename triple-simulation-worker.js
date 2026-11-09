'use strict';
importScripts('triple-sudoku.js');

// A dedicated worker keeps unlimited uniqueness searches off the UI thread.
// Stopping terminates the worker: only fully dug puzzles are ever reported.
self.onmessage = async ({ data }) => {
  if (!Number.isSafeInteger(data.trials) || data.trials < 1 || data.trials > 1000000) {
    self.postMessage({ type: 'error', message: 'Enter a whole number of trials from 1 to 1,000,000.' });
    return;
  }
  try {
    for (let completed = 1; completed <= data.trials; completed++) {
      const { puzzle } = await TripleSudoku.generate();
      self.postMessage({ type: 'sample', puzzle, completed });
    }
    self.postMessage({ type: 'done' });
  } catch {
    self.postMessage({ type: 'error', message: 'The simulation could not finish. Completed results have been kept; try a new run.' });
  }
};
