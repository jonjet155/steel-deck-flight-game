// carrier.js — KRI HALILINTAR deck, island superstructure, FLOLS, 3 wires, catapult, crew, lights.
import { PALETTE, CFG } from './config.js';

function tri(mesh, a, b, c, color) {
  mesh.positions.push(...a, ...b, ...c);
  for (let i = 0; i < 3; i++) mesh.colors.push(...color);
}
function box(mesh, x0, y0, z0, x1, y1, z1, col) {
  const A = [x0, y0, z0], B = [x1, y0, z0], C = [x1, y1, z0], D = [x0, y1, z0];
  const E = [x0, y0, z1], F = [x1, y0, z1], G = [x1, y1, z1], H = [x0, y1, z1];
  tri(mesh, A, B, C, col); tri(mesh, A, C, D, col);
  tri(mesh, F, E, H, col); tri(mesh, F, H, G, col);
  tri(mesh, E, A, D, col); tri(mesh, E, D, H, col);
  tri(mesh, B, F, G, col); tri(mesh, B, G, C, col);
  tri(mesh, D, C, G, col); tri(mesh, D, G, H, col);
}

export function carrierState(t) {
  // carrier steams slowly forward (+z), deck at y=18
  return { x: 0, z: t * CFG.carrierSpeed * 0.1, y: CFG.deckY, heading: 0 };
}

export function buildCarrierMesh(t) {
  const mesh = { positions: [], colors: [] };
  const c = carrierState(t);
  const L = CFG.deckLength, W = CFG.deckWidth, y = c.y, z0 = c.z - L / 2, z1 = c.z + L / 2;
  // hull
  box(mesh, -W / 2 - 4, y - 16, z0 - 6, W / 2 + 4, y, z1 + 6, [0.28, 0.30, 0.35]);
  // deck slab — bright steel grey so it reads in screenshots
  box(mesh, -W / 2, y, z0, W / 2, y + 2, z1, PALETTE.deckGrey);
  // landing strip (angled, amber centre line)
  const lx0 = -8, lx1 = 8;
  tri(mesh, [lx0, y + 2.1, z0 + 20], [lx1, y + 2.1, z0 + 20], [lx1, y + 2.1, z1 - 10], PALETTE.deckDark);
  tri(mesh, [lx0, y + 2.1, z0 + 20], [lx1, y + 2.1, z1 - 10], [lx0, y + 2.1, z1 - 10], PALETTE.deckDark);
  // centre dashes
  for (let z = z0 + 30; z < z1 - 20; z += 18) {
    tri(mesh, [-1.2, y + 2.2, z], [1.2, y + 2.2, z], [1.2, y + 2.2, z + 9], PALETTE.amber);
    tri(mesh, [-1.2, y + 2.2, z], [1.2, y + 2.2, z + 9], [-1.2, y + 2.2, z + 9], PALETTE.amber);
  }
  // deck edge lights (amber, both sides)
  for (let z = z0 + 6; z < z1; z += 14) {
    box(mesh, -W / 2 - 1, y + 2, z, -W / 2 + 1, y + 3.4, z + 2, PALETTE.amber);
    box(mesh, W / 2 - 1, y + 2, z, W / 2 + 1, y + 3.4, z + 2, PALETTE.amber);
  }
  // island superstructure (starboard)
  box(mesh, W / 2 - 14, y + 2, c.z - 30, W / 2 - 2, y + 26, c.z + 18, [0.55, 0.57, 0.62]);
  box(mesh, W / 2 - 12, y + 26, c.z - 22, W / 2 - 4, y + 34, c.z + 10, [0.35, 0.37, 0.42]);
  // bridge windows — glowing cyan
  box(mesh, W / 2 - 12.5, y + 28, c.z - 20, W / 2 - 3.5, y + 31, c.z + 8, PALETTE.cyan);
  // mast + radar
  box(mesh, W / 2 - 9, y + 34, c.z - 8, W / 2 - 7, y + 48, c.z - 4, [0.4, 0.42, 0.46]);
  box(mesh, W / 2 - 13, y + 44, c.z - 10, W / 2 - 3, y + 46, c.z - 2, PALETTE.amber);
  // 3 arrestor wires — glowing amber bars across the landing strip
  const wireZ = [c.z + 42, c.z + 58, c.z + 74]; // wire 1, 2, 3 (3 = centre/perfect)
  for (let i = 0; i < 3; i++) {
    const col = i === 2 ? PALETTE.green : PALETTE.amber;
    box(mesh, -9, y + 2.3, wireZ[i] - 0.8, 9, y + 3.2, wireZ[i] + 0.8, col);
  }
  // FLOLS mast (port side, near stern): vertical datum + meatball column
  const fx = -W / 2 - 6, fz = c.z + 30;
  box(mesh, fx - 1, y, fz - 1, fx + 1, y + 14, fz + 1, [0.2, 0.2, 0.24]);
  return { mesh, wireZ, flols: { x: fx, y: y + 7, z: fz } };
}

export function buildCrewMesh(t) {
  // simple deck-crew figures: capsule-ish boxes in hi-vis colours, bobbing slightly
  const mesh = { positions: [], colors: [] };
  const c = carrierState(t);
  const crewCols = [[1, 0.85, 0.1], [0.95, 0.4, 0.1], [0.2, 0.8, 1], [0.9, 0.9, 0.2]];
  const spots = [[-20, c.z - 40], [18, c.z + 10], [-22, c.z + 60], [20, c.z - 80], [-16, c.z + 100]];
  spots.forEach(([x, z], i) => {
    const bob = Math.sin(t * 2 + i * 1.7) * 0.4;
    const col = crewCols[i % crewCols.length];
    box(mesh, x - 1, c.y + 2 + bob, z - 1, x + 1, c.y + 7 + bob, z + 1, col);
    box(mesh, x - 1.2, c.y + 7 + bob, z - 1.2, x + 1.2, c.y + 9.4 + bob, z + 1.2, [0.9, 0.75, 0.6]);
  });
  return mesh;
}

// FLOLS meatball state from glide error: -1 low (red), 0 on (amber), +1 high (green)
export function flolsState(plane, wireZ) {
  const targetZ = wireZ[2];
  const dz = plane.pos[2] - targetZ;
  const idealAlt = CFG.deckY + 2 + Math.max(0, -dz) * 0.09;
  const err = plane.pos[1] - idealAlt;
  if (err < -6) return { color: 'red', label: 'LOW', err };
  if (err > 8) return { color: 'green', label: 'HIGH', err };
  return { color: 'amber', label: 'ON GLIDE', err };
}

export function checkTrap(plane, wireZ) {
  // plane crossing deck level near wires while descending gently
  if (plane.pos[1] > CFG.deckY + 6 || plane.pos[1] < CFG.deckY) return null;
  if (Math.abs(plane.pos[0]) > 10) return null;
  const z = plane.pos[2];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(z - wireZ[i]) < 7) return { wire: i + 1, score: [100, 150, 250][i] };
  }
  return null;
}
