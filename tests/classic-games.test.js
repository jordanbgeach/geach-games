import test from 'node:test';
import assert from 'node:assert/strict';
import createBreakout from '../src/games/breakout.js';
import createSnake from '../src/games/snake.js';
import createBlocks from '../src/games/blocks.js';

function harness(factory) {
  const events = { scores: [], finishes: [], sounds: [] };
  const game = factory({ width: 960, height: 600, score: n => events.scores.push(n),
    finish: e => events.finishes.push(e), sound: n => events.sounds.push(n), burst() {} });
  const input = (pressed = [], held = pressed, pointer = {}) => ({
    pressed: key => pressed.includes(key), held: key => held.includes(key),
    pointer: { x: 480, y: 300, active: false, down: false, pressed: false, released: false, ...pointer }
  });
  const frames = (count, controls = input()) => { for (let i = 0; i < count; i++) game.update(1 / 60, typeof controls === 'function' ? controls(i) : controls); };
  return { game, events, input, frames };
}

test('Breakout serves deliberately and safely steers off paddle hits', () => {
  const { game, input, frames, events } = harness(createBreakout);
  frames(120);
  assert.equal(game.inspect().waiting, true);
  game.update(1 / 60, input(['Space']));
  assert.equal(game.inspect().waiting, false);
  frames(1800, () => input([], [], { active: true, x: game.inspect().ball.x }));
  const state = game.inspect();
  assert.ok(Number.isFinite(state.ball.x) && Number.isFinite(state.ball.y));
  assert.ok(state.lives >= 1 && state.lives <= 3);
  assert.ok(state.points > 0, 'Tracking the ball should break bricks');
  assert.ok(state.paddle.x >= state.paddle.width / 2);
  assert.ok(events.scores.every(Number.isFinite));
  assert.equal(events.finishes.length, 0);
});

test('Breakout loses exactly one life per missed serve and finishes only once', () => {
  const { game, input, frames, events } = harness(createBreakout);
  // Run a full session with the paddle pinned away from the ball; re-serve when needed.
  frames(24000, () => input(game.inspect().waiting ? ['Space'] : [], ['ArrowLeft']));
  assert.equal(game.inspect().over, true);
  assert.equal(game.inspect().lives, 0);
  assert.equal(events.finishes.length, 1);
});

test('Snake waits for a deliberate start and rejects a direct reversal', () => {
  const { game, input, frames } = harness(createSnake);
  frames(120);
  assert.deepEqual(game.inspect().snake[0], { x: 10, y: 9 });
  game.update(1 / 60, input(['ArrowLeft']));
  assert.equal(game.inspect().started, false);
  game.update(1 / 60, input(['Space']));
  frames(10);
  assert.deepEqual(game.inspect().direction, [1, 0]);
  assert.equal(game.inspect().snake[0].x, 11);
});

test('Snake accepts queued corners without allowing queued reversals', () => {
  const { game, input, frames } = harness(createSnake);
  game.update(1 / 60, input(['ArrowUp']));
  game.update(1 / 60, input(['ArrowLeft']));
  game.update(1 / 60, input(['ArrowRight']));
  assert.deepEqual(game.inspect().queue, [[0, -1], [-1, 0]]);
  frames(8);
  assert.deepEqual(game.inspect().direction, [0, -1]);
  frames(10);
  assert.deepEqual(game.inspect().direction, [-1, 0]);
});

test('Snake eats the first apple, grows once, and never places food on its body', () => {
  const { game, input, frames, events } = harness(createSnake);
  game.update(1 / 60, input(['Space']));
  frames(77);
  const state = game.inspect();
  assert.equal(state.eaten, 1);
  assert.equal(state.snake.length, 5);
  assert.equal(state.points, 100);
  assert.ok(!state.snake.some(p => p.x === state.food.x && p.y === state.food.y));
  frames(1000);
  assert.equal(game.inspect().over, true);
  assert.equal(events.finishes.length, 1);
});

test('Block Drop uses a complete seven-piece bag and hard-drops into the board', () => {
  const { game, input, frames, events } = harness(createBlocks);
  const pieces = [];
  for (let i = 0; i < 7; i++) {
    pieces.push(game.inspect().active.type);
    frames(15, input([], [i % 2 ? 'ArrowRight' : 'ArrowLeft']));
    game.update(1 / 60, input(['Space']));
    frames(20);
  }
  assert.equal(new Set(pieces).size, 7);
  assert.equal(game.inspect().over, false);
  assert.ok(game.inspect().points > 0);
  assert.ok(game.inspect().board.some(row => row.some(Boolean)));
  assert.equal(events.finishes.length, 0);
});

test('Block Drop allows one hold per piece, preserving the replacement', () => {
  const { game, input } = harness(createBlocks);
  const first = game.inspect().active.type;
  const second = game.inspect().next[0];
  game.update(1 / 60, input(['KeyC']));
  assert.equal(game.inspect().hold, first);
  assert.equal(game.inspect().active.type, second);
  game.update(1 / 60, input(['KeyC']));
  assert.equal(game.inspect().hold, first);
  assert.equal(game.inspect().active.type, second);
  game.update(1 / 60, input(['Space']));
  game.update(1 / 60, input(['KeyC']));
  assert.equal(game.inspect().active.type, first);
  assert.equal(game.inspect().heldThisTurn, true);
});

test('Block Drop preserves valid board coordinates through repeated wall rotations', () => {
  const { game, input, frames } = harness(createBlocks);
  for (let turn = 0; turn < 4; turn++) {
    frames(100, input([], [turn % 2 ? 'ArrowRight' : 'ArrowLeft']));
    for (let i = 0; i < 12; i++) game.update(1 / 60, input(['ArrowUp']));
    const { active, board } = game.inspect();
    for (let y = 0; y < active.matrix.length; y++) for (let x = 0; x < active.matrix[y].length; x++) {
      if (active.matrix[y][x]) {
        assert.ok(active.x + x >= 0 && active.x + x < 10);
        assert.ok(active.y + y < 22);
        if (active.y + y >= 0) assert.equal(board[active.y + y][active.x + x], null);
      }
    }
  }
});

test('Block Drop applies a lock delay and eventually locks a resting piece', () => {
  const { game, input, frames } = harness(createBlocks);
  const firstType = game.inspect().active.type;
  for (let frame = 0; frame < 100 && game.inspect().lock === 0; frame++) frames(1, input([], ['ArrowDown']));
  const settled = game.inspect();
  assert.equal(settled.active.type, firstType);
  assert.ok(settled.board.every(row => row.every(cell => cell === null)), 'A resting piece has a lock grace period');
  frames(30, input([], ['ArrowDown']));
  assert.ok(game.inspect().board.some(row => row.some(Boolean)));
});

test('Block Drop clears full rows, scores them, and keeps the board rectangular', () => {
  const { game, input, frames, events } = harness(createBlocks);
  // An actual placement strategy exercises collision, rotations, hard drops and clears together.
  for (let turn = 0; turn < 100 && game.inspect().lines === 0 && !game.inspect().over; turn++) {
    const initial = game.inspect();
    let matrix = initial.active.matrix, best = null;
    for (let rotation = 0; rotation < 4; rotation++) {
      for (let px = -3; px < 10; px++) {
        const valid = py => matrix.every((row, y) => row.every((cell, x) => !cell ||
          (px + x >= 0 && px + x < 10 && py + y < 22 && (py + y < 0 || !initial.board[py + y][px + x]))));
        if (!valid(0)) continue;
        let py = 0; while (valid(py + 1)) py++;
        const board = initial.board.map(row => [...row]);
        matrix.forEach((row, y) => row.forEach((cell, x) => { if (cell) board[py + y][px + x] = true; }));
        const cleared = board.filter(row => row.every(Boolean)).length;
        const remaining = board.filter(row => !row.every(Boolean));
        while (remaining.length < 22) remaining.unshift(Array(10).fill(null));
        const heights = [], holes = [];
        for (let x = 0; x < 10; x++) {
          const top = remaining.findIndex(row => row[x]); heights.push(top < 0 ? 0 : 22 - top);
          holes.push(top < 0 ? 0 : remaining.slice(top).filter(row => !row[x]).length);
        }
        const cost = heights.reduce((a, b) => a + b, 0) * .51 + holes.reduce((a, b) => a + b, 0) * .76 +
          heights.slice(1).reduce((a, h, i) => a + Math.abs(h - heights[i]), 0) * .18 - cleared * .76;
        if (!best || cost < best.cost) best = { cost, rotation, x: px };
      }
      matrix = matrix[0].map((_, y) => matrix.map(row => row[y]).reverse());
    }
    assert.ok(best);
    for (let r = 0; r < best.rotation; r++) game.update(1 / 60, input(['ArrowUp']));
    for (let attempt = 0; attempt < 15 && game.inspect().active.x !== best.x; attempt++) {
      const key = game.inspect().active.x > best.x ? 'ArrowLeft' : 'ArrowRight';
      game.update(1 / 60, input([key]));
    }
    game.update(1 / 60, input(['Space'])); frames(15);
  }
  const result = game.inspect();
  assert.ok(result.lines > 0);
  assert.ok(result.points >= 100);
  assert.equal(result.board.length, 22);
  assert.ok(result.board.every(row => row.length === 10));
  assert.ok(result.board.every(row => row.some(cell => !cell)), 'Completed rows are removed');
  assert.equal(events.finishes.length, 0);
});
