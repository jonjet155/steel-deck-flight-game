// terrain.js — sea, islands, lighthouse, island strip (mesh builders).
import { makeRng, randRange } from './random.js';
import { PALETTE } from './config.js';

function tri(mesh, a, b, c, color) {
  mesh.positions.push(...a, ...b, ...c);
  for (let i = 0; i < 3; i++) mesh.colors.push(...color);
}

export function buildSea(size, segments, colors) {
  const mesh = { positions: [], colors: [] };
  const rng = makeRng(777);
  const step = size / segments;
  const deep = (colors && colors.deep) || PALETTE.seaDeep;
  const light = (colors && colors.light) || PALETTE.seaLight;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const x0 = -size / 2 + i * step, z0 = -size / 2 + j * step;
      const x1 = x0 + step, z1 = z0 + step;
      const w = 0.85 + rng() * 0.15;
      let c = [
        deep[0] * w + light[0] * (1 - w),
        deep[1] * w + light[1] * (1 - w),
        deep[2] * w + light[2] * (1 - w),
      ];
      // 6.3 bioluminescence, REVISED: the first attempt made ~1 in 8 sea
      // cells a BRIGHT cyan square (108 units wide) — a checkerboard of
      // giant cyan rectangles. Now ~1 in 16 cells gets only a SUBTLE lift
      // over the deep tone, so the sea reads as dark glowing teal with
      // faint light ripples, never as tiles.
      if (rng() > 0.94) c = [0.07, 0.45, 0.42];
      // ember sunset shimmer near the horizon centre line, stronger now
      const cx = (x0 + x1) / 2;
      const shimmer = Math.max(0, 1 - Math.abs(cx) / (size * 0.35)) * 0.22;
      const cc = [c[0] + shimmer * 0.9, c[1] + shimmer * 0.45, c[2] + shimmer * 0.1];
      tri(mesh, [x0, 0, z0], [x1, 0, z0], [x1, 0, z1], cc);
      tri(mesh, [x0, 0, z0], [x1, 0, z1], [x0, 0, z1], cc);
    }
  }
  return mesh;
}

export function buildIsland(cx, cz, radius, height, seed) {
  const mesh = { positions: [], colors: [] };
  const rng = makeRng(seed);
  const sides = 10;
  const top = [cx, height, cz];
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2;
    const a1 = ((i + 1) / sides) * Math.PI * 2;
    const r0 = radius * (0.85 + rng() * 0.3);
    const r1 = radius * (0.85 + rng() * 0.3);
    const p0 = [cx + Math.cos(a0) * r0, 0, cz + Math.sin(a0) * r0];
    const p1 = [cx + Math.cos(a1) * r1, 0, cz + Math.sin(a1) * r1];
    tri(mesh, p0, p1, top, PALETTE.islandGreen);
    // rock skirt
    tri(mesh, p0, top, [cx + Math.cos(a0) * r0 * 0.55, height * 0.45, cz + Math.sin(a0) * r0 * 0.55], PALETTE.islandRock);
  }
  return mesh;
}

export function buildLighthouse(x, z) {
  // striped tower + lamp room, at island edge
  const mesh = { positions: [], colors: [] };
  const w = 6, h = 42, y0 = 8;
  const cW = [0.95, 0.92, 0.85], cR = [0.85, 0.2, 0.15];
  function box(x0, y0b, z0, x1, y1, z1, col) {
    const A = [x0, y0b, z0], B = [x1, y0b, z0], C = [x1, y1, z0], D = [x0, y1, z0];
    const E = [x0, y0b, z1], F = [x1, y0b, z1], G = [x1, y1, z1], H = [x0, y1, z1];
    tri(mesh, A, B, C, col); tri(mesh, A, C, D, col);
    tri(mesh, F, E, H, col); tri(mesh, F, H, G, col);
    tri(mesh, E, A, D, col); tri(mesh, E, D, H, col);
    tri(mesh, B, F, G, col); tri(mesh, B, G, C, col);
    tri(mesh, D, C, G, col); tri(mesh, D, G, H, col);
  }
  box(x - w / 2, y0, z - w / 2, x + w / 2, y0 + h * 0.55, z + w / 2, cW);
  box(x - w / 2, y0 + h * 0.55, z - w / 2, x + w / 2, y0 + h, z + w / 2, cR);
  box(x - 4, y0 + h, z - 4, x + 4, y0 + h + 7, z + 4, PALETTE.amber);
  return mesh;
}

// 6.4: a lighthouse's lamp glow — a bright amber halo fan around the lamp
// room + a long horizontal light beam, so the lighthouse reads as a living
// beacon at 1000+ units, not a striped stick.
export function buildLighthouseGlow(x, z) {
  const mesh = { positions: [], colors: [] };
  const lx = x, ly = 8 + 42 + 3, lz = z;
  const halo = [1.0, 0.85, 0.45];
  let prev = null;
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const p = [lx + Math.cos(a) * 26, ly + Math.sin(a) * 26, lz];
    if (prev) tri(mesh, [lx, ly, lz], prev, p, halo);
    prev = p;
  }
  // beam: a long thin bright wedge pointing out to sea (toward +x, the
  // open water side of both lighthouse islands)
  tri(mesh, [lx, ly - 2, lz - 3], [lx + 150, ly - 6, lz - 8], [lx + 150, ly + 2, lz - 2], [1.0, 0.9, 0.55]);
  tri(mesh, [lx, ly - 2, lz + 3], [lx + 150, ly + 2, lz + 2], [lx + 150, ly - 6, lz + 8], [1.0, 0.9, 0.55]);
  return mesh;
}

// 6.4: a lit coastal settlement on an island — a cluster of warm glowing
// windows (small bright boxes) scattered up the island slope + a few big
// glow panes, so the far islands read as lived-in villages at dusk.
// Deterministic per island seed; windows face all sides (the chase camera
// circles the archipelago), so no orientation assumption is made.
export function buildSettlementLights(island) {
  const mesh = { positions: [], colors: [] };
  const rng = makeRng(island.seed * 7 + 5);
  const { x: cx, z: cz, r, h } = island;
  const warm = [[1.0, 0.72, 0.22], [1.0, 0.85, 0.45], [1.0, 0.60, 0.15], [1.0, 0.78, 0.35]];
  const boxAt = (x, y, z, s, col) => {
    const h2 = s / 2;
    const A = [x - h2, y - h2, z - h2], B = [x + h2, y - h2, z - h2], C = [x + h2, y + h2, z - h2], D = [x - h2, y + h2, z - h2];
    const E = [x - h2, y - h2, z + h2], F = [x + h2, y - h2, z + h2], G = [x + h2, y + h2, z + h2], H = [x - h2, y + h2, z + h2];
    tri(mesh, A, B, C, col); tri(mesh, A, C, D, col);
    tri(mesh, F, E, H, col); tri(mesh, F, H, G, col);
    tri(mesh, E, A, D, col); tri(mesh, E, D, H, col);
    tri(mesh, B, F, G, col); tri(mesh, B, G, C, col);
    tri(mesh, D, C, G, col); tri(mesh, D, G, H, col);
  };
  // 12 windows in a loose village cluster on the lower slope, denser on
  // the shore side (frac 0.75-0.95 of the radius), a few higher up
  for (let i = 0; i < 12; i++) {
    const a = rng() * Math.PI * 2;
    const frac = 0.72 + rng() * 0.24;
    const rr = r * frac;
    const y = 3 + h * (1 - frac) * 0.9 + rng() * 6;
    const s = 5 + rng() * 4;
    boxAt(cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr, s, warm[i % warm.length]);
  }
  // 3 big glow panes (tavern / harbour hall) low on the shore
  for (let i = 0; i < 3; i++) {
    const a = rng() * Math.PI * 2;
    const rr = r * 0.9;
    boxAt(cx + Math.cos(a) * rr, 5 + rng() * 4, cz + Math.sin(a) * rr, 10, [1.0, 0.9, 0.55]);
  }
  return mesh;
}

export function buildStrip(x, z, heading) {
  // island airstrip: flat runway slab + lights
  const mesh = { positions: [], colors: [] };
  const L = 120, W = 22;
  const y = 6;
  const dx = Math.sin(heading), dz = Math.cos(heading);
  const px = Math.cos(heading), pz = -Math.sin(heading);
  function corner(al, aw) {
    return [x + dx * al + px * aw, y, z + dz * al + pz * aw];
  }
  const grey = [0.42, 0.42, 0.46];
  tri(mesh, corner(-L / 2, -W / 2), corner(L / 2, -W / 2), corner(L / 2, W / 2), grey);
  tri(mesh, corner(-L / 2, -W / 2), corner(L / 2, W / 2), corner(-L / 2, W / 2), grey);
  // centre line dashes (amber)
  for (let s = -L / 2 + 8; s < L / 2 - 8; s += 16) {
    tri(mesh, corner(s, -1), corner(s + 8, -1), corner(s + 8, 1), PALETTE.amber);
    tri(mesh, corner(s, -1), corner(s + 8, 1), corner(s, 1), PALETTE.amber);
  }
  return mesh;
}

export const ISLANDS = [
  { name: 'Pulau Karang Api', x: -420, z: 520, r: 130, h: 55, seed: 11 },
  { name: 'Pulau Kabut', x: 480, z: 640, r: 110, h: 42, seed: 22 },
  { name: 'Pulau Mercusuar', x: -560, z: -180, r: 95, h: 38, seed: 33 },
  { name: 'Tanjung Badai', x: 620, z: -320, r: 80, h: 30, seed: 44 },
];
export const STRIP = { x: -420, z: 520, heading: 0.4 };
export const LIGHTHOUSE = { x: -560, z: -180 };
// 6.4: second lighthouse on the shore of Pulau Karang Api, beside the
// supply strip — the cover shot's island finally has its own beacon.
export const LIGHTHOUSE2 = { x: -300, z: 600 };
