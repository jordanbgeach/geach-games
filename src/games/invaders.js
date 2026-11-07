// Move with left/right or A/D; hold Space to fire. Pointer/touch aims and fires.
export default function createInvaders(api) {
  const W = api.width, H = api.height, ship = { x: W / 2, y: H - 58, inv: 1.5 };
  const sprites = [ ['00100100','00011000','00111100','01111110','11011011','11111111','00100100','01000010'], ['00011000','00111100','01111110','11011011','11111111','00100100','01011010','10100101'], ['00111100','11111111','11111111','11011011','11111111','00011000','00100100','01000010'] ];
  const stars = Array.from({ length: 65 }, () => ({ x: Math.random() * W, y: Math.random() * H, size: Math.random() * 1.7 + .4 }));
  let aliens = [], shots = [], shields = [], score = 0, lives = 3, wave = 1, dir = 1, shotTimer = 0, enemyTimer = .9, over = false, transition = 0, elapsed = 0;
  function spawn() { aliens = []; for (let row = 0; row < 4; row++) for (let col = 0; col < 9; col++) aliens.push({ x: 185 + col * 72, y: 93 + row * 55, row, col }); shots = []; dir = 1; enemyTimer = 1; }
  function buildShields() {
    shields = []; const layout = ['0011111100', '0111111110', '1111111111', '1111111111', '1110000111', '1100000011'];
    for (let k = 0; k < 4; k++) layout.forEach((line, row) => [...line].forEach((v, col) => { if (v === '1') shields.push({ x: 152 + k * 193 + col * 7, y: H - 143 + row * 7 }); }));
  }
  spawn(); buildShields();
  const intersects = (b, r, pad = 0) => Math.abs(b.x - r.x) < 17 + pad && Math.abs(b.y - r.y) < 14 + pad;
  function hitPlayer() {
    if (ship.inv > 0) return;
    lives--; ship.inv = 2.3; api.burst(ship.x, ship.y, '#ffad76', 20); api.sound('lose');
    if (!lives) { over = true; api.finish({ title: 'Earth needs a rematch', message: `${score.toLocaleString()} points. You held the line through wave ${wave}.` }); }
  }
  return {
    update(dt, input) {
      if (over) return; elapsed += dt; ship.inv = Math.max(0, ship.inv - dt);
      if (!aliens.length) { transition += dt; if (transition >= 1.5) { wave++; transition = 0; spawn(); buildShields(); ship.inv = 1.5; api.sound('score'); } return; }
      const movement = ((input.held('ArrowRight') || input.held('KeyD')) ? 1 : 0) - ((input.held('ArrowLeft') || input.held('KeyA')) ? 1 : 0);
      ship.x += movement * 390 * dt;
      if (input.pointer.down && input.pointer.active) ship.x += Math.max(-480 * dt, Math.min(480 * dt, input.pointer.x - ship.x));
      ship.x = Math.max(28, Math.min(W - 28, ship.x)); shotTimer -= dt;
      if ((input.held('Space') || input.pointer.down) && shotTimer <= 0) { shots.push({ x: ship.x, y: ship.y - 20, vy: -620, enemy: false }); shotTimer = .19; api.sound('shoot'); }
      const speed = (21 + wave * 5 + (36 - aliens.length) * 1.5) * dt;
      const nextLeft = Math.min(...aliens.map(a => a.x)) + speed * dir, nextRight = Math.max(...aliens.map(a => a.x)) + speed * dir;
      if (nextLeft < 35 || nextRight > W - 35) { dir *= -1; for (const a of aliens) a.y += 20; }
      for (const a of aliens) { a.x += speed * dir; if (a.y > H - 180) shields = shields.filter(s => Math.abs(s.x - a.x) > 24 || Math.abs(s.y - a.y) > 23); }
      if (aliens.some(a => a.y >= ship.y - 27)) { over = true; api.sound('lose'); api.finish({ title: 'The invaders landed', message: `${score.toLocaleString()} points on wave ${wave}. Get them before they reach the ground.` }); return; }
      enemyTimer -= dt;
      if (enemyTimer <= 0 && shots.filter(s => s.enemy).length < 7) {
        const bottoms = new Map(); for (const a of aliens) if (!bottoms.has(a.col) || bottoms.get(a.col).y < a.y) bottoms.set(a.col, a);
        const choices = [...bottoms.values()], shooter = choices[Math.floor(Math.random() * choices.length)];
        shots.push({ x: shooter.x, y: shooter.y + 18, vy: Math.min(360, 225 + wave * 18), enemy: true }); enemyTimer = Math.max(.27, .9 - wave * .055) + Math.random() * .4;
      }
      for (let i = shots.length - 1; i >= 0; i--) {
        const b = shots[i]; b.y += b.vy * dt;
        if (b.y < -15 || b.y > H + 15) { shots.splice(i, 1); continue; }
        const shield = shields.find(s => b.x >= s.x - 3 && b.x <= s.x + 10 && b.y >= s.y - 4 && b.y <= s.y + 11);
        if (shield) { shields = shields.filter(s => Math.hypot(s.x - shield.x, s.y - shield.y) > (b.enemy ? 13 : 8)); shots.splice(i, 1); api.burst(b.x, b.y, '#8bbd8f', 3); continue; }
        if (b.enemy) { if (intersects(b, ship, 1)) { shots.splice(i, 1); hitPlayer(); if (over) return; } }
        else { const index = aliens.findIndex(a => intersects(b, a, 1)); if (index !== -1) { const a = aliens.splice(index, 1)[0]; shots.splice(i, 1); score += (4 - a.row) * 10; api.score(score); api.burst(a.x, a.y, ['#f0ce76', '#c0e7bf', '#80c9b4', '#80c9b4'][a.row], 10); api.sound('hit'); } }
      }
    },
    draw(ctx) {
      ctx.fillStyle = '#111d2a'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#60727a'; for (const s of stars) ctx.fillRect(s.x, (s.y + elapsed * 4) % H, s.size, s.size);
      ctx.strokeStyle = '#314836'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(22, H - 24); ctx.lineTo(W - 22, H - 24); ctx.stroke();
      for (const s of shields) { ctx.fillStyle = '#87b88c'; ctx.fillRect(s.x, s.y, 6, 6); ctx.fillStyle = '#a7cca4'; ctx.fillRect(s.x, s.y, 6, 1); }
      for (const a of aliens) {
        ctx.fillStyle = ['#f0ce76', '#c0e7bf', '#80c9b4', '#80c9b4'][a.row];
        const pixels = sprites[Math.min(a.row, 2)], march = Math.floor(elapsed * 3.5) % 2;
        pixels.forEach((row, y) => [...row].forEach((v, x) => { if (v === '1') { const sway = y > 5 ? (march ? 1 : -1) * 2 : 0; ctx.fillRect(a.x - 16 + x * 4 + sway, a.y - 16 + y * 4, 4, 4); } }));
      }
      for (const b of shots) { ctx.fillStyle = b.enemy ? '#f59b78' : '#f1e2aa'; ctx.shadowBlur = 7; ctx.shadowColor = ctx.fillStyle; ctx.fillRect(b.x - (b.enemy ? 2 : 1.5), b.y - 7, b.enemy ? 4 : 3, 14); } ctx.shadowBlur = 0;
      {
        ctx.save(); ctx.globalAlpha = ship.inv > 0 ? .55 : 1;
        ctx.fillStyle = '#c5e8c4'; ctx.beginPath(); ctx.moveTo(ship.x, ship.y - 21); ctx.lineTo(ship.x + 5, ship.y - 9); ctx.lineTo(ship.x + 17, ship.y - 4); ctx.lineTo(ship.x + 22, ship.y + 10); ctx.lineTo(ship.x - 22, ship.y + 10); ctx.lineTo(ship.x - 17, ship.y - 4); ctx.lineTo(ship.x - 5, ship.y - 9); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#365869'; ctx.fillRect(ship.x - 3, ship.y - 9, 6, 8); ctx.restore();
      }
      ctx.fillStyle = '#9fb2ae'; ctx.font = '600 13px monospace'; ctx.textAlign = 'right'; ctx.fillText(`WAVE ${String(wave).padStart(2, '0')}`, W - 27, 31); ctx.textAlign = 'left'; ctx.fillStyle = '#c5e8c4'; ctx.fillText('♥ '.repeat(lives), 25, 31);
      if (!aliens.length) { ctx.fillStyle = '#c5e8c4'; ctx.font = '700 25px monospace'; ctx.textAlign = 'center'; ctx.fillText('WAVE CLEARED', W / 2, H / 2); ctx.textAlign = 'left'; }
      if (elapsed < 4) { ctx.globalAlpha = Math.min(1, 4 - elapsed); ctx.fillStyle = '#9fb2ae'; ctx.font = '12px monospace'; ctx.textAlign = 'center'; ctx.fillText('MOVE  ← →     HOLD SPACE TO FIRE', W / 2, H - 7); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
    },
    inspect: () => ({ score, lives, wave, over, ship: { ...ship }, aliens: aliens.map(a => ({ ...a })), shots: shots.length, shields: shields.length })
  };
}
