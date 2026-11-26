// particles.js — spray, rain streaks, catapult steam, trap sparks, popups.
export function makeParticles() {
  return { list: [] };
}
export function spawn(p, kind, x, y, z, n, color, speed = 20) {
  for (let i = 0; i < n; i++) {
    p.list.push({
      kind, x, y, z,
      vx: (Math.random() - 0.5) * speed, vy: Math.random() * speed * 0.7, vz: (Math.random() - 0.5) * speed,
      life: 0.6 + Math.random() * 0.8, max: 1.4, color, size: 1 + Math.random() * 2.5,
    });
  }
  if (p.list.length > 500) p.list.splice(0, p.list.length - 500);
}
export function updateParticles(p, dt) {
  for (const q of p.list) {
    q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
    q.vy -= 6 * dt; q.life -= dt;
  }
  p.list = p.list.filter((q) => q.life > 0);
}
// Build a triangle mesh for all live particles (camera-facing quads approximated as small triangles).
export function particlesMesh(p) {
  const mesh = { positions: [], colors: [] };
  for (const q of p.list) {
    const s = q.size;
    const a = q.life / q.max;
    const col = [q.color[0] * a + 0.2, q.color[1] * a + 0.2, q.color[2] * a + 0.2];
    mesh.positions.push(q.x - s, q.y, q.z, q.x + s, q.y, q.z, q.x, q.y + s * 1.6, q.z);
    for (let i = 0; i < 3; i++) mesh.colors.push(...col);
  }
  return mesh;
}
export function showPopup(gs, text, sub) {
  gs.popup = { text, sub: sub || '' };
  gs.popupT = 2.2;
}

// Celebration firework: a radial burst high over the deck. Bright, big,
// slow-falling — the trap moment's payoff, visible in one screenshot frame.
export function spawnFirework(p, x, y, z, color) {
  for (let i = 0; i < 42; i++) {
    const a = (i / 42) * Math.PI * 2 + Math.random() * 0.3;
    const sp = 14 + Math.random() * 22;
    p.list.push({
      kind: 'firework', x, y, z,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 + 8, vz: (Math.random() - 0.5) * sp,
      life: 2.2 + Math.random() * 1.3, max: 3.5, color, size: 2.2 + Math.random() * 2.4,
    });
  }
  if (p.list.length > 500) p.list.splice(0, p.list.length - 500);
}

// Ember confetti: slow golden drift down over the deck after a perfect trap.
export function spawnEmbers(p, x, y, z, n) {
  for (let i = 0; i < n; i++) {
    p.list.push({
      kind: 'ember', x: x + (Math.random() - 0.5) * 40, y: y + Math.random() * 30, z: z + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 4, vy: -3 - Math.random() * 4, vz: (Math.random() - 0.5) * 4,
      life: 1.5 + Math.random(), max: 2.5, color: [1, 0.62, 0.15], size: 1.6 + Math.random() * 1.8,
    });
  }
  if (p.list.length > 500) p.list.splice(0, p.list.length - 500);
}
