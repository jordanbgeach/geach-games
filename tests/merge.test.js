import test from 'node:test';
import assert from 'node:assert/strict';
import createMerge, { moveBoard, canMove, spawnTile } from '../src/games/merge.js';

const boardWith = row => [row, [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
const sum = board => board.flat().reduce((a, b) => a + b, 0);
const input = (...keys) => ({ pressed: key => keys.includes(key), held: () => false,
  pointer: { x: 480, y: 300, active: false, pressed: false, down: false, released: false } });

test('2048 merges equal neighbors once each, without chain-merging the result', () => {
  const pairs = moveBoard(boardWith([2, 2, 2, 2]), 'left');
  assert.deepEqual(pairs.board[0], [4, 4, 0, 0]); assert.equal(pairs.score, 8);
  assert.equal(pairs.mergedCells.length, 2); assert.equal(pairs.movements.length, 4);
  const noChain = moveBoard(boardWith([2, 2, 4, 0]), 'left');
  assert.deepEqual(noChain.board[0], [4, 4, 0, 0]); assert.equal(noChain.score, 4);
});

test('2048 compresses spaces before merging and handles directional ordering', () => {
  assert.deepEqual(moveBoard(boardWith([2, 0, 2, 2]), 'left').board[0], [4, 2, 0, 0]);
  assert.deepEqual(moveBoard(boardWith([2, 0, 2, 2]), 'right').board[0], [0, 0, 2, 4]);
  assert.deepEqual(moveBoard(boardWith([4, 2, 2, 4]), 'right').board[0], [0, 4, 4, 4]);
  const vertical = [[2, 0, 4, 0], [0, 0, 4, 0], [2, 0, 8, 0], [2, 0, 8, 0]];
  const up = moveBoard(vertical, 'up');
  assert.deepEqual(up.board, [[4, 0, 8, 0], [2, 0, 16, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  assert.equal(up.score, 28);
  assert.deepEqual(moveBoard(vertical, 'down').board, [[0, 0, 0, 0], [0, 0, 0, 0], [2, 0, 8, 0], [4, 0, 16, 0]]);
});

test('2048 pure moves preserve input, tile sum, and source animation records', () => {
  const original = [[0, 2, 2, 4], [8, 4, 0, 4], [2, 2, 4, 4], [8, 0, 8, 8]];
  const snapshot = structuredClone(original);
  original.forEach(Object.freeze); Object.freeze(original);
  for (const direction of ['left', 'right', 'up', 'down']) {
    const moved = moveBoard(original, direction);
    assert.deepEqual(original, snapshot);
    assert.equal(sum(moved.board), sum(original));
    assert.equal(moved.movements.length, original.flat().filter(Boolean).length);
    assert.equal(new Set(moved.movements.map(m => `${m.fromX},${m.fromY}`)).size, moved.movements.length);
  }
});

test('2048 reports unchanged moves and correctly identifies a full blocked board', () => {
  const full = [[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]];
  assert.equal(canMove(full), false);
  for (const direction of ['left', 'right', 'up', 'down']) {
    const moved = moveBoard(full, direction); assert.equal(moved.changed, false); assert.equal(moved.score, 0);
  }
  assert.equal(canMove(boardWith([2, 0, 0, 0])), true);
  assert.equal(canMove([[2, 2, 4, 8], ...full.slice(1)]), true);
  assert.throws(() => moveBoard(full, 'diagonal'), /direction/);
});

test('2048 spawns only into an empty cell, keeps its source intact, and handles full boards', () => {
  const source = boardWith([2, 0, 4, 0]);
  const draws = [.999, .95];
  const spawned = spawnTile(source, () => draws.shift());
  assert.deepEqual(spawned.tile, { x: 3, y: 3, value: 4 });
  assert.equal(spawned.board[0][0], 2); assert.equal(source[3][3], 0); assert.equal(sum(spawned.board), sum(source) + 4);
  const full = Array.from({ length: 4 }, () => [2, 4, 8, 16]);
  const unchanged = spawnTile(full, () => { throw new Error('Full boards must not request randomness'); });
  assert.deepEqual(unchanged.board, full); assert.equal(unchanged.tile, null);
});

test('2048 game rejects no-op moves without spawning and adds exactly one tile after a valid animation', () => {
  const originalRandom = Math.random;
  const scores = [];
  try {
    Math.random = () => 0;
    const game = createMerge({ width: 960, height: 600, score: n => scores.push(n), sound() {}, burst() {},
      finish() { throw new Error('This board should not end'); } });
    assert.deepEqual(game.inspect().board[0], [2, 2, 0, 0]);
    const initial = game.inspect().board;
    game.update(1 / 60, input('ArrowUp'));
    for (let i = 0; i < 15; i++) game.update(1 / 60, input());
    assert.deepEqual(game.inspect().board, initial); assert.equal(game.inspect().turns, 0);
    game.update(1 / 60, input('ArrowLeft'));
    assert.equal(game.inspect().animating, true);
    assert.equal(sum(game.inspect().board), 4, 'Merging preserves tile mass until the animation completes');
    for (let i = 0; i < 10; i++) game.update(1 / 60, input());
    const after = game.inspect();
    assert.deepEqual(after.board[0], [4, 2, 0, 0]);
    assert.equal(after.animating, false); assert.equal(after.turns, 1); assert.equal(after.points, 4);
    assert.equal(sum(after.board), 6); assert.deepEqual(scores, [0, 4]);
    game.update(1 / 60, input('ArrowLeft'));
    for (let i = 0; i < 10; i++) game.update(1 / 60, input());
    assert.equal(game.inspect().turns, 1); assert.equal(sum(game.inspect().board), 6);
  } finally { Math.random = originalRandom; }
});

test('2048 bounds quick-input queues and settles each accepted move before the next', () => {
  const game = createMerge({ width: 960, height: 600, score() {}, sound() {}, burst() {}, finish() {} });
  game.update(1 / 60, input('ArrowDown'));
  for (let i = 0; i < 4; i++) game.update(1 / 60, input(i % 2 ? 'ArrowRight' : 'ArrowLeft'));
  assert.ok(game.inspect().queued.length <= 2);
  for (let i = 0; i < 60; i++) game.update(1 / 60, input());
  assert.equal(game.inspect().queued.length, 0); assert.equal(game.inspect().animating, false);
  assert.ok(game.inspect().board.every(row => row.length === 4));
});
