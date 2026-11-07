// Left/right or A/D turn, up/W thrust, Space fires. Touch arrows + action work too.
export default function createAsteroids(api) {
  const W = api.width, H = api.height, TAU = Math.PI * 2;
  const ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, inv: 2.7 };
  const stars = Array.from({ length: 100 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + .3, a: Math.random() * .5 + .2 }));
  let rocks = [], bullets = [], score = 0, lives = 3, wave = 1, cooldown = 0, transition = 0, over = false, thrusting = false, elapsed = 0;
  const wrap = (n, size) => (n + size) % size;
  const edgeCopies = (position, radius, size) => [position, ...(position < radius ? [position + size] : []), ...(position > size - radius ? [position - size] : [])];
  const distance = (a, b) => { const dx = Math.min(Math.abs(a.x - b.x), W - Math.abs(a.x - b.x)); const dy = Math.min(Math.abs(a.y - b.y), H - Math.abs(a.y - b.y)); return Math.hypot(dx, dy); };
  function rock(x, y, size, bias = 0) {
    const angle = Math.random() * TAU, speed = (26 + Math.random() * 32 + wave * 3) * (1.15 - size * .09);
    return { x: wrap(x, W), y: wrap(y, H), vx: Math.cos(angle) * speed + bias, vy: Math.sin(angle) * speed, size, r: [0, 15, 28, 46][size], angle, spin: (Math.random() - .5) * .75, shape: Array.from({ length: 11 }, () => .72 + Math.random() * .28) };
  }
  function spawnWave() {
    for (let n = 0; n < Math.min(4 + wave, 12); n++) {
      let x = Math.random() * W, y = Math.random() * H;
      if (distance({ x, y }, ship) < 190) { x = wrap(ship.x + W / 2 + Math.random() * 130 - 65, W); y = wrap(ship.y + H / 2 + Math.random() * 100 - 50, H); }
      rocks.push(rock(x, y, 3));
    }
  }
  spawnWave();
  function hitRock(index) {
    const r = rocks.splice(index, 1)[0];
    score += [0, 120, 70, 30][r.size]; api.score(score); api.sound('hit'); api.burst(r.x, r.y, '#bce4cd', r.size * 5);
    if (r.size > 1) for (let n = 0; n < 2; n++) rocks.push(rock(r.x + (n ? 8 : -8), r.y, r.size - 1, n ? 28 : -28));
  }
  function shipPath(ctx, size = 17) { ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size * .75, -size * .66); ctx.lineTo(-size * .38, 0); ctx.lineTo(-size * .75, size * .66); ctx.closePath(); }
  return {
    update(dt, input) {
      if (over) return;
      elapsed += dt; cooldown -= dt; ship.inv = Math.max(0, ship.inv - dt);
      const left = input.held('ArrowLeft') || input.held('KeyA'), right = input.held('ArrowRight') || input.held('KeyD');
      ship.a += ((right ? 1 : 0) - (left ? 1 : 0)) * 4.25 * dt;
      thrusting = input.held('ArrowUp') || input.held('KeyW');
      if (thrusting) { ship.vx += Math.cos(ship.a) * 245 * dt; ship.vy += Math.sin(ship.a) * 245 * dt; }
      ship.vx *= Math.exp(-.47 * dt); ship.vy *= Math.exp(-.47 * dt);
      const speed = Math.hypot(ship.vx, ship.vy); if (speed > 350) { ship.vx *= 350 / speed; ship.vy *= 350 / speed; }
      ship.x = wrap(ship.x + ship.vx * dt, W); ship.y = wrap(ship.y + ship.vy * dt, H);
      if ((input.held('Space') || input.pointer.down) && cooldown <= 0) {
        bullets.push({ x: wrap(ship.x + Math.cos(ship.a) * 21, W), y: wrap(ship.y + Math.sin(ship.a) * 21, H), vx: Math.cos(ship.a) * 610 + ship.vx * .35, vy: Math.sin(ship.a) * 610 + ship.vy * .35, life: 1.05 });
        cooldown = .17; api.sound('shoot');
      }
      for (const r of rocks) { r.x = wrap(r.x + r.vx * dt, W); r.y = wrap(r.y + r.vy * dt, H); r.angle += r.spin * dt; }
      for (let b = bullets.length - 1; b >= 0; b--) {
        const shot = bullets[b]; shot.x = wrap(shot.x + shot.vx * dt, W); shot.y = wrap(shot.y + shot.vy * dt, H); shot.life -= dt;
        if (shot.life <= 0) { bullets.splice(b, 1); continue; }
        for (let r = rocks.length - 1; r >= 0; r--) if (distance(shot, rocks[r]) < rocks[r].r * .88 + 3) { bullets.splice(b, 1); hitRock(r); break; }
      }
      if (ship.inv <= 0 && rocks.some(r => distance(ship, r) < r.r * .8 + 10)) {
        lives--; api.burst(ship.x, ship.y, '#ffad76', 24); api.sound('lose');
        if (!lives) { over = true; api.finish({ title: 'Lost in space', message: `You cleared ${score.toLocaleString()} points across ${wave} ${wave === 1 ? 'sector' : 'sectors'}. The next run is yours.` }); return; }
        ship.x = W / 2; ship.y = H / 2; ship.vx = ship.vy = 0; ship.a = -Math.PI / 2; ship.inv = 3;
      }
      if (!rocks.length) { transition += dt; if (transition > 1.25) { wave++; transition = 0; ship.inv = Math.max(ship.inv, 1.8); spawnWave(); api.sound('score'); } }
    },
    draw(ctx) {
      ctx.fillStyle = '#101e2c'; ctx.fillRect(0, 0, W, H);
      for (const s of stars) { ctx.globalAlpha = s.a; ctx.fillStyle = '#dce8dc'; ctx.fillRect(s.x, s.y, s.r, s.r); } ctx.globalAlpha = 1;
      ctx.strokeStyle = '#203443'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(W / 2, H / 2, 210, 0, TAU); ctx.stroke();
      for (const r of rocks) {
        for (const x of edgeCopies(r.x, r.r, W)) for (const y of edgeCopies(r.y, r.r, H)) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(r.angle); ctx.beginPath();
        r.shape.forEach((v, i) => { const a = i / r.shape.length * TAU, x = Math.cos(a) * r.r * v, y = Math.sin(a) * r.r * v; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
        ctx.fillStyle = '#243846'; ctx.strokeStyle = '#a7b8aa'; ctx.lineWidth = 1.8; ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#526561'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-r.r * .28, -.2 * r.r); ctx.lineTo(r.r * .1, -.4 * r.r); ctx.lineTo(r.r * .35, .1 * r.r); ctx.stroke(); ctx.restore();
        }
      }
      ctx.fillStyle = '#f3d782'; ctx.shadowColor = '#f3d782'; ctx.shadowBlur = 9;
      for (const b of bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 2.6, 0, TAU); ctx.fill(); } ctx.shadowBlur = 0;
      for (const x of edgeCopies(ship.x, 32, W)) for (const y of edgeCopies(ship.y, 32, H)) {
        ctx.save(); ctx.translate(x, y); ctx.globalAlpha = ship.inv > 0 ? .55 : 1;
        if (ship.inv > 0) { ctx.strokeStyle = '#bce4cd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 25 + Math.sin(elapsed * 4) * 2, 0, TAU); ctx.stroke(); }
        ctx.rotate(ship.a);
        if (thrusting) { ctx.fillStyle = '#ffad76'; ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-27 - Math.sin(elapsed * 60) * 7, 0); ctx.lineTo(-9, 6); ctx.fill(); }
        shipPath(ctx); ctx.fillStyle = '#bce4cd'; ctx.strokeStyle = '#e7f7e7'; ctx.lineWidth = 1.5; ctx.fill(); ctx.stroke(); ctx.restore();
      }
      ctx.font = '600 13px monospace'; ctx.fillStyle = '#9fb2ae'; ctx.textAlign = 'right'; ctx.fillText(`SECTOR ${String(wave).padStart(2, '0')}`, W - 27, 31); ctx.textAlign = 'left';
      for (let i = 0; i < lives; i++) { ctx.save(); ctx.translate(31 + i * 25, 27); ctx.rotate(-Math.PI / 2); shipPath(ctx, 9); ctx.fillStyle = '#bce4cd'; ctx.fill(); ctx.restore(); }
      if (!rocks.length) { ctx.textAlign = 'center'; ctx.fillStyle = '#bce4cd'; ctx.font = '700 25px monospace'; ctx.fillText('SECTOR CLEAR', W / 2, H / 2); ctx.textAlign = 'left'; }
      if (elapsed < 4) { ctx.globalAlpha = Math.min(1, 4 - elapsed); ctx.textAlign = 'center'; ctx.fillStyle = '#9fb2ae'; ctx.font = '12px monospace'; ctx.fillText('ROTATE  ← →     THRUST  ↑     FIRE  SPACE', W / 2, H - 23); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
    },
    inspect: () => ({ score, lives, wave, over, ship: { ...ship }, rocks: rocks.map(r => ({ x: r.x, y: r.y, r: r.r, size: r.size })), bullets: bullets.length })
  };
}
