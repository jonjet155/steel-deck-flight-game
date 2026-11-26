// weather.js — storm cells, rain, lightning, wind gusts, clouds.
import { makeRng, randRange } from './random.js';

export function makeWeather(seed) {
  const rng = makeRng(seed);
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({
      x: randRange(rng, -900, 900), y: randRange(rng, 260, 380), z: randRange(rng, -900, 900),
      s: randRange(rng, 12, 30), speed: randRange(rng, 2, 7), lit: rng() > 0.5,
    });
  }
  const rain = [];
  for (let i = 0; i < 320; i++) {
    rain.push({ x: randRange(rng, -300, 300), y: randRange(rng, 0, 220), z: randRange(rng, -300, 300), v: randRange(rng, 90, 160) });
  }
  return { clouds, rain, gustT: 0, gust: [0, 0], flash: 0, flashT: 2 + rng() * 3 };
}

export function updateWeather(w, dt, t, planePos) {
  for (const c of w.clouds) { c.x += c.speed * dt; if (c.x > 950) c.x = -950; }
  for (const r of w.rain) {
    r.y -= r.v * dt;
    if (r.y < 0) { r.y = 220; r.x = planePos[0] + (Math.random() - 0.5) * 500; r.z = planePos[2] + (Math.random() - 0.5) * 500; }
  }
  w.gustT -= dt;
  if (w.gustT <= 0) {
    w.gustT = 1.5 + Math.random() * 2.5;
    w.gust = [(Math.random() - 0.5) * 14, (Math.random() - 0.5) * 6];
  }
  w.flashT -= dt;
  if (w.flashT <= 0) { w.flash = 1; w.flashT = 3 + Math.random() * 6; }
  if (w.flash > 0) w.flash = Math.max(0, w.flash - dt * 2.2);
  return w;
}

// turbulence inside a storm cell: returns [gustX, gustY, damageTick]
export function cellTurbulence(cell, pos) {
  const dx = pos[0] - cell.x, dz = pos[2] - cell.z;
  const d = Math.hypot(dx, dz);
  if (d > cell.r) return null;
  const k = (1 - d / cell.r) * cell.strength;
  return {
    gx: Math.sin(pos[1] * 0.3 + cell.phase) * 18 * k,
    gy: Math.cos(pos[2] * 0.2 + cell.phase) * 10 * k,
    damage: k > 0.55,
    k,
  };
}
