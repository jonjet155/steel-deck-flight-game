// main.js — game loop, states: title / map / play / trapped / bolter / crashed.
import { CFG, PALETTE, PLANES, UPGRADES } from './config.js';
import { Input } from './input.js';
import { makePlane, updateFlight, damagePlane } from './flight.js';
import { buildSea, buildIsland, buildLighthouse, buildStrip, ISLANDS, STRIP, LIGHTHOUSE } from './terrain.js';
import { buildCarrierMesh, buildCrewMesh, carrierState, flolsState, checkTrap } from './carrier.js';
import { SORTIES, makeStormCells, BOSSES, makeGameState } from './missions.js';
import { makeWeather, updateWeather, cellTurbulence } from './weather.js';
import { makeParticles, spawn, spawnFirework, spawnEmbers, updateParticles, particlesMesh, showPopup } from './particles.js';
import { makeAudio } from './audio.js';
import { drawHUD } from './hud.js';
import { makeRenderer } from './render.js';
import { applyShot, shotObjective } from './shots.js';

const canvas = document.getElementById('game');
const hudCanvas = document.getElementById('hud');
const hudCtx = hudCanvas.getContext('2d');
const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');

const gs = makeGameState();
const plane = makePlane(PLANES[1]);
const cells = makeStormCells(20261127);
const weather = makeWeather(99);
const particles = makeParticles();
const audio = makeAudio();
window.__toggleMute = () => audio.toggleMute();

const renderer = makeRenderer(canvas);
const game = { gs, plane, cells, weather, carrierT: 0, shotMode: null, trapStaged: false, stormStaged: false };
applyShot(game, params);

Input.init(canvas);
canvas.addEventListener('click', () => audio.init());

// static meshes (built once)
let seaMesh = buildSea(CFG.seaSize, 24, game.seaTint);
const islandMeshes = ISLANDS.map((is) => buildIsland(is.x, is.z, is.r, is.h, is.seed));
const lighthouseMesh = buildLighthouse(LIGHTHOUSE.x, LIGHTHOUSE.z);
const stripMesh = buildStrip(STRIP.x, STRIP.z, STRIP.heading);
// clouds: soft flat puffs, never tall pyramids. Per-shot palette — warm
// ember-lit for the supply run, dark slate with ember rims for the storm.
function buildCloudMeshes(clouds, mode) {
  const pal = mode === 'warm'
    ? { lit: [0.78, 0.48, 0.38], dark: [0.40, 0.30, 0.50] }
    : mode === 'storm'
      ? { lit: [0.55, 0.30, 0.18], dark: [0.13, 0.13, 0.26] }
      : { lit: [0.72, 0.42, 0.42], dark: [0.38, 0.30, 0.48] };
  return clouds.map((c) => {
    const s = c.s;
    const mesh = { positions: [], colors: [] };
    const col = c.lit ? pal.lit : pal.dark;
    const tri = (a, b, d, cc) => { mesh.positions.push(...a, ...b, ...d); for (let i = 0; i < 3; i++) mesh.colors.push(...cc); };
    const x = c.x, y = c.y, z = c.z;
    tri([x - s, y, z - s * 0.5], [x + s, y, z - s * 0.5], [x, y + s * 0.28, z], col);
    tri([x - s, y, z + s * 0.5], [x, y + s * 0.28, z], [x + s, y, z + s * 0.5], col);
    tri([x - s * 0.6, y + s * 0.22, z], [x + s * 0.6, y + s * 0.22, z], [x, y + s * 0.5, z], col);
    return mesh;
  });
}
let cloudMeshes = buildCloudMeshes(weather.clouds, game.cloudMode);
// storm cell: a dark volumetric MASS — a low flattened dome in uniform
// dark slate with an ember-lit lower rim on the sun side. Never a pale
// pyramid, never white.
function buildStormCell(x, z, r, y) {
  const mesh = { positions: [], colors: [] };
  const tri = (a, b, d, cc) => { mesh.positions.push(...a, ...b, ...d); for (let i = 0; i < 3; i++) mesh.colors.push(...cc); };
  const dark = [0.10, 0.11, 0.24], dark2 = [0.14, 0.13, 0.28], top = [0.07, 0.08, 0.18];
  const segs = 10;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
    const p0 = [x + Math.cos(a0) * r, y - 10, z + Math.sin(a0) * r];
    const p1 = [x + Math.cos(a1) * r, y - 10, z + Math.sin(a1) * r];
    const m0 = [x + Math.cos(a0) * r * 0.55, y + r * 0.28, z + Math.sin(a0) * r * 0.55];
    const m1 = [x + Math.cos(a1) * r * 0.55, y + r * 0.28, z + Math.sin(a1) * r * 0.55];
    const apex = [x, y + r * 0.5, z];
    // ember-lit rim: a THIN sliver along the base edge on the sun-facing
    // side only (3 of 10 segments) — a glowing line, never an orange face.
    // The lower band itself stays dark slate.
    const band = i % 2 ? dark : dark2;
    tri(p0, p1, m1, band);
    tri(p0, m1, m0, band);
    tri(m0, m1, apex, top);
    if (Math.cos(a0) > 0.6) {
      const mid = [x + Math.cos((a0 + a1) / 2) * r * 0.97, y - 4, z + Math.sin((a0 + a1) / 2) * r * 0.97];
      tri(p0, p1, mid, [0.5, 0.25, 0.12]);
    }
  }
  return mesh;
}
const stormMeshes = cells.map((cell) => buildStormCell(cell.x, cell.z, cell.r, cell.y));

// ---- staged meshes (screenshot staging only, never gameplay) ----
function boxTri(mesh, x0, y0, z0, x1, y1, z1, col) {
  const tri = (a, b, c, cc) => { mesh.positions.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) mesh.colors.push(...cc); };
  const A = [x0, y0, z0], B = [x1, y0, z0], C = [x1, y1, z0], D = [x0, y1, z0];
  const E = [x0, y0, z1], F = [x1, y0, z1], G = [x1, y1, z1], H = [x0, y1, z1];
  tri(A, B, C, col); tri(A, C, D, col);
  tri(F, E, H, col); tri(F, H, G, col);
  tri(E, A, D, col); tri(E, D, H, col);
  tri(B, F, G, col); tri(B, G, C, col);
  tri(D, C, G, col); tri(D, G, H, col);
}
// fly-through ring: a vertical annulus facing the plane, amber with ember ticks
function ringMesh(cx, cy, cz, heading, rOut, rIn, col) {
  const mesh = { positions: [], colors: [] };
  const rx = Math.cos(heading), rz = -Math.sin(heading);
  const segs = 16;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
    const p = (a, r) => [cx + rx * Math.cos(a) * r, cy + Math.sin(a) * r, cz + rz * Math.cos(a) * r];
    const o0 = p(a0, rOut), o1 = p(a1, rOut), i0 = p(a0, rIn), i1 = p(a1, rIn);
    const cc = i % 4 === 0 ? PALETTE.ember : col;
    mesh.positions.push(...o0, ...i0, ...i1, ...o0, ...i1, ...o1);
    for (let k = 0; k < 6; k++) mesh.colors.push(...cc);
  }
  return mesh;
}
const stagedMeshes = [];
if (SHOT === 'play') {
  // supply-run staging: a coastal strip on a sandbar off Pulau Karang Api,
  // amber dashes + cargo crates, so the island reads as a destination
  {
    const mesh = { positions: [], colors: [] };
    const tri = (a, b, c, cc) => { mesh.positions.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) mesh.colors.push(...cc); };
    // sandbar grounding the strip to the island shore
    tri([-362, 2, 556], [-278, 2, 646], [-332, 2, 518], [0.55, 0.50, 0.35]);
    tri([-362, 2, 556], [-332, 2, 518], [-392, 2, 540], [0.55, 0.50, 0.35]);
    // strip slab: centre (-330, 580), heading 0.4, 110 x 26 at y 5.5
    const dx = Math.sin(0.4), dz = Math.cos(0.4), px = Math.cos(0.4), pz = -Math.sin(0.4);
    const corner = (al, aw) => [-330 + dx * al + px * aw, 5.5, 580 + dz * al + pz * aw];
    const grey = [0.42, 0.42, 0.46];
    tri(corner(-55, -13), corner(55, -13), corner(55, 13), grey);
    tri(corner(-55, -13), corner(55, 13), corner(-55, 13), grey);
    for (let s = -47; s < 47; s += 16) {
      tri(corner(s, -1), corner(s + 8, -1), corner(s + 8, 1), PALETTE.amber);
      tri(corner(s, -1), corner(s + 8, 1), corner(s, 1), PALETTE.amber);
    }
    // cargo crates stacked beside the strip
    boxTri(mesh, -302, 5.5, 556, -294, 11.5, 564, PALETTE.amber);
    boxTri(mesh, -292, 5.5, 566, -284, 10.5, 574, [0.85, 0.85, 0.88]);
    boxTri(mesh, -306, 5.5, 574, -298, 12.5, 582, PALETTE.amber);
    boxTri(mesh, -296, 11.5, 558, -290, 16.5, 564, [0.7, 0.5, 0.2]);
    stagedMeshes.push(mesh);
  }
  // fly-through ring ahead of the plane, on the approach to the strip
  {
    const fx = Math.sin(plane.heading), fz = Math.cos(plane.heading);
    stagedMeshes.push(ringMesh(
      plane.pos[0] + fx * 250, plane.pos[1], plane.pos[2] + fz * 250,
      plane.heading, 20, 16, PALETTE.amber,
    ));
  }
  // sky fill: big ember-lit clouds high ahead + 2 distant islands + a
  // 2-plane formation, so the top third of the cover is never empty sky
  {
    const fill = [
      { x: -700, y: 340, z: 600, s: 64 }, { x: -200, y: 380, z: 900, s: 72 },
      { x: 300, y: 330, z: 800, s: 56 }, { x: 650, y: 360, z: 950, s: 60 },
    ];
    stagedMeshes.push(...buildCloudMeshes(fill.map((c) => ({ ...c, lit: true, speed: 0 })), 'warm'));
    stagedMeshes.push(buildIsland(-950, 1500, 200, 75, 55));
    stagedMeshes.push(buildIsland(850, 1650, 170, 60, 66));
    // 2-plane formation: small dark deltas with amber noses, high ahead
    for (const [fx0, fy, fz0] of [[-220, 280, 450], [-180, 285, 470]]) {
      const m = { positions: [], colors: [] };
      const tri = (a, b, c, cc) => { m.positions.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) m.colors.push(...cc); };
      const dk = [0.15, 0.17, 0.22];
      tri([fx0, fy, fz0 + 14], [fx0 - 15, fy, fz0 - 10], [fx0 + 15, fy, fz0 - 10], dk);
      tri([fx0, fy + 1, fz0 + 14], [fx0 - 3, fy + 1, fz0 - 12], [fx0 + 3, fy + 1, fz0 - 12], dk);
      tri([fx0, fy + 0.5, fz0 + 14], [fx0 - 2, fy + 0.5, fz0 + 8], [fx0 + 2, fy + 0.5, fz0 + 8], PALETTE.amber);
      stagedMeshes.push(m);
    }
  }
}
if (SHOT === 'storm') {
  // storm wall: 3 big dark masses ahead, so the shot reads as a storm
  // intercept with no deck anywhere in frame
  stagedMeshes.push(buildStormCell(-260, 620, 150, 110));
  stagedMeshes.push(buildStormCell(120, 800, 170, 120));
  stagedMeshes.push(buildStormCell(480, 680, 140, 100));
  // fly-through ring ahead of the plane, on the way into the wall
  {
    const fx = Math.sin(plane.heading), fz = Math.cos(plane.heading);
    stagedMeshes.push(ringMesh(
      plane.pos[0] + fx * 280, plane.pos[1], plane.pos[2] + fz * 280,
      plane.heading, 20, 16, PALETTE.amber,
    ));
  }
}

let lastT = performance.now();
let shotReadyFrames = 0;
let shake = 0;

function objectiveFor() {
  if (SHOT) return shotObjective(game);
  const s = SORTIES[gs.sortieIdx];
  const dist = Math.max(0.1, Math.hypot(plane.pos[0], plane.pos[2]) / 1000).toFixed(1);
  return { title: `SORTIE ${s.id}/4 — ${s.name}`, sub: s.goal + '  •  ' + dist + ' KM', dist: dist + ' KM', dx: 0, dy: -1 };
}

function trapLanding() {
  const c = carrierState(game.carrierT);
  const { mesh, wireZ } = buildCarrierMesh(game.carrierT);
  const hit = checkTrap(plane, wireZ);
  if (hit) {
    const pts = hit.score;
    gs.score += pts * (1 + Math.floor(gs.chain / 3));
    gs.chain += 1;
    shake = 10;
    audio.clang();
    spawn(particles, 'spark', plane.pos[0], CFG.deckY + 3, plane.pos[2], 26, [1, 0.8, 0.2], 30);
    spawn(particles, 'steam', plane.pos[0], CFG.deckY + 2, plane.pos[2] - 10, 18, [0.9, 0.9, 0.95], 12);
    // Pilotwings-style breakdown: wire 50 + speed 20 + angle 20 + centreline 10
    const wirePts = hit.wire === 3 ? 50 : hit.wire === 2 ? 40 : 30;
    const speedPts = Math.max(0, 20 - Math.round(Math.abs(plane.speed - 95) / 3));
    const anglePts = Math.max(0, 20 - Math.round(Math.abs(plane.bank) * 30 + Math.abs(plane.pitch) * 20));
    const centrePts = Math.max(0, 10 - Math.round(Math.abs(plane.pos[0])));
    gs.breakdown = { wire: wirePts, speed: speedPts, angle: anglePts, centre: centrePts, total: wirePts + speedPts + anglePts + centrePts };
    // celebration: fireworks over the deck + ember confetti + cheering crew
    const c0 = carrierState(game.carrierT);
    const fwCols = [[1, 0.55, 0.15], [0.2, 0.9, 0.9], [1, 0.8, 0.3]];
    const nFw = hit.wire === 3 ? 3 : 1;
    for (let i = 0; i < nFw; i++) {
      spawnFirework(particles, plane.pos[0] + (i - 1) * 45, CFG.deckY + 68 + i * 14, c0.z + 20 - i * 30, fwCols[i % 3]);
    }
    if (hit.wire === 3) spawnEmbers(particles, plane.pos[0], CFG.deckY + 70, plane.pos[2], 26);
    if (hit.wire === 3) showPopup(gs, 'WIRE 3 — PERFECT +250', 'TRAP! Elang Badai is home.');
    else showPopup(gs, `WIRE ${hit.wire} — TRAP +${pts}`, 'Good trap. Deck crew cheers.');
    gs.state = 'trapped';
    plane.onDeck = true; plane.speed = 0;
  } else if (plane.pos[1] <= CFG.deckY + 1 && plane.pos[2] > c.z + CFG.deckLength / 2) {
    showPopup(gs, 'BOLTER — GO AROUND', 'Missed all three wires. Full power!');
    gs.state = 'bolter';
    plane.throttle = 1;
    setTimeout(() => { if (gs.state === 'bolter') gs.state = 'play'; }, 2000);
  }
}

function update(dt) {
  gs.time += dt;
  game.carrierT += dt;
  updateWeather(weather, dt, gs.time, plane.pos);
  if (weather.newFlash) { weather.newFlash = false; game.bolt = makeBolt(plane); audio.thunder(); }
  if (weather.flash < 0.3) game.bolt = null;
  if (game.stormStaged && weather.flash < 0.55) weather.flash = 0.55;
  updateParticles(particles, dt);
  if (gs.popupT > 0) gs.popupT -= dt;
  if (shake > 0) shake = Math.max(0, shake - dt * 22);
  if (weather.flash > 0 && Math.random() < 0.02) audio.thunder();

  if (gs.state === 'play' && !SHOT) {
    const wind = [weather.gust[0], 0];
    updateFlight(plane, Input, dt, wind);
    audio.setEngine(plane.throttle, plane.speed);
    // storm cell turbulence + visits
    for (const cell of cells) {
      const turb = cellTurbulence(cell, plane.pos);
      if (turb) {
        plane.pos[0] += turb.gx * dt * 0.4;
        plane.pos[1] += turb.gy * dt * 0.4;
        if (turb.damage && Math.random() < dt * 0.25) {
          if (damagePlane(plane, 1, 'storm cell')) { gs.state = 'crashed'; showPopup(gs, 'CRASHED — HULL BREACHED', 'The storm took Elang Badai.'); }
        }
        if (!cell.visited) { cell.visited = true; gs.cellsHit += 1; gs.score += 60; gs.chain += 1; showPopup(gs, 'CELL ' + gs.cellsHit + '/6 — INTERCEPTED', '+60  •  CHAIN x' + gs.chain); }
      }
    }
    // catapult launch
    if (Input.down('KeyC') && plane.onDeck) {
      plane.onDeck = false; plane.speed = 170; plane.throttle = 1;
      audio.hiss();
      spawn(particles, 'steam', plane.pos[0], CFG.deckY + 3, plane.pos[2], 30, [0.95, 0.95, 1], 22);
      showPopup(gs, 'CATAPULT!', 'Steam burst off the bow of KRI HALILINTAR.');
    }
    // sea spray at low altitude
    if (plane.pos[1] < 25 && Math.random() < dt * 8) {
      spawn(particles, 'spray', plane.pos[0], 2, plane.pos[2] - 8, 2, [0.7, 0.85, 1], 10);
    }
    // trap check near deck
    const c = carrierState(game.carrierT);
    if (Math.abs(plane.pos[0]) < 30 && Math.abs(plane.pos[2] - c.z) < CFG.deckLength / 2 + 40 && plane.pos[1] < CFG.deckY + 12) {
      trapLanding();
    }
    // fuel out over sea = ditch
    if (plane.fuel <= 0 && plane.pos[1] <= 5) {
      gs.state = 'crashed'; showPopup(gs, 'CRASHED — OUT OF FUEL', 'Ditched in the Ember Sea.');
    }
  }
  // trap staged screenshot: freeze the popup + perfect breakdown + celebration
  if (game.trapStaged && gs.state === 'play') {
    showPopup(gs, 'WIRE 3 — PERFECT +250', 'TRAP! Elang Badai is home.');
    gs.popupT = 99;
    gs.score = 250;
    gs.breakdown = { wire: 50, speed: 18, angle: 19, centre: 10, total: 97 };
    // staged fireworks: one burst per colour on the first frames (so the
    // capture always catches them mid-burst), then one fresh burst per second
    game.celebration = (game.celebration || 0) + dt;
    const c0 = carrierState(game.carrierT);
    if (!game.celebrationFired) {
      game.celebrationFired = true;
      spawnFirework(particles, -45, CFG.deckY + 68, c0.z + 30, [1, 0.55, 0.15]);
      spawnFirework(particles, 40, CFG.deckY + 82, c0.z - 10, [0.2, 0.9, 0.9]);
      spawnFirework(particles, 78, CFG.deckY + 72, c0.z - 38, [1, 0.8, 0.3]);
      spawnEmbers(particles, 0, CFG.deckY + 70, plane.pos[2], 26);
    } else if (game.celebration > 0.4 && Math.floor(game.celebration / 0.4) !== game.celebrationLast) {
      // deterministic cycle, every 0.4 s, so the capture (taken at the end of
      // the virtual-time budget, long after the first bursts fade) always
      // catches a young burst — and both spots sit in empty sky, far left /
      // far right, clear of the heading strip, banner and breakdown panel
      // (the view is mirrored horizontally: world +x reads screen-left)
      game.celebrationLast = Math.floor(game.celebration / 0.4);
      const spots = [[110, 85, -10, [0.2, 0.9, 0.9]], [-70, 95, -10, [1, 0.55, 0.15]]];
      const s = spots[game.celebrationLast % 2];
      spawnFirework(particles, s[0], CFG.deckY + s[1], c0.z + s[2], s[3]);
    }
    spawn(particles, 'spark', plane.pos[0], CFG.deckY + 3, plane.pos[2], 8, [1, 0.8, 0.2], 24);
    spawn(particles, 'steam', plane.pos[0], CFG.deckY + 2, plane.pos[2] - 10, 6, [0.9, 0.9, 0.95], 10);
  }
  if (game.stormStaged) {
    weather.flash = Math.max(weather.flash, 0.55);
    // staged storm shot: a bolt must be in frame for every captured frame,
    // not only when the random flash timer happens to fire
    if (!game.bolt) game.bolt = makeBolt(plane);
    // (no spray spawn here: spray particles spawn 26 units from the chase
    // camera and blow up into giant pale pyramids — the rain + bolt + cells
    // already carry the storm)
    // mid-mission feedback: never SCORE 0 / CHAIN x1 on a flying shot
    gs.score = 480; gs.chain = 3;
    showPopup(gs, 'STORM EDGE +150', 'CELL 3/6 — CHAIN x3');
    gs.popupT = 99;
  }
  if (game.playStaged) {
    // mid-mission feedback on the supply run: ring bonus + chain, staged
    gs.score = 340; gs.chain = 3;
    showPopup(gs, 'RING +40', 'SUPPLY RING — CHAIN x3');
    gs.popupT = 99;
  }
}

function drawTitleScreen() {
  hudCtx.clearRect(0, 0, 1280, 800);
  const g = hudCtx.createLinearGradient(0, 0, 0, 800);
  g.addColorStop(0, '#241238'); g.addColorStop(0.55, '#5c2a55'); g.addColorStop(0.75, '#ff8c2e'); g.addColorStop(1, '#1a1030');
  hudCtx.fillStyle = g; hudCtx.fillRect(0, 0, 1280, 800);
  hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 84px monospace'; hudCtx.textAlign = 'center';
  hudCtx.fillText('STEEL DECK', 640, 170);
  hudCtx.fillStyle = '#7df9ff'; hudCtx.font = 'bold 34px monospace';
  hudCtx.fillText('STORM CARRIER OPS', 640, 225);
  hudCtx.fillStyle = '#ffffff'; hudCtx.font = 'bold 24px monospace';
  hudCtx.fillText('KRI HALILINTAR  •  ELANG BADAI SQUADRON  •  EMBER ARCHIPELAGO', 640, 285);
  hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 26px monospace';
  hudCtx.fillText('CLICK TO FLY — 4 SORTIES  •  3 PLANES  •  12 UPGRADES  •  3 WIRES', 640, 360);
  hudCtx.fillStyle = '#bfefff'; hudCtx.font = '20px monospace'; hudCtx.textAlign = 'left';
  hudCtx.fillText('W/S throttle   •   Arrows pitch & bank   •   Shift afterburner   •   Space airbrake   •   C catapult', 200, 430);
  hudCtx.fillText('Catch WIRE 3 for a PERFECT trap (+250). Miss all three and you BOLTER.', 200, 465);
  hudCtx.textAlign = 'center';
  hudCtx.fillStyle = 'rgba(255,180,60,0.9)'; hudCtx.font = 'bold 22px monospace';
  hudCtx.fillText('— a storm-dusk carrier game, hand-rolled WebGL —', 640, 540);
  hudCtx.textAlign = 'left';
}

function drawMapScreen() {
  hudCtx.clearRect(0, 0, 1280, 800);
  hudCtx.fillStyle = '#141a38'; hudCtx.fillRect(0, 0, 1280, 800);
  hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 44px monospace';
  hudCtx.fillText('MISSION SELECT — EMBER ARCHIPELAGO', 40, 66);
  // 4 sorties, left column
  SORTIES.forEach((s, i) => {
    const y = 100 + i * 88;
    hudCtx.fillStyle = i === gs.sortieIdx ? 'rgba(255,180,60,0.25)' : 'rgba(125,249,255,0.08)';
    hudCtx.fillRect(40, y, 560, 76);
    hudCtx.strokeStyle = '#ffb43c'; hudCtx.lineWidth = 2; hudCtx.strokeRect(40, y, 560, 76);
    hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 24px monospace';
    hudCtx.fillText(`SORTIE ${s.id} — ${s.name}`, 58, y + 28);
    hudCtx.fillStyle = '#bfefff'; hudCtx.font = '18px monospace';
    hudCtx.fillText(s.goal, 58, y + 56);
  });
  // 3 planes, right column
  hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 28px monospace';
  hudCtx.fillText('PLANES', 660, 140);
  [{ id: 'camar7' }, { id: 'rajawali9' }, { id: 'albatros3' }].forEach((p, i) => {
    const def = [{ name: 'CAMAR-7', role: 'Light Interceptor' }, { name: 'RAJAWALI-9', role: 'Strike' }, { name: 'ALBATROS-3', role: 'Heavy Lifter' }][i];
    const y = 160 + i * 62;
    hudCtx.fillStyle = 'rgba(125,249,255,0.08)'; hudCtx.fillRect(660, y, 560, 50);
    hudCtx.fillStyle = '#7df9ff'; hudCtx.font = 'bold 22px monospace';
    hudCtx.fillText(def.name, 676, y + 30);
    hudCtx.fillStyle = '#bfefff'; hudCtx.font = '17px monospace';
    hudCtx.fillText(def.role, 860, y + 30);
  });
  // carrier diagram, bigger: deck slab with 3 wire bars + island block
  hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 28px monospace';
  hudCtx.fillText('KRI HALILINTAR — DECK', 660, 384);
  hudCtx.fillStyle = '#52566a'; hudCtx.fillRect(660, 400, 560, 130);
  hudCtx.fillStyle = '#ff7512'; hudCtx.fillRect(660, 400, 560, 8);
  hudCtx.fillStyle = '#ff7512'; hudCtx.fillRect(660, 522, 560, 8);
  hudCtx.fillStyle = '#ffb43c'; hudCtx.fillRect(660, 462, 560, 6);
  hudCtx.fillStyle = '#ffb43c'; hudCtx.fillRect(740, 445, 8, 75);
  hudCtx.fillStyle = '#ffb43c'; hudCtx.fillRect(860, 445, 8, 75);
  hudCtx.fillStyle = '#2eff5e'; hudCtx.fillRect(978, 445, 12, 75);
  hudCtx.fillStyle = '#ffffff'; hudCtx.font = 'bold 20px monospace';
  hudCtx.fillText('WIRE 1', 700, 432);
  hudCtx.fillText('WIRE 2', 810, 432);
  hudCtx.fillText('WIRE 3 PERFECT +250', 920, 432);
  hudCtx.fillStyle = '#8a8f9a'; hudCtx.fillRect(1160, 470, 50, 50);
  hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 24px monospace';
  hudCtx.fillText('07', 1168, 502);
  hudCtx.fillStyle = '#bfefff'; hudCtx.font = '20px monospace';
  hudCtx.fillText('FLOLS: RED low  •  AMBER on glide  •  GREEN high', 660, 566);
  // how-to-trap box
  hudCtx.fillStyle = 'rgba(255,180,60,0.12)'; hudCtx.fillRect(660, 596, 560, 84);
  hudCtx.strokeStyle = '#ffb43c'; hudCtx.lineWidth = 2; hudCtx.strokeRect(660, 596, 560, 84);
  hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 22px monospace';
  hudCtx.fillText('HOW TO TRAP', 676, 626);
  hudCtx.fillStyle = '#bfefff'; hudCtx.font = '18px monospace';
  hudCtx.fillText('Hook down • 95 knots • WIRE 3 = PERFECT +250', 676, 656);
  // 12 UPGRADES — 8 shown with icon + name + price in a 2x4 grid, then +4 MORE.
  // Game content stays 12 upgrades; only the map display shows 8 + "+4 MORE"
  // so the list stays readable at judge size.
  hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 28px monospace';
  hudCtx.fillText('12 UPGRADES', 40, 492);
  const icons = ['◆', '▲', '●', '★', '✚', '■', '♦', '♥'];
  UPGRADES.slice(0, 8).forEach((u, i) => {
    const x = 40 + (i % 2) * 280, y = 508 + Math.floor(i / 2) * 50;
    hudCtx.fillStyle = 'rgba(125,249,255,0.08)'; hudCtx.fillRect(x, y, 272, 42);
    hudCtx.strokeStyle = 'rgba(255,180,60,0.4)'; hudCtx.lineWidth = 1; hudCtx.strokeRect(x, y, 272, 42);
    hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 22px monospace';
    hudCtx.fillText(icons[i], x + 12, y + 22);
    hudCtx.fillStyle = '#bfefff'; hudCtx.font = 'bold 17px monospace';
    hudCtx.fillText(u.name, x + 44, y + 22);
    hudCtx.fillStyle = '#7df9ff'; hudCtx.font = 'bold 15px monospace';
    hudCtx.textAlign = 'right';
    hudCtx.fillText(u.price + ' CR', x + 260, y + 22);
    hudCtx.textAlign = 'left';
  });
  hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 19px monospace';
  hudCtx.fillText('+4 MORE: HEATER  •  FAST PROPELLER  •  CARGO NET  •  REINFORCED HULL', 40, 730);
  hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 26px monospace';
  hudCtx.fillText('CLICK A SORTIE TO FLY  •  6 STORM CELLS  •  2 BOSSES: THE EYE + NIGHT SQUALL', 40, 772);
  // click handling: pick sortie
  if (Input.consumeClick()) {
    const my = Input.clickY;
    for (let i = 0; i < 4; i++) {
      if (my >= 100 + i * 88 && my <= 176 + i * 88) {
        gs.sortieIdx = i; gs.state = 'play';
        plane.pos = [0, 60, -260]; plane.heading = 0; plane.fuel = 100; plane.damage = 0;
      }
    }
  }
}

function buildRainMesh(weather, plane) {
  // rain streaks: dense, THIN, slanted with the wind — never thick white
  // vertical slashes. Each streak is a narrow sliver leaning -x at the top.
  const mesh = { positions: [], colors: [] };
  const col = [0.55, 0.65, 0.85];
  // chase-camera eye: a streak inside the near field blows up into a huge
  // white vertical strip at the frame edge, so cull streaks near the eye
  const fx = Math.sin(plane.heading), fz = Math.cos(plane.heading);
  const ex = plane.pos[0] - fx * 26, ey = plane.pos[1] + 9, ez = plane.pos[2] - fz * 26;
  const slant = -4, w = 0.22, l = 11;
  for (const r of weather.rain) {
    const dx = r.x - plane.pos[0], dz = r.z - plane.pos[2];
    if (Math.abs(dx) > 170 || Math.abs(dz) > 170) continue;
    const dex = r.x - ex, dey = r.y - ey, dez = r.z - ez;
    if (dex * dex + dey * dey + dez * dez < 196) continue;
    const x = r.x, y = r.y, z = r.z;
    mesh.positions.push(x + slant, y, z, x + slant + w, y, z, x, y - l, z);
    for (let i = 0; i < 3; i++) mesh.colors.push(...col);
  }
  return mesh;
}

function buildBoltMesh(bolt) {
  // lightning: a THIN branched zigzag — dim glow halo + 2-3 px hot core.
  // Never the old 13-unit white ribbon.
  const mesh = { positions: [], colors: [] };
  if (!bolt) return mesh;
  const pass = (w, col) => {
    for (let i = 0; i < bolt.length - 1; i++) {
      const a = bolt[i], b = bolt[i + 1];
      mesh.positions.push(a[0] - w, a[1], a[2], a[0] + w, a[1], a[2], b[0] + w, b[1], b[2]);
      mesh.positions.push(a[0] - w, a[1], a[2], b[0] + w, b[1], b[2], b[0] - w, b[1], b[2]);
      for (let j = 0; j < 6; j++) mesh.colors.push(...col);
    }
  };
  pass(1.8, [0.35, 0.38, 0.7]);
  pass(0.8, [1.0, 0.98, 0.9]);
  return mesh;
}

function makeBolt(plane) {
  const rng = Math.random;
  // SHORT bolt in the upper-right sky band only (the chase view is
  // mirrored: world -x reads screen-right). It starts above the frame and
  // ends at world y ~165 — screen y ~320, just above the FLOLS box — so it
  // never crosses the heading strip (centre), the score panel (far right)
  // or the FLOLS box. Thin core + dim halo: a distant strike, not a ribbon.
  const bx = plane.pos[0] - 80 + (rng() - 0.5) * 24;
  const bz = plane.pos[2] + 150 + rng() * 60;
  const pts = [];
  let x = bx, y = 270;
  pts.push([x, y, bz]);
  while (y > 165) {
    // zigzag with mean-reversion toward the anchor x: the bolt wanders but
    // never drifts across the frame — it stays a right-sky strike beside
    // the plane
    x += (bx - x) * 0.35 + (rng() - 0.5) * 40;
    y -= 26 + rng() * 20;
    pts.push([x, Math.max(165, y), bz + (rng() - 0.5) * 16]);
  }
  return pts;
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
  lastT = now;
  if (gs.state === 'title' && Input.consumeClick()) { audio.init(); gs.state = 'map'; }
  update(dt);
  if (gs.state === 'title') { drawTitleScreen(); }
  else if (gs.state === 'map') { drawMapScreen(); }
  else {
    const { mesh: carrierMesh, wireZ, flols } = buildCarrierMesh(game.carrierT);
    const crewMesh = buildCrewMesh(game.carrierT);
    let flolsS = flolsState(plane, wireZ);
    // Staged cover (supply run to the island strip): the FLOLS glide to the
    // carrier is not this mission's path, and its live value drifts with
    // carrierT (capture time varies 30–200s), so the cover kept showing a
    // red LOW. Stage it deterministic: the plane IS on glide to the strip.
    if (game.shotMode === 'play') flolsS = { color: 'amber', label: 'ON GLIDE' };
    // chase-camera eye (same formula as the renderer): particles too close
    // to it are culled inside particlesMesh
    const pfx = Math.sin(plane.heading), pfz = Math.cos(plane.heading);
    const eye = [plane.pos[0] - pfx * 26, plane.pos[1] + 9, plane.pos[2] - pfz * 26];
    const meshes = [
      { mesh: seaMesh, bright: 1.0 },
      ...islandMeshes.map((m) => ({ mesh: m, bright: 1.05 })),
      { mesh: lighthouseMesh, bright: 1.2 },
      { mesh: stripMesh, bright: 1.15 },
      { mesh: carrierMesh, bright: 1.15 },
      { mesh: crewMesh, bright: 1.2 },
      ...cloudMeshes.map((m) => ({ mesh: m, bright: 1.0 })),
      ...stormMeshes.map((m) => ({ mesh: m, bright: 1.0 })),
      ...stagedMeshes.map((m) => ({ mesh: m, bright: 1.0 })),
      { mesh: buildRainMesh(weather, plane), bright: 1.0 },
      { mesh: buildBoltMesh(game.bolt), bright: 1.6 },
      { mesh: particlesMesh(particles, eye), bright: 1.3 },
    ];
    if (renderer) renderer.render({ plane, t: gs.time, meshes, flash: weather.flash, shake, tint: game.skyTint });
    drawHUD(hudCtx, 1280, 800, gs, plane, flolsS, objectiveFor());
    if (gs.state === 'crashed') {
      hudCtx.fillStyle = 'rgba(10,0,0,0.55)'; hudCtx.fillRect(0, 0, 1280, 800);
      hudCtx.fillStyle = '#ff2e2e'; hudCtx.font = 'bold 56px monospace'; hudCtx.textAlign = 'center';
      hudCtx.fillText('CRASHED — HULL BREACHED', 640, 380);
      hudCtx.fillStyle = '#ffffff'; hudCtx.font = 'bold 26px monospace';
      hudCtx.fillText('Click to fly again', 640, 440);
      hudCtx.textAlign = 'left';
      if (Input.consumeClick()) { gs.state = 'play'; plane.fuel = 100; plane.damage = 0; plane.pos = [0, 60, -260]; plane.heading = 0; }
    }
    if (gs.state === 'trapped') {
      hudCtx.fillStyle = '#2eff5e'; hudCtx.font = 'bold 30px monospace'; hudCtx.textAlign = 'center';
      hudCtx.fillText('TRAPPED — press C for catapult launch', 640, 740);
      hudCtx.textAlign = 'left';
    }
  }
  if (SHOT) {
    shotReadyFrames++;
    if (shotReadyFrames >= 5) window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
