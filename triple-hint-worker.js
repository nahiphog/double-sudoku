'use strict';
importScripts('triple-hints.js');
self.onmessage = ({data}) => {
  try { self.postMessage(TripleSudokuHints.nextHint(data.values, data.excluded)); }
  catch { self.postMessage({status:'error',explanation:'Could not calculate a deduction. Try restarting the walkthrough.'}); }
};
