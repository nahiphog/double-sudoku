'use strict';
const engine = TripleSudoku;
const $ = selector => document.querySelector(selector);
const storageKey = 'triple-sudoku-progress-v1';
let state, digit = 1, notesMode = false, revealed = false, busy = false;
function save() { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {} }
function render() {
  const focused = document.activeElement?.dataset.cell;
  const values = revealed ? state.solution : state.values;
  const bad = engine.conflicts(values);
  $('#grid').replaceChildren(...values.map((value, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.cell = i;
    button.className = 'cell' + (state.puzzle[i] ? ' given' : '') + (bad.has(i) ? ' wrong' : '') + (!value && state.notes[i].length ? ' pencil' : '');
    button.textContent = value || state.notes[i].join(' ');
    button.setAttribute('aria-label', `Row ${Math.floor(i / 9) + 1}, column ${i % 9 + 1}, ${value || 'empty'}${state.puzzle[i] ? ', given' : ''}${!value && state.notes[i].length ? ', notes ' + state.notes[i].join(', ') : ''}${bad.has(i) ? ', conflict' : ''}`);
    button.setAttribute('aria-disabled', String(!!state.puzzle[i] || revealed));
    return button;
  }));
  if (focused !== undefined) $(`[data-cell="${focused}"]`)?.focus();
  $('#reveal').textContent = revealed ? 'Hide solution' : 'Show solution';
  $('#status').textContent = revealed ? 'Solution shown. Hide it to continue your puzzle.' : bad.size ? 'There is a conflict: each number may appear only three times per row, column and box.' : values.every(Boolean) ? 'Solved! Every row, column and box contains three of each number.' : `${state.puzzle.filter(Boolean).length} clues · unique solution · progress saved on this device`;
}
function enter(i, value) {
  if (busy || revealed || state.puzzle[i]) return;
  if (notesMode && value) {
    if (state.values[i]) return;
    const notes = state.notes[i];
    state.notes[i] = notes.includes(value) ? notes.filter(n => n !== value) : [...notes, value].sort();
  } else { state.values[i] = value; state.notes[i] = []; }
  save(); render();
}
async function newPuzzle() {
  busy = true;
  document.querySelectorAll('#playControls button').forEach(button => button.disabled = true);
  $('#grid').setAttribute('aria-busy', 'true');
  $('#status').textContent = 'Generating and checking a unique solution…';
  try {
    const generated = await engine.generate(Math.random, () => new Promise(resolve => setTimeout(resolve, 0)));
    state = { ...generated, values: generated.puzzle.slice(), notes: Array.from({ length: 81 }, () => []) };
    revealed = false; save(); render();
  } catch {
    $('#status').textContent = 'Could not generate a puzzle. Please try New puzzle again.';
  } finally {
    busy = false;
    document.querySelectorAll('#playControls button').forEach(button => button.disabled = false);
    $('#grid').setAttribute('aria-busy', 'false');
  }
}
$('#newPuzzle').onclick = newPuzzle;
$('#reset').onclick = () => { if (!state) return; state.values = state.puzzle.slice(); state.notes = Array.from({ length: 81 }, () => []); revealed = false; save(); render(); };
$('#reveal').onclick = () => { if (state) { revealed = !revealed; render(); } };
document.querySelectorAll('[data-digit]').forEach(button => button.onclick = () => {
  digit = Number(button.dataset.digit);
  document.querySelectorAll('[data-digit]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.digit) === digit)));
});
$('#notes').onclick = () => { notesMode = !notesMode; $('#notes').setAttribute('aria-pressed', String(notesMode)); };
$('#grid').onclick = event => { const cell = event.target.closest('[data-cell]'); if (cell) enter(Number(cell.dataset.cell), digit); };
$('#grid').onkeydown = event => {
  const cell = event.target.closest('[data-cell]');
  if (!cell) return;
  const i = Number(cell.dataset.cell);
  if (/^[1-3]$/.test(event.key) || ['Backspace', 'Delete', '0'].includes(event.key)) {
    event.preventDefault(); enter(i, /^[1-3]$/.test(event.key) ? Number(event.key) : 0);
  }
  const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[event.key];
  if (offset) { event.preventDefault(); $(`[data-cell="${Math.max(0, Math.min(80, i + offset))}"]`).focus(); }
};
$('#copy').onclick = async () => {
  if (!state) return;
  try { await navigator.clipboard.writeText(state.puzzle.map(n => n || '.').join('')); $('#status').textContent = 'Puzzle copied: 81 cells, with dots for blanks.'; }
  catch { $('#status').textContent = 'Clipboard access is unavailable in this browser.'; }
};
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && engine.validInput(saved.puzzle) && engine.validInput(saved.values) && engine.validInput(saved.solution) && saved.solution.every(Boolean) && !engine.conflicts(saved.solution).size && saved.puzzle.every((n, i) => !n || n === saved.solution[i] && saved.values[i] === n) && Array.isArray(saved.notes) && saved.notes.length === 81 && saved.notes.every(a => Array.isArray(a) && a.every(n => [1, 2, 3].includes(n)))) {
    const result = engine.solve(saved.puzzle);
    if (result.complete && result.count === 1) state = saved;
  }
} catch {}
if (state) { render(); $('#grid').setAttribute('aria-busy', 'false'); } else newPuzzle();
