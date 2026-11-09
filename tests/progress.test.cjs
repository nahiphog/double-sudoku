const { test } = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../progress.js');
const state = () => ({ values: [1, ...Array(63).fill(0)], givens: new Set([0]), notes: Array.from({ length: 64 }, (_, i) => new Set(i === 1 ? [2, 4] : [])) });
function storage() {
  const data = new Map();
  return { data, getItem: k => data.get(k) || null, setItem: (k, v) => data.set(k, v) };
}
test('saves entries, original givens and pencil notes independently for each puzzle', () => {
  const disk = storage(), saves = create(() => disk), a = state();
  a.values[2] = 3;
  assert(saves.save('play', a));
  saves.save('2026-09-01', state());
  const restored = create(() => disk).load('play');
  assert.deepEqual(restored, a);
  assert.equal(saves.load('2026-09-01').values[2], 0);
  assert.equal(saves.load('2026-09-02'), null);
  assert.equal(saves.load('play', Array(64).fill(0)), null);
});
test('malformed, incompatible and altered-given saves are ignored', () => {
  const disk = storage(), saves = create(() => disk);
  saves.save('play', state());
  const key = [...disk.data.keys()][0], good = JSON.parse(disk.getItem(key));
  for (const record of ['broken JSON', JSON.stringify({ ...good, version: 2 }), JSON.stringify({ ...good, values: Array(64).fill(0) }), JSON.stringify({ ...good, notes: [] })]) {
    disk.setItem(key, record);
    assert.equal(saves.load('play'), null);
  }
});
test('blocked storage never prevents gameplay and reports a failed save', () => {
  let errors = 0;
  const saves = create(() => { throw Error('unavailable'); }, () => errors++);
  assert.equal(saves.load('play'), null);
  assert.equal(saves.save('play', state()), false);
  assert.equal(errors, 1);
});
