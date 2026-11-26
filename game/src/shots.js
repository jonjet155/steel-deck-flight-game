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
    plane.pos = [0, 58, -260];
    plane.heading = 0; plane.pitch = 0.02; plane.bank = 0.18;
    plane.speed = 165; plane.throttle = 0.7; plane.fuel = 78;
    game.carrierT = 0;
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
    // restaged fix round: wings near-level (slight bank only) so the chase camera
    // reads fuselage + tail + wings as one plane; heading ~0 keeps the bolt
    // centre-frame. Nearest cells sit 400+ out, spread left/centre/right with
    // sky gaps between them instead of one wall filling the frame.
    plane.pos = [60, 110, 0];
    plane.heading = -0.12; plane.pitch = 0.02; plane.bank = -0.08;
    plane.speed = 190; plane.throttle = 0.85; plane.fuel = 64; plane.afterburner = true;
    game.weather.flash = 0.9;
    game.stormStaged = true;
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
