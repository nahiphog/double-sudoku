'use strict';
importScripts('quadruple-sudoku.js','quadruple-hints.js');
self.onmessage = ({data}) => {
  try { self.postMessage(QuadrupleSudokuHints.nextHint(data.values, data.excluded)); }
  catch { self.postMessage({status:'error',explanation:'Could not calculate a deduction. Try restarting the walkthrough.'}); }
};
