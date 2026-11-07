const W = 960, H = 600, CELL = 24, COLS = 34, ROWS = 19;
const OX = (W - COLS * CELL) / 2, OY = 88;
const DIRS = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0] };

/** A deliberate turn queue keeps rapid cornering responsive without allowing reversal. */
export default function createSnake(api) {
  let snake = [{ x: 10, y: 9 }, { x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }];
  let previous = snake.map(p => ({ ...p })), direction = [1, 0], queue = [], food;
  let clock = 0, points = 0, eaten = 0, started = false, over = false, age = 0, bite = 0;
  api.score(0);

  function placeFood() {
    const empty = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (!snake.some(p => p.x === x && p.y === y)) empty.push({ x, y });
    }
    if (!empty.length) {
      over = true;
      api.sound('win'); api.finish({ title: 'The perfect snake', message: 'Every square filled. Legendary.', won: true });
      return;
    }
    // Keep the first apple within reach so the very first run has a satisfying start.
    food = eaten === 0 && !started ? { x: 18, y: 9 } : empty[Math.floor(Math.random() * empty.length)];
  }

  function step() {
    previous = snake.map(p => ({ ...p }));
    if (queue.length) direction = queue.shift();
    const head = { x: snake[0].x + direction[0], y: snake[0].y + direction[1] };
    const grows = head.x === food.x && head.y === food.y;
    const body = grows ? snake : snake.slice(0, -1);
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || body.some(p => p.x === head.x && p.y === head.y)) {
      over = true; api.sound('lose');
      api.burst(OX + snake[0].x * CELL + CELL / 2, OY + snake[0].y * CELL + CELL / 2, '#ff7b77', 24);
      api.finish({ title: 'One more bite?', message: `${eaten} apples · A ${snake.length}-square snake` });
      return;
    }
    snake.unshift(head);
    if (grows) {
      eaten++; points += 100 + Math.floor(eaten / 5) * 20; api.score(points); bite = 1;
      api.sound('score'); api.burst(OX + head.x * CELL + CELL / 2, OY + head.y * CELL + CELL / 2, '#ffad69', 12);
      // A duplicate tail gives the new segment a stable interpolation origin.
      previous.push({ ...previous[previous.length - 1] });
      placeFood();
    } else snake.pop();
  }

  placeFood();
  return {
    update(dt, input) {
      if (over) return;
      age += dt; bite = Math.max(0, bite - dt * 5);
      for (const [key, next] of Object.entries(DIRS)) {
        if (!input.pressed(key)) continue;
        const last = queue.length ? queue[queue.length - 1] : direction;
        if (next[0] === last[0] && next[1] === last[1]) { started = true; continue; }
        if (next[0] === -last[0] && next[1] === -last[1]) continue;
        if (queue.length < 2) queue.push(next);
        started = true;
      }
      if (input.pressed('Space') || input.pointer.pressed) started = true;
      if (!started) return;
      clock += dt;
      const interval = Math.max(.072, .16 - eaten * .0035);
      while (clock >= interval && !over) { clock -= interval; step(); }
    },
    draw(ctx, time) {
      ctx.fillStyle = '#101f29'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'left'; ctx.font = '600 13px monospace'; ctx.fillStyle = '#98acb5';
      ctx.fillText('THE LONG GAME', OX, 35);
      ctx.textAlign = 'right'; ctx.fillStyle = '#c8ef7a'; ctx.fillText(`${String(eaten).padStart(2, '0')} APPLES`, W - OX, 35);
      ctx.fillStyle = '#182d34'; ctx.beginPath(); ctx.roundRect(OX - 8, OY - 8, COLS * CELL + 16, ROWS * CELL + 16, 8); ctx.fill();
      ctx.fillStyle = '#0e2028'; ctx.fillRect(OX, OY, COLS * CELL, ROWS * CELL);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if ((x + y) % 2 === 0) { ctx.fillStyle = '#132830'; ctx.fillRect(OX + x * CELL, OY + y * CELL, CELL, CELL); }
      }
      if (food) {
        const fx = OX + food.x * CELL + CELL / 2, fy = OY + food.y * CELL + CELL / 2;
        ctx.fillStyle = '#ffad6916'; ctx.beginPath(); ctx.arc(fx, fy, 19 + Math.sin(time * 3) * 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff9c6e'; ctx.beginPath(); ctx.roundRect(fx - 8, fy - 7, 16, 16, 6); ctx.fill();
        ctx.fillStyle = '#ffe1b9'; ctx.fillRect(fx - 5, fy - 4, 3, 4);
        ctx.strokeStyle = '#c8ef7a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx, fy - 7); ctx.quadraticCurveTo(fx, fy - 13, fx + 6, fy - 11); ctx.stroke();
      }
      const interval = Math.max(.072, .16 - eaten * .0035);
      const t = started && !over ? Math.min(clock / interval, 1) : 1;
      // Render one tick behind the logic for smooth movement along every right angle.
      for (let i = snake.length - 1; i >= 0; i--) {
        const p = snake[i], old = previous[i] || p;
        const x = OX + (old.x + (p.x - old.x) * t) * CELL;
        const y = OY + (old.y + (p.y - old.y) * t) * CELL;
        ctx.fillStyle = i === 0 ? '#d5f89c' : i % 3 === 0 ? '#89c98d' : '#a6dd86';
        ctx.beginPath(); ctx.roundRect(x + 1, y + 1, CELL - 2, CELL - 2, i === 0 ? 7 : 5); ctx.fill();
        if (i === 0) {
          const cx = x + CELL / 2, cy = y + CELL / 2;
          const eyeX = direction[0] * 4, eyeY = direction[1] * 4;
          ctx.fillStyle = '#162a2b';
          for (const sign of [-1, 1]) {
            ctx.beginPath(); ctx.arc(cx + eyeX + direction[1] * sign * 5, cy + eyeY + direction[0] * sign * 5, 2.2, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      if (!started && !over) {
        ctx.fillStyle = '#0e2028dd'; ctx.beginPath(); ctx.roundRect(270, 215, 420, 120, 14); ctx.fill();
        ctx.textAlign = 'center'; ctx.fillStyle = '#d5f89c'; ctx.font = 'bold 26px sans-serif'; ctx.fillText('GOOD THINGS GROW.', W / 2, 259);
        ctx.fillStyle = '#a8bbb9'; ctx.font = '15px sans-serif'; ctx.fillText('Arrows / WASD to move · Tap or SPACE to begin', W / 2, 295);
      }
      ctx.textAlign = 'center'; ctx.fillStyle = '#7a929b'; ctx.font = '12px monospace';
      ctx.fillText(`LENGTH ${String(snake.length).padStart(2, '0')}   ·   SPEED ${Math.min(10, 1 + Math.floor(eaten / 4))}/10`, W / 2, 580);
      ctx.textAlign = 'left';
    },
    inspect() { return { points, eaten, started, over, direction: [...direction], queue: queue.map(d => [...d]), snake: snake.map(p => ({ ...p })), food: { ...food } }; }
  };
}
