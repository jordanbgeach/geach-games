const W = 960, H = 600, SIZE = 4, BOARD = 480, GAP = 10, CELL = (BOARD - GAP * 5) / SIZE;
const BX = (W - BOARD) / 2, BY = 60;
const KEY_DIRECTIONS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
const clone = board => board.map(row => [...row]);
const COLORS = { 2: '#f1e7cf', 4: '#e5d7ad', 8: '#ffbf8b', 16: '#ffab79', 32: '#fa947c',
  64: '#ef7f7c', 128: '#d0e997', 256: '#b9e58a', 512: '#96dba9', 1024: '#79d5ba', 2048: '#d9f58b' };

/** Slide a square board without mutation. A tile can merge exactly once per turn. */
export function moveBoard(board, direction) {
  if (!['left', 'right', 'up', 'down'].includes(direction)) throw new Error('Unknown move direction');
  const n = board.length;
  const result = Array.from({ length: n }, () => Array(n).fill(0));
  const movements = [], mergedCells = [];
  let score = 0;
  function coord(lane, position) {
    if (direction === 'left') return { x: position, y: lane };
    if (direction === 'right') return { x: n - 1 - position, y: lane };
    if (direction === 'up') return { x: lane, y: position };
    return { x: lane, y: n - 1 - position };
  }
  for (let lane = 0; lane < n; lane++) {
    const tiles = [];
    for (let position = 0; position < n; position++) {
      const source = coord(lane, position);
      if (board[source.y][source.x]) tiles.push({ ...source, value: board[source.y][source.x] });
    }
    let targetIndex = 0;
    for (let i = 0; i < tiles.length; i++) {
      const source = tiles[i], destination = coord(lane, targetIndex++);
      const merges = i + 1 < tiles.length && tiles[i + 1].value === source.value;
      const value = source.value * (merges ? 2 : 1);
      movements.push({ fromX: source.x, fromY: source.y, toX: destination.x, toY: destination.y, value: source.value });
      if (merges) {
        const partner = tiles[++i];
        movements.push({ fromX: partner.x, fromY: partner.y, toX: destination.x, toY: destination.y, value: partner.value });
        score += value; mergedCells.push({ ...destination, value });
      }
      result[destination.y][destination.x] = value;
    }
  }
  const changed = result.some((row, y) => row.some((value, x) => board[y][x] !== value));
  return { board: result, score, changed, movements, mergedCells };
}

/** Empty cells or neighboring equals mean at least one legal move remains. */
export function canMove(board) {
  return board.some((row, y) => row.some((value, x) => value === 0 ||
    (x + 1 < row.length && value === row[x + 1]) || (y + 1 < board.length && value === board[y + 1][x])));
}

/** Return a fresh board and the spawned tile; full boards stay unchanged. */
export function spawnTile(board, random = Math.random) {
  const empty = [];
  board.forEach((row, y) => row.forEach((value, x) => { if (value === 0) empty.push({ x, y }); }));
  const next = clone(board);
  if (!empty.length) return { board: next, tile: null };
  const tile = { ...empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))], value: random() < .9 ? 2 : 4 };
  next[tile.y][tile.x] = tile.value;
  return { board: next, tile };
}

export default function createMerge(api) {
  let board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  board = spawnTile(spawnTile(board).board).board;
  let points = 0, turns = 0, over = false, animation = null, queue = [], pops = [], invalid = 0;
  api.score(0);

  function highest() { return Math.max(...board.flat()); }
  function completeTurn() {
    const merged = animation.mergedCells;
    animation = null;
    for (const cell of merged) {
      pops.push({ x: cell.x, y: cell.y, kind: 'merge', elapsed: 0 });
      api.burst(BX + GAP + cell.x * (CELL + GAP) + CELL / 2, BY + GAP + cell.y * (CELL + GAP) + CELL / 2, COLORS[cell.value] || '#d9f58b', 7);
    }
    const spawn = spawnTile(board);
    board = spawn.board;
    if (spawn.tile) pops.push({ ...spawn.tile, kind: 'spawn', elapsed: 0 });
    if (highest() >= 2048) {
      over = true; queue = []; api.sound('win');
      api.finish({ title: 'Beautifully merged', message: `2048 in ${turns} moves · ${points.toLocaleString()} points`, won: true });
    } else if (!canMove(board)) {
      over = true; queue = []; api.sound('lose');
      api.finish({ title: 'A little room to grow', message: `Best tile ${highest()} · ${points.toLocaleString()} points in ${turns} moves` });
    }
  }
  function play(direction) {
    const moved = moveBoard(board, direction);
    if (!moved.changed) { invalid = .16; return; }
    animation = { ...moved, elapsed: 0, duration: .135 };
    board = moved.board;
    turns++; points += moved.score; api.score(points);
    api.sound(moved.score > 0 ? 'score' : 'move');
    pops = [];
  }

  function tile(ctx, value, x, y, scale = 1, ghost = false) {
    const centerX = x + CELL / 2, centerY = y + CELL / 2;
    ctx.save(); ctx.translate(centerX, centerY); ctx.scale(scale, scale);
    ctx.shadowColor = '#050e15'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 3;
    ctx.fillStyle = COLORS[value] || '#d9f58b'; ctx.beginPath(); ctx.roundRect(-CELL / 2, -CELL / 2, CELL, CELL, 9); ctx.fill();
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#ffffff30'; ctx.beginPath(); ctx.roundRect(-CELL / 2 + 5, -CELL / 2 + 4, CELL - 10, 4, 2); ctx.fill();
    ctx.fillStyle = value >= 128 ? '#21392e' : '#263840';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${value >= 1024 ? 31 : value >= 128 ? 39 : 47}px sans-serif`;
    ctx.fillText(String(value), 0, 3); ctx.restore();
  }

  return {
    update(dt, input) {
      if (over) return;
      invalid = Math.max(0, invalid - dt);
      pops.forEach(pop => { pop.elapsed += dt; }); pops = pops.filter(pop => pop.elapsed < .22);
      const key = Object.keys(KEY_DIRECTIONS).find(code => input.pressed(code));
      if (key && queue.length < 2) queue.push(KEY_DIRECTIONS[key]);
      if (animation) {
        animation.elapsed += dt;
        if (animation.elapsed >= animation.duration) completeTurn();
      }
      if (!over && !animation && queue.length) play(queue.shift());
    },
    draw(ctx, time) {
      ctx.fillStyle = '#14232e'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#213641';
      for (let x = 20; x < W; x += 24) for (let y = 20; y < H; y += 24) { ctx.beginPath(); ctx.arc(x, y, .8, 0, Math.PI * 2); ctx.fill(); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.font = '600 12px monospace'; ctx.fillStyle = '#8ca3ad';
      ctx.fillText('SMALL MOVES. BIG NUMBERS.', W / 2, 33);
      ctx.save();
      if (invalid > 0) ctx.translate(Math.sin(invalid * 90) * invalid * 12, 0);
      ctx.fillStyle = '#28404a'; ctx.beginPath(); ctx.roundRect(BX - 1, BY - 1, BOARD + 2, BOARD + 2, 17); ctx.fill();
      ctx.fillStyle = '#1d333e'; ctx.beginPath(); ctx.roundRect(BX + 2, BY + 2, BOARD - 4, BOARD - 4, 15); ctx.fill();
      for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
        ctx.fillStyle = '#2a414a'; ctx.beginPath(); ctx.roundRect(BX + GAP + x * (CELL + GAP), BY + GAP + y * (CELL + GAP), CELL, CELL, 9); ctx.fill();
      }
      if (animation) {
        const p = Math.min(1, animation.elapsed / animation.duration), ease = 1 - (1 - p) ** 3;
        for (const move of animation.movements) {
          const x = move.fromX + (move.toX - move.fromX) * ease;
          const y = move.fromY + (move.toY - move.fromY) * ease;
          tile(ctx, move.value, BX + GAP + x * (CELL + GAP), BY + GAP + y * (CELL + GAP));
        }
      } else {
        for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
          if (!board[y][x]) continue;
          const pop = pops.find(p => p.x === x && p.y === y);
          let scale = 1;
          if (pop) {
            const p = Math.min(1, pop.elapsed / .22);
            scale = pop.kind === 'merge' ? 1 + Math.sin(p * Math.PI) * .13 : .65 + .35 * (1 - (1 - p) ** 3);
          }
          tile(ctx, board[y][x], BX + GAP + x * (CELL + GAP), BY + GAP + y * (CELL + GAP), scale);
        }
      }
      ctx.restore();
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#88a2ae'; ctx.font = '600 12px monospace'; ctx.fillText('BEST TILE', 122, 144);
      ctx.fillStyle = COLORS[highest()] || '#d9f58b'; ctx.font = 'bold 40px monospace'; ctx.fillText(String(highest()), 122, 190);
      ctx.fillStyle = '#88a2ae'; ctx.font = '600 12px monospace'; ctx.fillText('MOVES', 122, 256);
      ctx.fillStyle = '#f1e7cf'; ctx.font = 'bold 30px monospace'; ctx.fillText(String(turns).padStart(2, '0'), 122, 296);
      ctx.strokeStyle = '#36505a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(86, 332); ctx.lineTo(158, 332); ctx.stroke();
      ctx.fillStyle = '#8ca3ad'; ctx.font = '13px sans-serif'; ctx.fillText('Every merge', 122, 373); ctx.fillText('makes room', 122, 395); ctx.fillText('for the next.', 122, 417);
      ctx.fillStyle = '#c8ef7a'; ctx.font = 'bold 33px monospace'; ctx.fillText('2048', 839, 185);
      ctx.fillStyle = '#88a2ae'; ctx.font = '600 12px monospace'; ctx.fillText('THE GOAL', 839, 213);
      ctx.fillStyle = '#b5c5ca'; ctx.font = '14px sans-serif'; ctx.fillText('Slide the board.', 839, 296); ctx.fillText('Match two equals.', 839, 322); ctx.fillText('Make a little space.', 839, 348);
      ctx.font = '12px monospace'; ctx.fillStyle = '#6f8a98'; ctx.fillText('2 + 2 → 4', 839, 400); ctx.fillText('4 + 4 → 8', 839, 424);
      ctx.fillStyle = '#89a2ac'; ctx.font = '12px monospace'; ctx.fillText('ARROWS / WASD TO SLIDE   ·   SWIPE ON TOUCH', W / 2, 578);
      ctx.textAlign = 'left';
    },
    inspect() { return { board: clone(board), points, turns, over, highest: highest(), animating: !!animation, queued: [...queue] }; }
  };
}
