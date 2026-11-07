import test from 'node:test';
import assert from 'node:assert/strict';
import createAsteroids from '../src/games/asteroids.js';
import createInvaders from '../src/games/invaders.js';
import createPong from '../src/games/pong.js';

function harness(create) {
  let score = 0, finishes = 0, result;
  const game = create({ width: 960, height: 600, score(value) { assert.ok(Number.isInteger(value) && value >= score, 'score must remain a nonnegative, increasing integer'); score = value; }, finish(value) { finishes++; result = value; }, sound() {}, burst() {} });
  const held = new Set(), pressed = new Set();
  const input = { held: key => held.has(key), pressed: key => pressed.has(key), pointer: { x: 480, y: 300, down: false, pressed: false, released: false, active: false } };
  const ctx = new Proxy({}, { get(target, key) { if (key in target) return target[key]; return (...args) => { for (const a of args) if (typeof a === 'number') assert.ok(Number.isFinite(a), `${String(key)} received a non-finite drawing coordinate`); }; }, set(target, key, value) { target[key] = value; return true; } });
  return { game, held, pressed, input, ctx, finishes: () => finishes, result: () => result };
}

test('Asteroids thrust accelerates, wraps safely, and firing is rate-limited', () => {
  const h = harness(createAsteroids); const initial = h.game.inspect();
  h.held.add('ArrowUp'); h.held.add('Space');
  for (let n = 0; n < 60; n++) h.game.update(1 / 60, h.input);
  const state = h.game.inspect();
  assert.ok(state.ship.vy < initial.ship.vy, 'up thrust must accelerate the initial upward-facing ship');
  assert.ok(Math.hypot(state.ship.vx, state.ship.vy) <= 350.001, 'ship speed is capped');
  assert.ok(state.bullets <= 7, 'held fire has a cooldown');
  assert.ok(state.ship.x >= 0 && state.ship.x < 960 && state.ship.y >= 0 && state.ship.y < 600);
  h.game.draw(h.ctx, 1);
});

test('Invaders movement clamps to arena and fire never grows without bound', () => {
  const h = harness(createInvaders); h.held.add('ArrowLeft'); h.held.add('Space');
  for (let n = 0; n < 120; n++) h.game.update(1 / 60, h.input);
  assert.equal(h.game.inspect().ship.x, 28);
  h.held.delete('ArrowLeft'); h.held.add('ArrowRight');
  for (let n = 0; n < 180; n++) h.game.update(1 / 60, h.input);
  const state = h.game.inspect(); assert.equal(state.ship.x, 932); assert.ok(state.shots < 40); assert.ok(state.shields <= 184);
  h.game.draw(h.ctx, 5);
});

test('Pong paddle is bounded and a missed game ends exactly once at seven', () => {
  const h = harness(createPong); h.held.add('ArrowDown');
  for (let n = 0; n < 36000 && !h.game.inspect().over; n++) h.game.update(1 / 60, h.input);
  const state = h.game.inspect();
  assert.equal(state.player.y, 545); assert.ok(state.mine === 7 || state.theirs === 7); assert.equal(h.finishes(), 1);
  for (let n = 0; n < 120; n++) h.game.update(1 / 60, h.input);
  assert.equal(h.finishes(), 1); assert.equal(typeof h.result().message, 'string'); h.game.draw(h.ctx, 600);
});

for (const [name, create] of [['Asteroids', createAsteroids], ['Invaders', createInvaders], ['Pong', createPong]]) {
  test(`${name} survives variable-step input stress and produces finite rendering`, () => {
    const h = harness(create); const codes = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
    for (let n = 0; n < 15000; n++) {
      h.held.clear(); for (let k = 0; k < codes.length; k++) if (Math.sin(n * .013 + k * 1.8) > -.1) h.held.add(codes[k]);
      h.input.pointer.x = 480 + Math.sin(n * .016) * 470; h.input.pointer.y = 300 + Math.cos(n * .012) * 295;
      h.input.pointer.down = n % 300 < 180; h.input.pointer.active = true;
      h.game.update(n % 2 ? 1 / 60 : 1 / 120, h.input);
      if (n % 60 === 0) h.game.draw(h.ctx, n / 60);
    }
    const state = h.game.inspect();
    assert.ok(Number.isFinite(state.score)); assert.ok(h.finishes() <= 1);
    assert.doesNotThrow(() => JSON.stringify(state));
  });
}
