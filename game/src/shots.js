// shots.js — autopilot staging for screenshots. Reads ?shot= from the URL.
// start = mission select, play = mid-flight chase view, trap = trap moment, storm = storm intercept.
// Sets window.__shotReady = true once the scene is staged and rendered.
export function applyShot(game, params) {
  const shot = params.get('shot');
  if (!shot) return null;
  const { gs, plane, cells } = game;
  if (shot === 'start') {
    gs.state = 'map';
  } else if (shot === 'play') {
    gs.state = 'play';
    gs.sortieIdx = 1; // SUPPLY RUN
    // restaged 6.2: a FAR approach, not a carrier chase — the island strip
    // sits ahead-centre, the carrier is a small ship far right-of-centre,
    // sea tinted teal-green, sky warm dusk. The strip island is 1.2 KM out.
    plane.pos = [150, 76, -500];
    plane.heading = -0.45; plane.pitch = 0.02; plane.bank = 0.12;
    plane.speed = 165; plane.throttle = 0.7; plane.fuel = 78;
    game.carrierT = 0;
    game.playStaged = true;
    game.skyTint = { top: [0.06, 0.28, 0.36], mid: [0.55, 0.30, 0.40], sun: [1.0, 0.52, 0.10] };
    game.seaTint = { deep: [0.03, 0.26, 0.24], light: [0.10, 0.44, 0.38] };
    game.cloudMode = 'warm';
  } else if (shot === 'trap') {
    gs.state = 'play';
    gs.sortieIdx = 3; // TRAP FINALE
    // staged on final approach: 150 out, 48 m up — carrier deck + FLOLS + superstructure all in frame,
    // plane large in the foreground, no near-field clutter between camera and plane
    plane.pos = [0, 48, -150];
    plane.heading = 0; plane.pitch = -0.05; plane.bank = 0.05;
    plane.speed = 95; plane.throttle = 0.45; plane.fuel = 41; plane.hookDown = true;
    game.carrierT = 0;
    game.trapStaged = true;
    game.trapWire = 3;
  } else if (shot === 'storm') {
    gs.state = 'play';
    gs.sortieIdx = 0; // STORM INTERCEPT
    // restaged 6.2: the carrier is BEHIND the plane (never in frame) —
    // ahead is only rings + the storm wall. Dark slate sea, storm-dark sky
    // with ember-lit cloud rims. Wings near-level so the chase camera reads
    // fuselage + tail + wings as one built plane.
    plane.pos = [60, 110, 300];
    plane.heading = -0.12; plane.pitch = 0.02; plane.bank = -0.08;
    plane.speed = 190; plane.throttle = 0.85; plane.fuel = 64; plane.afterburner = true;
    game.weather.flash = 0.9;
    game.stormStaged = true;
    game.skyTint = { top: [0.02, 0.08, 0.18], mid: [0.16, 0.14, 0.32], sun: [0.8, 0.32, 0.10] };
    game.seaTint = { deep: [0.02, 0.10, 0.18], light: [0.05, 0.20, 0.28] };
    game.cloudMode = 'storm';
  }
  game.shotMode = shot;
  return shot;
}

export function shotObjective(game) {
  const shot = game.shotMode;
  if (shot === 'trap') return { title: 'SORTIE 4/4 — TRAP FINALE', sub: 'CATCH WIRE 3 — PERFECT', dist: '0.1 KM', dx: 0, dy: -1 };
  if (shot === 'storm') return { title: 'SORTIE 1/4 — STORM INTERCEPT', sub: 'CELL 3/6 — THREAD THE STORM', dist: '0.4 KM', dx: 0.5, dy: -1 };
  return { title: 'SORTIE 2/4 — SUPPLY RUN', sub: 'ISLAND STRIP 1.2 KM', dist: '1.2 KM', dx: 0, dy: -1 };
}
