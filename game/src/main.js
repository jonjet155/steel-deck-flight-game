// main.js — game loop, states: title / map / play / trapped / bolter / crashed.
import { CFG, PALETTE, PLANES } from './config.js';
import { Input } from './input.js';
import { makePlane, updateFlight, damagePlane } from './flight.js';
import { buildSea, buildIsland, buildLighthouse, buildStrip, ISLANDS, STRIP, LIGHTHOUSE } from './terrain.js';
import { buildCarrierMesh, buildCrewMesh, carrierState, flolsState, checkTrap } from './carrier.js';
import { SORTIES, makeStormCells, BOSSES, makeGameState } from './missions.js';
import { makeWeather, updateWeather, cellTurbulence } from './weather.js';
import { makeParticles, spawn, updateParticles, particlesMesh, showPopup } from './particles.js';
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
const seaMesh = buildSea(CFG.seaSize, 24);
const islandMeshes = ISLANDS.map((is) => buildIsland(is.x, is.z, is.r, is.h, is.seed));
const lighthouseMesh = buildLighthouse(LIGHTHOUSE.x, LIGHTHOUSE.z);
const stripMesh = buildStrip(STRIP.x, STRIP.z, STRIP.heading);
const cloudMeshes = weather.clouds.map((c) => {
  const s = c.s;
  const mesh = { positions: [], colors: [] };
  const col = c.lit ? PALETTE.cloudLit : PALETTE.cloudDark;
  const tri = (a, b, d, cc) => { mesh.positions.push(...a, ...b, ...d); for (let i = 0; i < 3; i++) mesh.colors.push(...cc); };
  // puffy low-poly cloud: two stacked boxes as triangles
  const x = c.x, y = c.y, z = c.z;
  tri([x - s, y, z - s * 0.5], [x + s, y, z - s * 0.5], [x, y + s * 0.5, z], col);
  tri([x - s, y, z + s * 0.5], [x, y + s * 0.5, z], [x + s, y, z + s * 0.5], col);
  tri([x - s * 0.6, y + s * 0.4, z], [x + s * 0.6, y + s * 0.4, z], [x, y + s, z], col);
  return mesh;
});
const stormMeshes = cells.map((cell) => {
  const mesh = { positions: [], colors: [] };
  const tri = (a, b, d, cc) => { mesh.positions.push(...a, ...b, ...d); for (let i = 0; i < 3; i++) mesh.colors.push(...cc); };
  const { x, z, r } = cell;
  const dark = [0.22, 0.16, 0.38], lit = [0.95, 0.55, 0.25];
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2;
    const p0 = [x + Math.cos(a0) * r, cell.y, z + Math.sin(a0) * r];
    const p1 = [x + Math.cos(a1) * r, cell.y, z + Math.sin(a1) * r];
    tri(p0, p1, [x, cell.y + r * 0.9, z], i % 2 ? lit : dark);
    tri(p0, [x, cell.y - 20, z], p1, dark);
  }
  return mesh;
});

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
  // trap staged screenshot: freeze the popup
  if (game.trapStaged && gs.state === 'play') {
    showPopup(gs, 'WIRE 3 — PERFECT +250', 'TRAP! Elang Badai is home.');
    gs.popupT = 99;
    gs.score = 250;
    spawn(particles, 'spark', plane.pos[0], CFG.deckY + 3, plane.pos[2], 8, [1, 0.8, 0.2], 24);
    spawn(particles, 'steam', plane.pos[0], CFG.deckY + 2, plane.pos[2] - 10, 6, [0.9, 0.9, 0.95], 10);
  }
  if (game.stormStaged) {
    weather.flash = Math.max(weather.flash, 0.55);
    if (Math.random() < dt * 3) spawn(particles, 'spray', plane.pos[0] - 10, plane.pos[1] - 4, plane.pos[2], 2, [0.7, 0.85, 1], 14);
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
  hudCtx.fillText('MISSION SELECT — EMBER ARCHIPELAGO', 40, 70);
  // 4 sorties
  SORTIES.forEach((s, i) => {
    const y = 120 + i * 92;
    hudCtx.fillStyle = i === gs.sortieIdx ? 'rgba(255,180,60,0.25)' : 'rgba(125,249,255,0.08)';
    hudCtx.fillRect(40, y, 560, 78);
    hudCtx.strokeStyle = '#ffb43c'; hudCtx.lineWidth = 2; hudCtx.strokeRect(40, y, 560, 78);
    hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 24px monospace';
    hudCtx.fillText(`SORTIE ${s.id} — ${s.name}`, 58, y + 30);
    hudCtx.fillStyle = '#bfefff'; hudCtx.font = '19px monospace';
    hudCtx.fillText(s.goal, 58, y + 58);
  });
  // 3 planes
  hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 28px monospace';
  hudCtx.fillText('PLANES', 660, 140);
  [{ id: 'camar7' }, { id: 'rajawali9' }, { id: 'albatros3' }].forEach((p, i) => {
    const def = [{ name: 'CAMAR-7', role: 'Light Interceptor' }, { name: 'RAJAWALI-9', role: 'Strike' }, { name: 'ALBATROS-3', role: 'Heavy Lifter' }][i];
    const y = 160 + i * 62;
    hudCtx.fillStyle = 'rgba(125,249,255,0.08)'; hudCtx.fillRect(660, y, 300, 50);
    hudCtx.fillStyle = '#7df9ff'; hudCtx.font = 'bold 22px monospace';
    hudCtx.fillText(def.name, 676, y + 30);
    hudCtx.fillStyle = '#bfefff'; hudCtx.font = '17px monospace';
    hudCtx.fillText(def.role, 820, y + 30);
  });
  // carrier diagram
  hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 28px monospace';
  hudCtx.fillText('KRI HALILINTAR — DECK', 660, 380);
  hudCtx.fillStyle = '#52566a'; hudCtx.fillRect(660, 400, 560, 90);
  hudCtx.fillStyle = '#ffb43c'; hudCtx.fillRect(660, 438, 560, 6);
  hudCtx.fillStyle = '#2eff5e'; hudCtx.fillRect(900, 400, 10, 90);
  hudCtx.fillStyle = '#ffffff'; hudCtx.font = 'bold 18px monospace';
  hudCtx.fillText('WIRE 1', 700, 425); hudCtx.fillText('WIRE 2', 800, 425); hudCtx.fillText('WIRE 3 PERFECT +250', 920, 425);
  hudCtx.fillStyle = '#bfefff'; hudCtx.font = '19px monospace';
  hudCtx.fillText('FLOLS meatball: RED low  •  AMBER on glide  •  GREEN high', 660, 530);
  // 12 upgrades
  hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 28px monospace';
  hudCtx.fillText('12 UPGRADES', 40, 560);
  hudCtx.fillStyle = '#bfefff'; hudCtx.font = '18px monospace';
  const ups = ['Arrestor Hook', 'Catapult Bridle', 'Bigger Tank', 'Storm Radar', 'Landing Lights', 'Reinforced Gear', 'Night Goggles', 'Ship Radio', 'Heater', 'Fast Propeller', 'Cargo Net', 'Reinforced Hull'];
  ups.forEach((u, i) => {
    const x = 40 + (i % 4) * 300, y = 590 + Math.floor(i / 4) * 34;
    hudCtx.fillText('▸ ' + u, x, y);
  });
  hudCtx.fillStyle = '#ffb43c'; hudCtx.font = 'bold 24px monospace';
  hudCtx.fillText('CLICK A SORTIE TO FLY  •  6 STORM CELLS  •  2 BOSSES: THE EYE + NIGHT SQUALL', 40, 740);
  // click handling: pick sortie
  if (Input.consumeClick()) {
    const my = Input.clickY;
    for (let i = 0; i < 4; i++) {
      if (my >= 120 + i * 92 && my <= 198 + i * 92) {
        gs.sortieIdx = i; gs.state = 'play';
        plane.pos = [0, 60, -260]; plane.heading = 0; plane.fuel = 100; plane.damage = 0;
      }
    }
  }
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
    const flolsS = flolsState(plane, wireZ);
    const meshes = [
      { mesh: seaMesh, bright: 1.0 },
      ...islandMeshes.map((m) => ({ mesh: m, bright: 1.05 })),
      { mesh: lighthouseMesh, bright: 1.2 },
      { mesh: stripMesh, bright: 1.15 },
      { mesh: carrierMesh, bright: 1.15 },
      { mesh: crewMesh, bright: 1.2 },
      ...cloudMeshes.map((m) => ({ mesh: m, bright: 1.0 })),
      ...stormMeshes.map((m) => ({ mesh: m, bright: 1.0 })),
      { mesh: particlesMesh(particles), bright: 1.3 },
    ];
    if (renderer) renderer.render({ plane, t: gs.time, meshes, flash: weather.flash, shake });
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
