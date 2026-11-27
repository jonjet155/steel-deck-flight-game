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
  // 6.3 phosphorescent wake: a glowing teal fan trailing behind the stern
  // at sea level, widening as it falls behind — the sea lights up for her
  tri(mesh, [-6, 0.6, z0 - 6], [6, 0.6, z0 - 6], [26, 0.6, z0 - 150], [0.10, 0.75, 0.70]);
  tri(mesh, [-6, 0.6, z0 - 6], [26, 0.6, z0 - 150], [-26, 0.6, z0 - 150], [0.10, 0.75, 0.70]);
  tri(mesh, [-3, 0.7, z0 - 6], [3, 0.7, z0 - 6], [12, 0.7, z0 - 110], [0.16, 0.95, 0.85]);
  tri(mesh, [-3, 0.7, z0 - 6], [12, 0.7, z0 - 110], [-12, 0.7, z0 - 110], [0.16, 0.95, 0.85]);
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
  // deck edge stripes — ember-orange lines running the full deck length,
  // the carrier's signature: no other deck in the field is edged in ember
  tri(mesh, [-W / 2 + 1, y + 2.1, z0 + 4], [-W / 2 + 3.4, y + 2.1, z0 + 4], [-W / 2 + 3.4, y + 2.1, z1 - 4], PALETTE.ember);
  tri(mesh, [-W / 2 + 1, y + 2.1, z0 + 4], [-W / 2 + 3.4, y + 2.1, z1 - 4], [-W / 2 + 1, y + 2.1, z1 - 4], PALETTE.ember);
  tri(mesh, [W / 2 - 3.4, y + 2.1, z0 + 4], [W / 2 - 1, y + 2.1, z0 + 4], [W / 2 - 1, y + 2.1, z1 - 4], PALETTE.ember);
  tri(mesh, [W / 2 - 3.4, y + 2.1, z0 + 4], [W / 2 - 1, y + 2.1, z1 - 4], [W / 2 - 3.4, y + 2.1, z1 - 4], PALETTE.ember);
  // landing chevrons — big amber arrows on the strip pointing at the wires
  for (const cz of [c.z - 10, c.z + 10]) {
    tri(mesh, [-6, y + 2.2, cz - 6], [0, y + 2.2, cz + 6], [6, y + 2.2, cz - 6], PALETTE.amber);
  }
  // deck edge lights (amber, both sides)
  for (let z = z0 + 6; z < z1; z += 14) {
    box(mesh, -W / 2 - 1, y + 2, z, -W / 2 + 1, y + 3.4, z + 2, PALETTE.amber);
    box(mesh, W / 2 - 1, y + 2, z, W / 2 + 1, y + 3.4, z + 2, PALETTE.amber);
  }
  // island superstructure (starboard)
  box(mesh, W / 2 - 14, y + 2, c.z - 30, W / 2 - 2, y + 26, c.z + 18, [0.55, 0.57, 0.62]);
  box(mesh, W / 2 - 12, y + 26, c.z - 22, W / 2 - 4, y + 34, c.z + 10, [0.35, 0.37, 0.42]);
  // hull number "07" on the superstructure's stern face (faces the
  // approaching plane, so the trap shot carries the ship's identity)
  const nz0 = c.z - 31, nz1 = c.z - 30;
  const d0x = W / 2 - 13, d7x = W / 2 - 6.5;
  // "0": outline of four bars
  box(mesh, d0x, y + 8, nz0, d0x + 1.6, y + 22, nz1, PALETTE.amber);
  box(mesh, d0x + 4.4, y + 8, nz0, d0x + 6, y + 22, nz1, PALETTE.amber);
  box(mesh, d0x, y + 20.4, nz0, d0x + 6, y + 22, nz1, PALETTE.amber);
  box(mesh, d0x, y + 8, nz0, d0x + 6, y + 9.6, nz1, PALETTE.amber);
  // "7": top bar + diagonal down to the left
  box(mesh, d7x, y + 20.4, nz0, d7x + 6, y + 22, nz1, PALETTE.amber);
  box(mesh, d7x + 4.4, y + 14, nz0, d7x + 6, y + 20.4, nz1, PALETTE.amber);
  box(mesh, d7x + 1.5, y + 8, nz0, d7x + 3.1, y + 14, nz1, PALETTE.amber);
  // funnel with an ember band — the superstructure's second signature
  box(mesh, W / 2 - 12, y + 34, c.z - 18, W / 2 - 5, y + 44, c.z - 8, [0.30, 0.32, 0.36]);
  box(mesh, W / 2 - 12, y + 40, c.z - 18, W / 2 - 5, y + 42.5, c.z - 8, PALETTE.ember);
  // teal floodlights on the superstructure's port face (facing the deck)
  for (let z = c.z - 24; z < c.z + 14; z += 12) {
    box(mesh, W / 2 - 14.6, y + 14, z, W / 2 - 14, y + 17, z + 4, PALETTE.teal);
  }
  // bridge windows — glowing cyan
  box(mesh, W / 2 - 12.5, y + 28, c.z - 20, W / 2 - 3.5, y + 31, c.z + 8, PALETTE.cyan);
  // mast + radar
  box(mesh, W / 2 - 9, y + 34, c.z - 8, W / 2 - 7, y + 48, c.z - 4, [0.4, 0.42, 0.46]);
  box(mesh, W / 2 - 13, y + 44, c.z - 10, W / 2 - 3, y + 46, c.z - 2, PALETTE.amber);
  // "HALILINTAR" in big block letters on the port deck, laid along +z
  // runway-style so the approaching plane reads it: letter top = far (+z)
  // end, column 0 = viewer's left (+x — the chase view is mirrored).
  const LETTERS = {
    H: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4]],
    A: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 0], [1, 2], [2, 1], [2, 2], [2, 3], [2, 4]],
    L: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4]],
    I: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2], [1, 3], [0, 4], [1, 4], [2, 4]],
    N: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
    R: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2], [1, 3], [2, 4]],
  };
  {
    const cw = 4.0, cd = 4.0, ch = 1.2, pitch = 24;
    const word = 'HALILINTAR';
    const x0 = -25.5, z0 = c.z - 102;
    [...word].forEach((ch, li) => {
      const segs = LETTERS[ch];
      if (!segs) return;
      const lz = z0 + li * pitch;
      for (const [col, row] of segs) {
        const x = x0 + (2 - col) * cw;
        const z = lz + (4 - row) * cd;
        box(mesh, x, y + 2.2, z, x + cw * 0.92, y + 2.2 + ch, z + cd * 0.92, PALETTE.amber);
      }
    });
  }
  // 2 parked aircraft on the starboard deck, folded wings, amber tips —
  // the deck is a working airfield, not an empty slab. 6.3: ember livery,
  // matching the flying plane
  const parkedPlane = (x, z, noseDir, col) => {
    const zA = Math.min(z - 7 * noseDir, z + 7 * noseDir), zB = Math.max(z - 7 * noseDir, z + 7 * noseDir);
    box(mesh, x - 1.6, y + 2, zA, x + 1.6, y + 4.4, zB, col);
    box(mesh, x - 7.5, y + 3.4, z - 2, x + 7.5, y + 4.2, z + 2, col);
    box(mesh, x - 0.3, y + 4.4, zB - 3, x + 0.3, y + 7, zB - 1, col);
    box(mesh, x - 7.5, y + 3.4, z - 2, x - 6.2, y + 4.2, z + 2, PALETTE.amber);
    box(mesh, x + 6.2, y + 3.4, z - 2, x + 7.5, y + 4.2, z + 2, PALETTE.amber);
    const czA = noseDir > 0 ? zA : zB - 3;
    box(mesh, x - 0.9, y + 4.4, czA, x + 0.9, y + 5.4, czA + 3, [0.05, 0.08, 0.15]);
  };
  parkedPlane(17, c.z - 62, 1, [1.0, 0.45, 0.08]);
  parkedPlane(17, c.z + 120, -1, [0.95, 0.42, 0.08]); // moved aft of the bow letters
  // 6.3 best-effort: "HALILINTAR" ACROSS the deck width near the bow —
  // one big word spanning x -28..+28, letters 5.6 wide and 20 deep (deep
  // in z, the foreshortened direction, so they stand a chance of reading
  // from the chase view). The fore-aft letters above stay as the fallback.
  {
    const cw = 56 / 10 / 3, cd = 20 / 5, ch = 1.2;
    const word = 'HALILINTAR';
    const x0 = -28, z0 = c.z + 88;
    [...word].forEach((ch, li) => {
      const segs = LETTERS[ch];
      if (!segs) return;
      const lx = x0 + li * (56 / 10);
      for (const [col, row] of segs) {
        const x = lx + col * cw;
        const z = z0 + row * cd;
        box(mesh, x, y + 2.2, z, x + cw * 0.92, y + 2.2 + ch, z + cd * 0.92, [1.0, 0.75, 0.20]);
      }
    });
  }
  // fuel truck parked by the island: white tank, red cab, red stripe
  box(mesh, 11, y + 2, c.z + 24, 15, y + 5.5, c.z + 34, [0.88, 0.88, 0.90]);
  box(mesh, 11, y + 4.4, c.z + 24, 15, y + 5.0, c.z + 34, [0.85, 0.2, 0.15]);
  box(mesh, 11, y + 2, c.z + 34, 15, y + 6, c.z + 38, [0.85, 0.2, 0.15]);
  box(mesh, 10.6, y + 2, c.z + 25, 11, y + 3.6, c.z + 28, [0.15, 0.15, 0.18]);
  box(mesh, 10.6, y + 2, c.z + 31, 11, y + 3.6, c.z + 34, [0.15, 0.15, 0.18]);
  box(mesh, 15, y + 2, c.z + 25, 15.4, y + 3.6, c.z + 28, [0.15, 0.15, 0.18]);
  box(mesh, 15, y + 2, c.z + 31, 15.4, y + 3.6, c.z + 34, [0.15, 0.15, 0.18]);
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
  // deck-crew figures: tall enough to read from the chase camera — hi-vis
  // vest body + white helmet, bobbing slightly, working the wires and the
  // parked aircraft. Spots stay clear of the HALILINTAR deck lettering.
  const mesh = { positions: [], colors: [] };
  const c = carrierState(t);
  const crewCols = [[1, 0.55, 0.1], [1, 0.85, 0.1], [0.2, 0.8, 1], [0.3, 0.9, 0.4], [1, 0.55, 0.1]];
  const spots = [[-13, c.z + 34], [13, c.z + 52], [-12, c.z + 78], [12, c.z - 8], [-12, c.z - 58]];
  spots.forEach(([x, z], i) => {
    const bob = Math.sin(t * 2 + i * 1.7) * 0.4;
    const col = crewCols[i % crewCols.length];
    box(mesh, x - 1.2, c.y + 2 + bob, z - 1.2, x + 1.2, c.y + 8.5 + bob, z + 1.2, col);
    box(mesh, x - 1.3, c.y + 8.5 + bob, z - 1.3, x + 1.3, c.y + 10.8 + bob, z + 1.3, [0.95, 0.95, 0.92]);
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
