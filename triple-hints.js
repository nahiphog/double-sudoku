(function (root) {
  'use strict';
  const digits = [1, 2, 3];
  const cellName = i => `r${Math.floor(i / 9) + 1}c${(i % 9) + 1}`;
  const names = cells => cells.map(cellName).join(', ');
  function combinations(items, size, start = 0, prefix = [], out = []) {
    if (prefix.length === size) out.push(prefix);
    else for (let i = start; i < items.length; i++) combinations(items, size, i + 1, [...prefix, items[i]], out);
    return out;
  }
  function unitsFor() {
    return [
      ...Array.from({length:9},(_,r)=>({name:'row '+(r+1),cells:Array.from({length:9},(_,c)=>r*9+c)})),
      ...Array.from({length:9},(_,c)=>({name:'column '+(c+1),cells:Array.from({length:9},(_,r)=>r*9+c)})),
      ...Array.from({length:9},(_,b)=>({name:'box '+(b+1),cells:Array.from({length:9},(_,k)=>(Math.floor(b/3)*3+Math.floor(k/3))*9+(b%3)*3+k%3)}))
    ];
  }
  function analyze(values, excluded = Array.from({ length: 81 }, () => [])) {
    if (!Array.isArray(values) || values.length !== 81 || values.some(n=>!Number.isInteger(n)||n<0||n>3)) return {candidates:[],error:'Enter 81 cells using only 1, 2, 3 or blanks.'};
    const units = unitsFor().map(unit => ({ ...unit, remaining: digits.map(d => 3 - unit.cells.filter(i => values[i] === d).length) }));
    const candidates = values.map((value, i) => value ? [] : digits.filter(d =>
      !excluded[i]?.includes(d) && units.filter(u => u.cells.includes(i)).every(u => u.remaining[d - 1] > 0)));
    const error = units.find(u => u.remaining.some(n => n < 0));
    if (error) return { candidates, error: `${error.name} contains more than three copies of a digit. Correct the entries before asking for a hint.` };
    const empty = values.findIndex((v, i) => !v && !candidates[i].length);
    if (empty !== -1) return { candidates, error: `${cellName(empty)} has no legal candidate. Check your entries.` };
    for (const u of units) for (const d of digits) {
      if (u.cells.filter(i => candidates[i].includes(d)).length < u.remaining[d - 1])
        return { candidates, error: `${u.name} has too few available cells for its remaining ${d}s. Check your entries.` };
    }
    return { candidates, units };
  }
  function nextHint(values, excluded) {
    const { candidates: c, units, error } = analyze(values, excluded);
    if (error) return { status: 'contradiction', explanation: error };
    if (values.every(Boolean)) return { status: 'solved', explanation: 'Solved! Every row, column and box contains three copies of each digit.' };
    const move = (technique, explanation, cells, placements = [], eliminations = []) => ({ status: 'move', technique, explanation, cells, placements, eliminations });
    for (const u of units) for (const d of digits) if (u.remaining[d-1] === 0) {
      const eliminations = u.cells.filter(i=>!values[i] && !excluded?.[i]?.includes(d)).map(cell=>({cell,digit:d}));
      if (eliminations.length) return move('Completed digit count', u.name+' already contains all three copies of '+d+'. Remove '+d+' from its remaining empty cells.', u.cells.filter(i=>values[i]===d), [], eliminations);
    }
    const single = c.findIndex(ds => ds.length === 1);
    if (single !== -1) return move('Naked single', `${cellName(single)} has only one remaining candidate: ${c[single][0]}. Place ${c[single][0]}. Other digits are ruled out by completed three-copy counts or earlier deductions.`, [single], [{ cell: single, digit: c[single][0] }]);
    for (const u of units) for (const d of digits) {
      const count = u.remaining[d - 1], cells = u.cells.filter(i => c[i].includes(d));
      if (count > 0 && cells.length === count) return move(count === 1 ? 'Hidden single' : count === 2 ? 'Two forced copies' : 'Three forced copies', `${u.name} needs ${count} more ${d}${count > 1 ? 's' : ''}, and only ${names(cells)} can hold ${d}. ${count === 1 ? 'Fill that cell' : 'Fill all these cells'} with ${d}.`, cells, cells.map(cell => ({ cell, digit: d })));
    }
    const label = ['', '', 'pair', 'triple', 'quadruple', 'quintuple', 'sextuple'];
    for (let size = 2; size <= 6; size++) for (const u of units) {
      const empty = u.cells.filter(i => !values[i]);
      const counts = ds => ds.map(d => `${u.remaining[d - 1]} × ${d}`).join(' + ');
      for (const cells of combinations(empty, size)) {
        const ds = [...new Set(cells.flatMap(i => c[i]))].sort();
        if (ds.reduce((n, d) => n + u.remaining[d - 1], 0) !== size) continue;
        const eliminations = empty.filter(i => !cells.includes(i)).flatMap(cell => c[cell].filter(d => ds.includes(d)).map(digit => ({ cell, digit })));
        if (eliminations.length) return move(`Naked ${label[size]} (remaining copies)`, `In ${u.name}, ${names(cells)} can contain only ${ds.join(', ')}. This unit still needs ${counts(ds)}: exactly ${size} copies for ${size} cells. These cells use every remaining copy, so remove ${ds.join(', ')} from the other empty cells in this unit.`, cells, [], eliminations);
      }
      for (let mask = 1; mask < 7; mask++) {
        const ds = digits.filter(d => mask & (1 << (d - 1)));
        if (ds.some(d => u.remaining[d - 1] === 0) || ds.reduce((n, d) => n + u.remaining[d - 1], 0) !== size) continue;
        const cells = empty.filter(i => c[i].some(d => ds.includes(d)));
        if (cells.length !== size) continue;
        const eliminations = cells.flatMap(cell => c[cell].filter(d => !ds.includes(d)).map(digit => ({ cell, digit })));
        if (eliminations.length) return move(`Hidden ${label[size]} (remaining copies)`, `In ${u.name}, the remaining ${counts(ds)} can go only in ${names(cells)}. Those ${size} required copies fill all ${size} cells, so remove every other candidate from these cells.`, cells, [], eliminations);
      }
    }
    return findLocked(values, excluded) || findFish(values, excluded) || findForcing(values, excluded) ||
      { status: 'stuck', explanation: 'No move found using singles, subsets, locked candidates, fish of up to four lines, or forcing chains of up to six placements. These bounded techniques may not finish every puzzle; no guess has been applied.' };
  }
  const deduction = (technique, explanation, cells, eliminations, extra = {}) => ({ status: 'move', technique, explanation, cells, placements: [], eliminations, ...extra });
  function findLocked(values, excluded) {
    const { candidates: c, units, error } = analyze(values, excluded);
    if (error) return null;
    for (let a = 0; a < units.length; a++) for (let b = 0; b < units.length; b++) {
      // Only line/region intersections, in both directions.
      if ((a < 18) === (b < 18)) continue;
      const source = units[a], target = units[b];
      for (const d of digits) {
        const needed = source.remaining[d - 1], capacity = target.remaining[d - 1];
        if (!needed || needed !== capacity) continue;
        const cells = source.cells.filter(i => c[i].includes(d));
        if (!cells.length || !cells.every(i => target.cells.includes(i))) continue;
        const eliminations = target.cells.filter(i => !source.cells.includes(i) && c[i].includes(d)).map(cell => ({ cell, digit: d }));
        if (eliminations.length) return deduction(`Locked candidates (${a >= 18 ? 'pointing' : 'claiming'})`, `${source.name} needs ${needed} more ${d}${needed > 1 ? 's' : ''}, all confined to ${names(cells)} in ${target.name}. ${target.name} also needs exactly ${capacity}, so these copies fill its remaining allowance. Remove ${d} from ${names(eliminations.map(e => e.cell))} outside the intersection.`, cells, eliminations);
      }
    }
    return null;
  }
  function findFish(values, excluded) {
    const { candidates: c, units, error } = analyze(values, excluded);
    if (error) return null;
    for (let size = 2; size <= 4; size++) for (const rows of [true, false]) for (const d of digits) {
      const bases = units.slice(rows ? 0 : 9, rows ? 9 : 18).filter(u => u.remaining[d - 1] > 0);
      const covers = units.slice(rows ? 9 : 0, rows ? 18 : 9);
      for (const selected of combinations(bases, size)) {
        const cells = selected.flatMap(u => u.cells.filter(i => c[i].includes(d)));
        const selectedCovers = covers.filter(u => cells.some(i => u.cells.includes(i)));
        if (selectedCovers.length < 2 || selectedCovers.length > 4) continue;
        const required = selected.reduce((n, u) => n + u.remaining[d - 1], 0);
        const capacity = selectedCovers.reduce((n, u) => n + u.remaining[d - 1], 0);
        if (required !== capacity) continue;
        const baseCells = new Set(selected.flatMap(u => u.cells));
        const eliminations = selectedCovers.flatMap(u => u.cells.filter(i => !baseCells.has(i) && c[i].includes(d)).map(cell => ({ cell, digit: d })));
        if (!eliminations.length) continue;
        const name = selectedCovers.length === size ? ['', '', 'X-Wing', 'Swordfish', 'Jellyfish'][size] : 'Fish';
        const counts = us => us.map(u => `${u.name} needs ${u.remaining[d - 1]}`).join('; ');
        return deduction(`${name} (remaining copies)`, `For digit ${d}: ${counts(selected)} (${required} copies total). All their candidates lie in ${selectedCovers.map(u => u.name).join(', ')}. Those covering units have exactly ${capacity} spaces left for ${d} (${counts(selectedCovers)}). The selected lines fill that capacity, so remove ${d} from ${names(eliminations.map(e => e.cell))} in the other lines.`, cells, eliminations);
      }
    }
    return null;
  }
  function findForcing(values, excluded, maxSteps = 6) {
    const initial = analyze(values, excluded);
    if (initial.error) return null;
    // One assumption only. Propagate forced placements; never recurse or use
    // an incomplete search as evidence that a candidate is impossible.
    for (let cell = 0; cell < 81; cell++) for (const digit of initial.candidates[cell]) {
      const branch = values.slice(); branch[cell] = digit;
      const trail = [];
      for (let step = 0; step <= maxSteps; step++) {
        const current = analyze(branch, excluded);
        if (current.error) {
          const proof = [`Assume ${cellName(cell)} = ${digit}.`, ...trail.map(t => t.reason), `Contradiction: ${current.error.replace(/ (Correct the entries before asking for a hint|Check your entries)\./, '')}`, `Therefore remove ${digit} from ${cellName(cell)}.`];
          return deduction('Short forcing chain', proof.join(' '), [cell, ...trail.map(t => t.cell)], [{ cell, digit }], { assumption: { cell, digit }, trail, proof });
        }
        if (step === maxSteps) break;
        let forced;
        const single = current.candidates.findIndex(ds => ds.length === 1);
        if (single >= 0) forced = { cell: single, digit: current.candidates[single][0], reason: `${cellName(single)} then has only candidate ${current.candidates[single][0]}; place it.` };
        if (!forced) for (const u of current.units) {
          for (const d of digits) {
            const cells = u.cells.filter(i => current.candidates[i].includes(d)), needed = u.remaining[d - 1];
            if (needed > 0 && cells.length === needed) {
              forced = { cell: cells[0], digit: d, reason: `${u.name} needs ${needed} more ${d}${needed > 1 ? 's' : ''} in exactly ${needed} available cells (${names(cells)}); place ${d} at ${cellName(cells[0])}.` };
              break;
            }
          }
          if (forced) break;
        }
        if (!forced) break;
        branch[forced.cell] = forced.digit; trail.push(forced);
      }
    }
    return null;
  }
  const api = { analyze, nextHint, unitsFor, cellName, findLocked, findFish, findForcing };
  if (typeof module !== 'undefined') module.exports = api;
  else root.TripleSudokuHints = api;
})(globalThis);
