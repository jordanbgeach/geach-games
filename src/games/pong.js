// Up/down or W/S move. Pointer/touch positions paddle vertically. First to seven.
export default function createPong(api) {
  const W = api.width, H = api.height, margin = 52, paddleH = 94;
  const player = { x: margin, y: H / 2, vy: 0 }, cpu = { x: W - margin, y: H / 2, vy: 0 };
  const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: 350 };
  let mine = 0, theirs = 0, score = 0, over = false, serve = 1.2, rally = 0, elapsed = 0, cpuThink = 0, cpuTarget = H / 2, trail = [];
  function launch(direction) { ball.x = W / 2; ball.y = H / 2; ball.speed = 350; ball.vx = direction * ball.speed * .91; ball.vy = (Math.random() > .5 ? 1 : -1) * ball.speed * .415; rally = 0; trail = []; }
  launch(Math.random() > .5 ? 1 : -1);
  function point(isPlayer) {
    if (isPlayer) { mine++; score += 100; api.score(score); api.sound('score'); } else { theirs++; api.sound('lose'); }
    api.burst(isPlayer ? W - 12 : 12, ball.y, isPlayer ? '#bedec6' : '#f3a27c', 18);
    if (mine === 7 || theirs === 7) { over = true; api.finish({ title: mine === 7 ? 'You own the court' : 'A worthy opponent', message: `${mine}–${theirs}. ${mine === 7 ? 'Seven points, one beautiful win.' : 'Find the corners and come back swinging.'}`, won: mine === 7 }); return; }
    serve = 1.1; launch(isPlayer ? -1 : 1);
  }
  function bounce(paddle, direction) {
    const offset = Math.max(-1, Math.min(1, (ball.y - paddle.y) / (paddleH / 2 + 5))), angle = offset * Math.PI * .34;
    ball.speed = Math.min(730, ball.speed + 21); ball.vx = direction * ball.speed * Math.cos(angle); ball.vy = ball.speed * Math.sin(angle) + paddle.vy * .11;
    if (Math.abs(ball.vy) < 40) ball.vy = (Math.random() > .5 ? 1 : -1) * 40;
    ball.x = paddle.x + direction * 18; rally++; if (direction === 1) { score += 5; api.score(score); } api.sound('hit'); api.burst(ball.x, ball.y, direction === 1 ? '#c2e4ca' : '#f3a27c', 5);
  }
  return {
    update(dt, input) {
      if (over) return; elapsed += dt;
      const oldY = player.y, move = ((input.held('ArrowDown') || input.held('KeyS')) ? 1 : 0) - ((input.held('ArrowUp') || input.held('KeyW')) ? 1 : 0);
      player.y += move * 475 * dt;
      if (input.pointer.down && input.pointer.active) player.y += Math.max(-650 * dt, Math.min(650 * dt, input.pointer.y - player.y));
      player.y = Math.max(paddleH / 2 + 8, Math.min(H - paddleH / 2 - 8, player.y)); player.vy = (player.y - oldY) / Math.max(dt, .0001);
      cpuThink -= dt;
      if (cpuThink <= 0) { cpuTarget = ball.vx > 0 ? ball.y + Math.sin(elapsed * 3.7) * 38 : H / 2; cpuThink = .13; }
      const oldCpu = cpu.y; cpu.y += Math.max(-285 * dt, Math.min(285 * dt, cpuTarget - cpu.y)); cpu.y = Math.max(paddleH / 2 + 8, Math.min(H - paddleH / 2 - 8, cpu.y)); cpu.vy = (cpu.y - oldCpu) / Math.max(dt, .0001);
      if (serve > 0) { serve -= dt; return; }
      const previousX = ball.x; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.y < 9) { ball.y = 18 - ball.y; ball.vy = Math.abs(ball.vy); api.sound('move'); }
      if (ball.y > H - 9) { ball.y = 2 * (H - 9) - ball.y; ball.vy = -Math.abs(ball.vy); api.sound('move'); }
      if (ball.vx < 0 && previousX >= player.x + 16 && ball.x <= player.x + 16 && Math.abs(ball.y - player.y) <= paddleH / 2 + 7) bounce(player, 1);
      if (ball.vx > 0 && previousX <= cpu.x - 16 && ball.x >= cpu.x - 16 && Math.abs(ball.y - cpu.y) <= paddleH / 2 + 7) bounce(cpu, -1);
      if (ball.x < -15) point(false); else if (ball.x > W + 15) point(true);
      trail.push({ x: ball.x, y: ball.y }); if (trail.length > 11) trail.shift();
    },
    draw(ctx) {
      ctx.fillStyle = '#173c37'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#31564b'; ctx.lineWidth = 1.5; ctx.strokeRect(19, 19, W - 38, H - 38); ctx.beginPath(); ctx.arc(W / 2, H / 2, 76, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([9, 13]); ctx.beginPath(); ctx.moveTo(W / 2, 20); ctx.lineTo(W / 2, H - 20); ctx.stroke(); ctx.setLineDash([]);
      ctx.textAlign = 'center'; ctx.font = '700 86px monospace'; ctx.fillStyle = '#426659'; ctx.fillText(mine, W / 2 - 108, 123); ctx.fillText(theirs, W / 2 + 108, 123);
      ctx.font = '600 11px monospace'; ctx.fillStyle = '#94b29b'; ctx.fillText('YOU', W / 2 - 108, 149); ctx.fillText('CPU', W / 2 + 108, 149); ctx.fillText('FIRST TO 7', W / 2, H - 35);
      ctx.fillStyle = '#c4e5be'; ctx.shadowColor = '#b4d9ba'; ctx.shadowBlur = 12; ctx.fillRect(player.x - 7, player.y - paddleH / 2, 14, paddleH); ctx.shadowBlur = 0;
      ctx.fillStyle = '#f1aa80'; ctx.fillRect(cpu.x - 7, cpu.y - paddleH / 2, 14, paddleH);
      if (serve <= 0) { trail.forEach((p, i) => { ctx.globalAlpha = i / trail.length * .22; ctx.fillStyle = '#f5edcc'; ctx.beginPath(); ctx.arc(p.x, p.y, 4 + i / trail.length * 3, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1; }
      ctx.fillStyle = '#f5edcc'; ctx.shadowColor = '#f5edcc'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      if (serve > 0) { ctx.font = '600 13px monospace'; ctx.fillStyle = '#c4d8bd'; ctx.fillText(mine + theirs === 0 ? 'READY TO RALLY' : 'NEXT SERVE', W / 2, H / 2 + 42); }
      if (rally >= 4) { ctx.font = '600 12px monospace'; ctx.fillStyle = '#c4d8bd'; ctx.fillText(`${rally} HIT RALLY`, W / 2, 40); }
      ctx.textAlign = 'left';
    },
    inspect: () => ({ score, mine, theirs, over, serve, rally, ball: { ...ball }, player: { ...player }, cpu: { ...cpu } })
  };
}
