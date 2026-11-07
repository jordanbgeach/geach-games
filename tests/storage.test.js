import test from 'node:test';
import assert from 'node:assert/strict';
import { loadData, saveData, formatScore } from '../src/engine/storage.js';

const EMPTY = { records: {}, favorites: [], sound: false };
function memoryStorage(initial = null) {
  const values = new Map(initial === null ? [] : [['geach-arcade-v1', initial]]);
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), values };
}

test('arcade records, favorites and audio preference persist together', () => {
  const storage = memoryStorage();
  const data = { records: { breakout: { best: 12345, plays: 6 }, snake: { best: 100, plays: 1 } },
    favorites: ['snake', 'breakout'], sound: true };
  assert.equal(saveData(data, storage), true);
  assert.deepEqual(loadData(storage), data);
  assert.ok(storage.values.has('geach-arcade-v1'));
  assert.notEqual(loadData(storage).records, data.records);
});

test('missing, malformed, null and top-level array storage safely use defaults', () => {
  for (const raw of [null, '', '{bad JSON', 'null', '[]', '[null, 3, "snake"]', 'false', '17', '"text"']) {
    assert.deepEqual(loadData(memoryStorage(raw)), EMPTY, `Invalid payload: ${raw}`);
  }
});

test('storage normalizes finite scores and play counts while rejecting invalid records', () => {
  const raw = { records: {
    good: { best: 1200.99, plays: 4.8 }, noPlays: { best: 0 }, negativePlays: { best: 21, plays: -3 },
    stringPlays: { best: 7, plays: '5' }, negativeBest: { best: -1, plays: 1 }, stringBest: { best: '90', plays: 1 },
    nullRecord: null, numberRecord: 9, arrayRecord: [], nullBest: { best: null }, missingBest: { plays: 1 },
    infinityBest: { best: Infinity }, nanBest: { best: NaN }
  }, favorites: ['snake', 9, false, null, 'merge'], sound: true };
  assert.deepEqual(loadData(memoryStorage(JSON.stringify(raw))), {
    records: { good: { best: 1200, plays: 4 }, noPlays: { best: 0, plays: 0 },
      negativePlays: { best: 21, plays: 0 }, stringPlays: { best: 7, plays: 0 } },
    favorites: ['snake', 'merge'], sound: true
  });
});

test('storage requires an array of favorites and an explicit true audio preference', () => {
  for (const sound of [undefined, false, 1, 'true', {}, []]) {
    const storage = memoryStorage(JSON.stringify({ records: {}, favorites: 'snake', sound }));
    assert.deepEqual(loadData(storage), EMPTY);
  }
  const storage = memoryStorage(JSON.stringify({ records: null, favorites: [], sound: true }));
  assert.deepEqual(loadData(storage), { ...EMPTY, sound: true });
});

test('storage failures return safe defaults and a false save result', () => {
  const inaccessible = { getItem() { throw new Error('Storage denied'); }, setItem() { throw new Error('Quota exceeded'); } };
  assert.deepEqual(loadData(inaccessible), EMPTY);
  assert.equal(saveData(EMPTY, inaccessible), false);
  const cyclic = {}; cyclic.self = cyclic;
  assert.equal(saveData(cyclic, memoryStorage()), false);
});

test('a browser that denies access to the localStorage property remains usable', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Privacy mode'); } });
    assert.deepEqual(loadData(), EMPTY);
    assert.equal(saveData(EMPTY), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});

test('scores use stable English grouping, floor fractions, and clamp invalid or negative values', () => {
  const cases = [[1234567, '1,234,567'], [1200.99, '1,200'], ['4500', '4,500'], [0, '0'],
    [-40, '0'], [undefined, '0'], [null, '0'], [NaN, '0'], ['invalid', '0']];
  for (const [value, expected] of cases) assert.equal(formatScore(value), expected);
});
