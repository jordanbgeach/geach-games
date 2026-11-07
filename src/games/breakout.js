const W = 960, H = 600;
const COLORS = ['#ff7b77', '#ffad69', '#f5d76e', '#c8ef7a', '#78e6c6', '#88b8fa'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** A substepped, paddle-steered brick breaker. Coordinates are always 960 × 600. */
export default function createBreakout(api) {
  let points = 0, lives = 3, level = 1, over = false, waiting = true;
  let bricks = [], drops = [], destroyed = 0, wide = 0, flash = 0;
  const paddle = { x: W / 2, y: 542, width: 124, height: 13, vx: 0 };
  const ball = { x: W / 2, y: 524, vx: 160, vy: -375, r: 7, trail: [] };
  api.score(0);

  function makeLevel() {
    bricks = [];
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 12; col++) {
        if (level > 1 && (row + col + level) % 11 === 0) continue;
        bricks.push({ x: 63 + col * 70, y: 88 + row * 32, w: 64, h: 24,
          hp: level > 1 && row < 2 ? 2 : 1, color: COLORS[row], row });
      }
    }
    drops = [];
    waiting = true;
    ball.trail = [];
  }

  function serve() {
    waiting = false;
    const speed = Math.min(590, 405 + (level - 1) * 25);
    ball.vx = speed * (Math.random() > .5 ? .38 : -.38);
    ball.vy = -Math.sqrt(speed * speed - ball.vx * ball.vx);
    api.sound('shoot');
  }

  function addScore(n) { points += n; api.score(points); }
  function loseBall() {
    lives--;
    api.sound('lose');
    ball.trail = [];
    drops = [];
    wide = 0;
    if (lives <= 0) {
      over = true;
      api.finish({ title: 'A smashing run', message: `${points.toLocaleString()} points · Reached stage ${level}` });
    } else waiting = true;
  }

  function simulate(dt) {
    const steps = Math.max(1, Math.ceil(Math.hypot(ball.vx, ball.vy) * dt / 5));
    const step = dt / steps;
    for (let n = 0; n < steps && !waiting && !over; n++) {
      const oldX = ball.x, oldY = ball.y;
      ball.x += ball.vx * step;
      ball.y += ball.vy * step;
      if (ball.x - ball.r < 25) { ball.x = 25 + ball.r; ball.vx = Math.abs(ball.vx); api.sound('move'); }
      if (ball.x + ball.r > W - 25) { ball.x = W - 25 - ball.r; ball.vx = -Math.abs(ball.vx); api.sound('move'); }
      if (ball.y - ball.r < 48) { ball.y = 48 + ball.r; ball.vy = Math.abs(ball.vy); api.sound('move'); }
      if (ball.vy > 0 && oldY + ball.r <= paddle.y + 4 && ball.y + ball.r >= paddle.y &&
          ball.x > paddle.x - paddle.width / 2 - ball.r && ball.x < paddle.x + paddle.width / 2 + ball.r) {
        const hit = clamp((ball.x - paddle.x) / (paddle.width / 2), -1, 1);
        const angle = hit * 1.06;
        const speed = Math.min(690, Math.hypot(ball.vx, ball.vy) + 4);
        ball.vx = Math.sin(angle) * speed;
        ball.vy = -Math.cos(angle) * speed;
        ball.y = paddle.y - ball.r - .1;
        api.burst(ball.x, paddle.y, '#c8ef7a', 6);
        api.sound('hit');
      }
      for (let i = 0; i < bricks.length; i++) {
        const b = bricks[i];
        const nearestX = clamp(ball.x, b.x, b.x + b.w);
        const nearestY = clamp(ball.y, b.y, b.y + b.h);
        if ((ball.x - nearestX) ** 2 + (ball.y - nearestY) ** 2 >= ball.r ** 2) continue;
        const fromLeft = oldX + ball.r <= b.x, fromRight = oldX - ball.r >= b.x + b.w;
        const fromTop = oldY + ball.r <= b.y, fromBottom = oldY - ball.r >= b.y + b.h;
        if (fromLeft) { ball.x = b.x - ball.r - .1; ball.vx = -Math.abs(ball.vx); }
        else if (fromRight) { ball.x = b.x + b.w + ball.r + .1; ball.vx = Math.abs(ball.vx); }
        else if (fromTop) { ball.y = b.y - ball.r - .1; ball.vy = -Math.abs(ball.vy); }
        else if (fromBottom) { ball.y = b.y + b.h + ball.r + .1; ball.vy = Math.abs(ball.vy); }
        else {
          const horizontal = Math.min(Math.abs(ball.x - b.x), Math.abs(ball.x - b.x - b.w));
          const vertical = Math.min(Math.abs(ball.y - b.y), Math.abs(ball.y - b.y - b.h));
          if (horizontal < vertical) { ball.vx *= -1; ball.x = oldX; }
          else { ball.vy *= -1; ball.y = oldY; }
        }
        b.hp--;
        api.burst(nearestX, nearestY, b.color, b.hp ? 4 : 12);
        api.sound('hit');
        if (b.hp <= 0) {
          addScore((6 - b.row) * 10);
          bricks.splice(i, 1);
          destroyed++;
          if (destroyed % 11 === 0) drops.push({ x: b.x + b.w / 2, y: b.y, spin: 0 });
        } else addScore(5);
        break;
      }
      if (!bricks.length) {
        addScore(500);
        level++;
        flash = 1;
        api.sound('win');
        makeLevel();
      }
      if (ball.y - ball.r > H + 10) loseBall();
    }
  }

  makeLevel();
  return {
    update(dt, input) {
      if (over) return;
      flash = Math.max(0, flash - dt);
      wide = Math.max(0, wide - dt);
      paddle.width += ((wide > 0 ? 180 : 124) - paddle.width) * Math.min(1, dt * 12);
      const previous = paddle.x;
      const left = input.held('ArrowLeft') || input.held('KeyA');
      const right = input.held('ArrowRight') || input.held('KeyD');
      if (left || right) paddle.x += ((right ? 1 : 0) - (left ? 1 : 0)) * 650 * dt;
      else if (input.pointer.active) paddle.x += (input.pointer.x - paddle.x) * Math.min(1, dt * 24);
      paddle.x = clamp(paddle.x, 27 + paddle.width / 2, W - 27 - paddle.width / 2);
      paddle.vx = (paddle.x - previous) / Math.max(dt, .001);
      if (waiting) {
        ball.x = paddle.x;
        ball.y = paddle.y - ball.r - 3;
        if (input.pressed('Space') || input.pointer.pressed) serve();
      } else {
        simulate(dt);
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 9) ball.trail.shift();
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.y += 160 * dt; d.spin += dt * 3;
        if (d.y >= paddle.y - 9 && d.y <= paddle.y + 20 && Math.abs(d.x - paddle.x) < paddle.width / 2 + 16) {
          wide = 14; addScore(50); api.sound('score'); api.burst(d.x, d.y, '#c8ef7a', 16); drops.splice(i, 1);
        } else if (d.y > H + 20) drops.splice(i, 1);
      }
    },
    draw(ctx, time) {
      ctx.fillStyle = '#101d2b'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#233444'; ctx.lineWidth = 1;
      for (let x = 32; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 48); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 48; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(25, y); ctx.lineTo(W - 25, y); ctx.stroke(); }
      const glow = ctx.createLinearGradient(0, 42, 0, H);
      glow.addColorStop(0, '#445965'); glow.addColorStop(1, '#1e3440');
      ctx.fillStyle = glow; ctx.fillRect(20, 43, 5, H - 43); ctx.fillRect(W - 25, 43, 5, H - 43);
      ctx.fillRect(20, 43, W - 40, 5);
      ctx.font = '600 13px monospace'; ctx.fillStyle = '#8094a4'; ctx.textAlign = 'left';
      ctx.fillText(`STAGE ${String(level).padStart(2, '0')}`, 32, 29);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ff7b77';
      ctx.fillText('♥ '.repeat(lives).trim(), W - 32, 29);
      for (const b of bricks) {
        ctx.fillStyle = '#060f18'; ctx.beginPath(); ctx.roundRect(b.x, b.y + 4, b.w, b.h, 4); ctx.fill();
        ctx.fillStyle = b.color; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 4); ctx.fill();
        ctx.fillStyle = '#ffffff35'; ctx.fillRect(b.x + 4, b.y + 3, b.w - 8, 3);
        if (b.hp > 1) { ctx.fillStyle = '#101d2b66'; ctx.fillRect(b.x + 7, b.y + 11, b.w - 14, 3); }
      }
      for (const d of drops) {
        ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(Math.sin(d.spin) * .15);
        ctx.fillStyle = '#c8ef7a'; ctx.beginPath(); ctx.roundRect(-17, -10, 34, 20, 7); ctx.fill();
        ctx.fillStyle = '#182b30'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('↔', 0, 8); ctx.restore();
      }
      ball.trail.forEach((p, i) => {
        ctx.fillStyle = `rgba(246,237,213,${i / ball.trail.length * .22})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, ball.r * i / ball.trail.length, 0, Math.PI * 2); ctx.fill();
      });
      ctx.shadowBlur = 16; ctx.shadowColor = '#f6edd5'; ctx.fillStyle = '#f6edd5';
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = wide ? '#c8ef7a' : '#78e6c6'; ctx.beginPath();
      ctx.roundRect(paddle.x - paddle.width / 2, paddle.y, paddle.width, paddle.height, 7); ctx.fill();
      ctx.fillStyle = '#ffffff50'; ctx.fillRect(paddle.x - paddle.width / 2 + 8, paddle.y + 2, paddle.width - 16, 3);
      if (wide) {
        ctx.fillStyle = '#c8ef7a66'; ctx.fillRect(paddle.x - paddle.width / 2, paddle.y + 21, paddle.width * wide / 14, 2);
      }
      if (waiting && !over) {
        ctx.textAlign = 'center'; ctx.fillStyle = '#f6edd5'; ctx.font = 'bold 23px sans-serif';
        ctx.fillText('MAKE SOME SPACE.', W / 2, 389);
        ctx.fillStyle = '#9aafbb'; ctx.font = '15px sans-serif';
        ctx.fillText('Move the paddle · Press SPACE or tap to serve', W / 2, 420);
      }
      if (flash > 0) { ctx.fillStyle = `rgba(200,239,122,${flash * .11})`; ctx.fillRect(0, 0, W, H); }
      ctx.textAlign = 'left';
    },
    inspect() { return { points, lives, level, over, waiting, bricks: bricks.map(b => ({ ...b })), paddle: { ...paddle }, ball: { ...ball }, wide, drops: drops.map(d => ({ ...d })) }; }
  };
}
