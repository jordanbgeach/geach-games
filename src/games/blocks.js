const W = 960, H = 600, COLS = 10, ROWS = 22, CELL = 25, BX = 355, BY = 45;
const SHAPES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
  O: [[1, 1], [1, 1]], S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
};
const COLORS = { I: '#78e6d0', J: '#86abed', L: '#ffb56f', O: '#f3d978', S: '#c8ef7a', T: '#c5a1e6', Z: '#fa8a91' };
const copy = matrix => matrix.map(row => [...row]);

/** Original block-stacking puzzler: seven-piece bags, hold, ghost, kick rotations and delayed locks. */
export default function createBlocks(api) {
  let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  let bag = [], next = [], active = null, hold = null, heldThisTurn = false;
  let points = 0, lines = 0, level = 1, combo = -1, over = false, clock = 0;
  let lock = 0, lockResets = 0, clearRows = [], clearTimer = 0, lastClear = '', clearNotice = 0;
  let horizontal = 0, repeatTimer = 0;
  api.score(0);

  function getPiece() {
    if (!bag.length) {
      bag = Object.keys(SHAPES);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop();
  }
  for (let i = 0; i < 5; i++) next.push(getPiece());

  function valid(piece, dx = 0, dy = 0, matrix = piece.matrix) {
    for (let y = 0; y < matrix.length; y++) for (let x = 0; x < matrix[y].length; x++) {
      if (!matrix[y][x]) continue;
      const px = piece.x + dx + x, py = piece.y + dy + y;
      if (px < 0 || px >= COLS || py >= ROWS || (py >= 0 && board[py][px])) return false;
    }
    return true;
  }
  function end() {
    if (over) return;
    over = true; api.sound('lose');
    api.finish({ title: 'A solid session', message: `${lines} lines cleared · Level ${level}` });
  }
  function spawn(type) {
    if (!type) { type = next.shift(); next.push(getPiece()); heldThisTurn = false; }
    active = { type, matrix: copy(SHAPES[type]), x: Math.floor((COLS - SHAPES[type].length) / 2), y: 1 };
    clock = 0; lock = 0; lockResets = 0;
    if (!valid(active)) end();
  }
  function score(n) { points += n; api.score(points); }
  function resetLock(wasGrounded) {
    if (wasGrounded && lockResets < 15) { lock = 0; lockResets++; }
  }
  function move(dx) {
    if (!active || !valid(active, dx, 0)) return false;
    const grounded = !valid(active, 0, 1);
    active.x += dx; resetLock(grounded); api.sound('move'); return true;
  }
  function rotate(counter = false) {
    if (!active || active.type === 'O') return;
    const n = active.matrix.length;
    const matrix = Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) =>
      counter ? active.matrix[x][n - 1 - y] : active.matrix[n - 1 - x][y]));
    const kicks = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [-1, -1], [1, -1], [0, -2]];
    const grounded = !valid(active, 0, 1);
    for (const [dx, dy] of kicks) {
      if (!valid(active, dx, dy, matrix)) continue;
      active.matrix = matrix; active.x += dx; active.y += dy;
      resetLock(grounded); api.sound('move'); return;
    }
  }
  function finishClear() {
    const count = clearRows.length;
    board = board.filter((_, row) => !clearRows.includes(row));
    while (board.length < ROWS) board.unshift(Array(COLS).fill(null));
    combo++;
    score(([0, 100, 300, 500, 800][count] + Math.max(0, combo) * 50) * level);
    if (board.every(row => row.every(cell => !cell))) { score(2000 * level); lastClear = 'ALL CLEAR'; }
    else lastClear = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR LINES!'][count];
    clearNotice = 1.8;
    lines += count; level = Math.floor(lines / 10) + 1;
    clearRows = []; clearTimer = 0;
    if (board.slice(0, 2).some(row => row.some(Boolean))) end();
    else spawn();
  }
  function place() {
    if (!active || over) return;
    for (let y = 0; y < active.matrix.length; y++) for (let x = 0; x < active.matrix[y].length; x++) {
      if (!active.matrix[y][x]) continue;
      const by = active.y + y;
      if (by < 0) { end(); return; }
      board[by][active.x + x] = active.type;
    }
    api.burst(BX + (active.x + active.matrix.length / 2) * CELL, BY + (active.y - 1) * CELL, COLORS[active.type], 6);
    api.sound('hit'); active = null;
    clearRows = board.map((row, i) => row.every(Boolean) ? i : -1).filter(i => i >= 0);
    if (clearRows.length) { clearTimer = .22; api.sound(clearRows.length === 4 ? 'win' : 'score'); }
    else {
      combo = -1;
      if (board.slice(0, 2).some(row => row.some(Boolean))) end();
      else spawn();
    }
  }
  function hardDrop() {
    let distance = 0;
    while (valid(active, 0, 1)) { active.y++; distance++; }
    score(distance * 2); place();
  }
  function swapHold() {
    if (heldThisTurn || !active) return;
    const old = active.type;
    if (hold) { const replacement = hold; hold = old; spawn(replacement); }
    else { hold = old; spawn(); }
    heldThisTurn = true; api.sound('move');
  }
  spawn();

  function tile(ctx, x, y, color, size = CELL, ghost = false) {
    if (ghost) {
      ctx.strokeStyle = color; ctx.globalAlpha = .38; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(x + 2, y + 2, size - 4, size - 4, 3); ctx.stroke(); ctx.globalAlpha = 1; return;
    }
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x + 1, y + 1, size - 2, size - 2, 3); ctx.fill();
    ctx.fillStyle = '#ffffff3b'; ctx.fillRect(x + 4, y + 3, size - 8, 3);
    ctx.fillStyle = '#10212a20'; ctx.fillRect(x + 4, y + size - 5, size - 8, 2);
  }
  function preview(ctx, type, x, y, size = 20) {
    if (!type) return;
    const matrix = SHAPES[type];
    const cells = [];
    for (let ry = 0; ry < matrix.length; ry++) for (let rx = 0; rx < matrix[ry].length; rx++) if (matrix[ry][rx]) cells.push({ x: rx, y: ry });
    const minX = Math.min(...cells.map(c => c.x)), maxX = Math.max(...cells.map(c => c.x));
    const minY = Math.min(...cells.map(c => c.y)), maxY = Math.max(...cells.map(c => c.y));
    for (const c of cells) tile(ctx, x + (c.x - (minX + maxX + 1) / 2) * size, y + (c.y - (minY + maxY + 1) / 2) * size, COLORS[type], size);
  }

  return {
    update(dt, input) {
      if (over) return;
      clearNotice = Math.max(0, clearNotice - dt);
      if (clearTimer > 0) { clearTimer -= dt; if (clearTimer <= 0) finishClear(); return; }
      if (!active) return;
      if (input.pressed('KeyC') || input.pressed('ShiftLeft') || input.pressed('ShiftRight')) swapHold();
      if (over || !active) return;
      if (input.pressed('ArrowUp') || input.pressed('KeyW') || input.pressed('KeyX')) rotate();
      if (input.pressed('KeyZ')) rotate(true);
      const left = input.held('ArrowLeft') || input.held('KeyA');
      const right = input.held('ArrowRight') || input.held('KeyD');
      const axis = (right ? 1 : 0) - (left ? 1 : 0);
      const fresh = axis < 0 ? input.pressed('ArrowLeft') || input.pressed('KeyA') : input.pressed('ArrowRight') || input.pressed('KeyD');
      if (axis !== horizontal || (axis && fresh)) {
        horizontal = axis; repeatTimer = .16;
        if (axis) move(axis);
      } else if (axis) {
        repeatTimer -= dt;
        while (repeatTimer <= 0) { move(axis); repeatTimer += .052; }
      }
      if (input.pressed('Space')) { hardDrop(); return; }
      const soft = input.held('ArrowDown') || input.held('KeyS');
      const gravity = soft ? .035 : Math.max(.055, .82 * Math.pow(.79, level - 1));
      clock += dt;
      while (clock >= gravity && active) {
        clock -= gravity;
        if (valid(active, 0, 1)) { active.y++; if (soft) score(1); }
        else { clock = 0; break; }
      }
      if (!valid(active, 0, 1)) { lock += dt; if (lock >= .45) place(); }
      else lock = 0;
    },
    draw(ctx, time) {
      ctx.fillStyle = '#121f2c'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#203140'; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.fillStyle = '#1e3540'; ctx.beginPath(); ctx.roundRect(BX - 7, BY - 7, COLS * CELL + 14, 20 * CELL + 14, 8); ctx.fill();
      ctx.fillStyle = '#0b1924'; ctx.fillRect(BX, BY, COLS * CELL, 20 * CELL);
      ctx.strokeStyle = '#192b37';
      for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(BX + x * CELL, BY); ctx.lineTo(BX + x * CELL, BY + 20 * CELL); ctx.stroke(); }
      for (let y = 1; y < 20; y++) { ctx.beginPath(); ctx.moveTo(BX, BY + y * CELL); ctx.lineTo(BX + COLS * CELL, BY + y * CELL); ctx.stroke(); }
      for (let y = 2; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (!board[y][x]) continue;
        if (clearRows.includes(y)) {
          ctx.fillStyle = `rgba(246,237,213,${.4 + .6 * Math.abs(Math.sin(clearTimer * 24))})`;
          ctx.fillRect(BX + x * CELL + 1, BY + (y - 2) * CELL + 1, CELL - 2, CELL - 2);
        } else tile(ctx, BX + x * CELL, BY + (y - 2) * CELL, COLORS[board[y][x]]);
      }
      if (active) {
        let ghostY = 0; while (valid(active, 0, ghostY + 1)) ghostY++;
        for (let y = 0; y < active.matrix.length; y++) for (let x = 0; x < active.matrix[y].length; x++) {
          if (!active.matrix[y][x]) continue;
          const gy = active.y + ghostY + y;
          if (gy >= 2) tile(ctx, BX + (active.x + x) * CELL, BY + (gy - 2) * CELL, COLORS[active.type], CELL, true);
        }
        for (let y = 0; y < active.matrix.length; y++) for (let x = 0; x < active.matrix[y].length; x++) {
          if (active.matrix[y][x] && active.y + y >= 2) tile(ctx, BX + (active.x + x) * CELL, BY + (active.y + y - 2) * CELL, COLORS[active.type]);
        }
        if (lock > 0) { ctx.fillStyle = `rgba(246,237,213,${lock * .13})`; ctx.fillRect(BX, BY, 250, 500); }
      }
      ctx.textAlign = 'center'; ctx.font = '600 13px monospace'; ctx.fillStyle = '#89a2b1';
      ctx.fillText('HOLD', 248, 69); ctx.fillText('NEXT UP', 713, 69);
      ctx.fillStyle = '#172c38'; ctx.beginPath(); ctx.roundRect(188, 84, 120, 83, 10); ctx.fill();
      ctx.beginPath(); ctx.roundRect(653, 84, 120, 274, 10); ctx.fill();
      ctx.globalAlpha = heldThisTurn ? .4 : 1; preview(ctx, hold, 248, 125); ctx.globalAlpha = 1;
      for (let i = 0; i < 4; i++) preview(ctx, next[i], 713, 123 + i * 65, i === 0 ? 22 : 18);
      ctx.fillStyle = '#637c89'; ctx.font = '12px monospace'; ctx.fillText('C / SHIFT', 248, 190);
      ctx.fillStyle = '#89a2b1'; ctx.font = '13px monospace'; ctx.fillText('LEVEL', 248, 255);
      ctx.fillStyle = '#f3d978'; ctx.font = 'bold 38px monospace'; ctx.fillText(String(level).padStart(2, '0'), 248, 298);
      ctx.fillStyle = '#89a2b1'; ctx.font = '13px monospace'; ctx.fillText('LINES', 248, 348);
      ctx.fillStyle = '#f6edd5'; ctx.font = 'bold 30px monospace'; ctx.fillText(String(lines).padStart(3, '0'), 248, 386);
      ctx.fillStyle = '#172c38'; ctx.fillRect(204, 408, 88, 4); ctx.fillStyle = '#c8ef7a'; ctx.fillRect(204, 408, 88 * (lines % 10) / 10, 4);
      ctx.fillStyle = '#698392'; ctx.font = '11px monospace'; ctx.fillText(`${10 - lines % 10} TO LEVEL UP`, 248, 438);
      if (clearNotice > 0) {
        ctx.globalAlpha = Math.min(1, clearNotice * 2); ctx.fillStyle = '#c8ef7a'; ctx.font = 'bold 15px monospace';
        ctx.fillText(lastClear, 713, 412);
        if (combo > 0) { ctx.fillStyle = '#f3d978'; ctx.font = '12px monospace'; ctx.fillText(`${combo + 1}× COMBO`, 713, 441); }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#76909e'; ctx.font = '12px monospace';
      ctx.fillText('↑ ROTATE   ·   ↓ SOFT DROP   ·   SPACE HARD DROP', W / 2, 581);
      ctx.textAlign = 'left';
    },
    inspect() { return { points, lines, level, over, board: board.map(r => [...r]), active: active ? { ...active, matrix: copy(active.matrix) } : null,
      next: [...next], hold, heldThisTurn, clearRows: [...clearRows], lock, lockResets }; }
  };
}
