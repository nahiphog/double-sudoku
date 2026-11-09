/* Versioned, per-puzzle saves. A failed write must never interrupt a move. */
(function (root) {
  const prefix = 'double-sudoku:progress:v1:';
  const validGrid = a => Array.isArray(a) && a.length === 64 && a.every(n => Number.isInteger(n) && n >= 0 && n <= 4);
  function valid(record) {
    return record && record.version === 1 && validGrid(record.puzzle) && validGrid(record.values) &&
      record.puzzle.every((n, i) => !n || record.values[i] === n) &&
      Array.isArray(record.notes) && record.notes.length === 64 &&
      record.notes.every(a => Array.isArray(a) && a.every(n => Number.isInteger(n) && n >= 1 && n <= 4));
  }
  function create(getStorage, onError = () => {}) {
    return {
      load(key, puzzle) {
        try {
          const record = JSON.parse(getStorage().getItem(prefix + key));
          if (!valid(record) || (puzzle && record.puzzle.some((n, i) => n !== puzzle[i]))) return null;
          return { values: record.values, givens: new Set(record.puzzle.flatMap((n, i) => n ? [i] : [])), notes: record.notes.map(a => new Set(a)) };
        } catch { return null; }
      },
      save(key, state) {
        const record = { version: 1, puzzle: state.values.map((n, i) => state.givens.has(i) ? n : 0), values: state.values, notes: state.notes.map(a => [...a]) };
        if (!valid(record)) return false;
        try { getStorage().setItem(prefix + key, JSON.stringify(record)); return true; }
        catch { onError(); return false; }
      }
    };
  }
  root.SudokuProgress = { create };
  if (typeof module !== 'undefined') module.exports = { create };
})(globalThis);
