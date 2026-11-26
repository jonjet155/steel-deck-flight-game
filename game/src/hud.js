// hud.js — 2D overlay HUD on top of the WebGL canvas. Max 6 groups, big numbers, dark backing.
export function drawHUD(ctx, W, H, gs, plane, flols, objective) {
  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = 'middle';
  const panel = (x, y, w, h) => {
    ctx.fillStyle = 'rgba(8,10,26,0.72)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,180,60,0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  };
  // 1 — Objective top-left
  panel(16, 14, 430, 64);
  ctx.fillStyle = '#ffb43c';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(objective.title, 30, 38);
  ctx.fillStyle = '#bfefff';
  ctx.font = 'bold 19px monospace';
  ctx.fillText(objective.sub, 30, 64);
  // score + chain top-right
  panel(W - 260, 14, 244, 64);
  ctx.fillStyle = '#ffb43c';
  ctx.font = 'bold 26px monospace';
  ctx.fillText('SCORE ' + gs.score, W - 244, 38);
  ctx.fillStyle = '#7df9ff';
  ctx.font = 'bold 19px monospace';
  ctx.fillText(gs.chain > 1 ? 'CHAIN x' + gs.chain : 'CHAIN x1', W - 244, 64);
  // 2 — Heading strip top-centre
  const hdg = Math.round(((plane.heading * 180 / Math.PI) % 360 + 360) % 360);
  panel(W / 2 - 170, 14, 340, 44);
  ctx.fillStyle = '#bfefff';
  ctx.font = 'bold 18px monospace';
  for (let d = -60; d <= 60; d += 30) {
    const x = W / 2 + d * 2.2;
    const v = ((hdg + d) % 360 + 360) % 360;
    ctx.fillText(String(v).padStart(3, '0'), x - 18, 36);
    ctx.fillRect(x - 1, 18, 2, 8);
  }
  ctx.fillStyle = '#ffb43c';
  ctx.fillRect(W / 2 - 2, 14, 4, 12);
  // 3 — FLOLS meatball near centre
  const cx = W / 2, cy = H * 0.42;
  panel(cx - 150, cy - 46, 300, 92);
  ctx.fillStyle = '#bfefff';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('FLOLS  ' + flols.label, cx - 132, cy - 26);
  const cols = { red: '#ff2e2e', amber: '#ffb43c', green: '#2eff5e' };
  ctx.fillStyle = cols[flols.color];
  ctx.beginPath(); ctx.arc(cx + 96, cy + 2, 20, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx + 96, cy + 2, 20, 0, Math.PI * 2); ctx.stroke();
  // datum lights
  for (let i = -2; i <= 2; i++) {
    ctx.fillStyle = i === 0 ? '#ffb43c' : '#7df9ff';
    ctx.beginPath(); ctx.arc(cx - 60 + i * 26, cy + 2, 6, 0, Math.PI * 2); ctx.fill();
  }
  // target arrow: point toward objective (screen-space hint)
  if (objective.dx !== undefined) {
    const ang = Math.atan2(objective.dy, objective.dx);
    ctx.save();
    ctx.translate(cx, cy - 78);
    ctx.rotate(ang);
    ctx.fillStyle = '#ffb43c';
    ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(-12, -12); ctx.lineTo(-12, 12); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#bfefff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(objective.dist, cx - 40, cy - 78);
  }
  // 4 — Airspeed bottom-left (big)
  panel(16, H - 96, 230, 80);
  ctx.fillStyle = '#7df9ff';
  ctx.font = 'bold 44px monospace';
  ctx.fillText(Math.round(plane.speed), 34, H - 62);
  ctx.fillStyle = '#ffb43c';
  ctx.font = 'bold 19px monospace';
  ctx.fillText('KNOTS', 150, H - 62);
  // 5 — Altitude bottom-right (big)
  panel(W - 246, H - 96, 230, 80);
  ctx.fillStyle = '#7df9ff';
  ctx.font = 'bold 44px monospace';
  ctx.fillText(Math.round(plane.pos[1]), W - 228, H - 62);
  ctx.fillStyle = '#ffb43c';
  ctx.font = 'bold 19px monospace';
  ctx.fillText('ALT M', W - 118, H - 62);
  // 6 — Fuel + throttle bottom-centre
  panel(W / 2 - 190, H - 96, 380, 80);
  ctx.fillStyle = '#bfefff';
  ctx.font = 'bold 19px monospace';
  ctx.fillText('FUEL', W / 2 - 172, H - 72);
  ctx.fillStyle = '#20264a';
  ctx.fillRect(W / 2 - 100, H - 84, 220, 22);
  ctx.fillStyle = plane.fuel < 25 ? '#ff2e2e' : '#ffb43c';
  ctx.fillRect(W / 2 - 100, H - 84, 220 * (plane.fuel / 100), 22);
  ctx.fillStyle = '#bfefff';
  ctx.fillText('THR ' + Math.round(plane.throttle * 100) + '%', W / 2 - 172, H - 38);
  ctx.fillText(plane.afterburner ? 'AFTERBURNER' : plane.airbrake ? 'AIRBRAKE' : '', W / 2 + 20, H - 38);
  // hull hearts
  ctx.fillStyle = '#ff5e5e';
  ctx.font = 'bold 26px monospace';
  let hearts = '';
  for (let i = 0; i < 3; i++) hearts += i < 3 - plane.damage ? '♥ ' : '♡ ';
  ctx.fillText(hearts, W / 2 - 172, H - 112 > 0 ? H - 112 : 20);
  // popup (big centre)
  if (gs.popup && gs.popupT > 0) {
    const a = Math.min(1, gs.popupT);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(8,10,26,0.78)';
    const pw = 620;
    ctx.fillRect(W / 2 - pw / 2, H * 0.24, pw, 96);
    ctx.strokeStyle = '#ffb43c'; ctx.lineWidth = 3;
    ctx.strokeRect(W / 2 - pw / 2, H * 0.24, pw, 96);
    ctx.fillStyle = '#ffb43c';
    ctx.font = 'bold 44px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(gs.popup.text, W / 2, H * 0.24 + 40);
    ctx.fillStyle = '#bfefff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(gs.popup.sub, W / 2, H * 0.24 + 76);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
  // (control hints live on the title screen; the bottom edge stays clean)
}
