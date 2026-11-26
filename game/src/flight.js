// flight.js — plane physics: throttle, pitch, bank, AoA, fuel burn, damage.
import { CFG } from './config.js';
import { clamp } from './math3d.js';

export function makePlane(planeDef) {
  return {
    def: planeDef,
    pos: [0, 60, -260],      // x, y (alt m), z — starts behind carrier, flying toward it
    heading: 0,              // radians, 0 = +z toward carrier
    pitch: 0,
    bank: 0,
    speed: 130,
    throttle: 0.65,
    fuel: CFG.fuelMax,
    damage: 0,
    aoa: 0,
    onDeck: false,
    hookDown: false,
    propAngle: 0,
    verticalSpeed: 0,
  };
}

export function updateFlight(p, input, dt, wind) {
  // throttle: W/Up raises, S/Down lowers (when not pitching via arrows — arrows pitch)
  if (input.down('KeyW')) p.throttle = clamp(p.throttle + dt * 0.5, 0, 1);
  if (input.down('KeyS') && !input.down('ArrowDown')) p.throttle = clamp(p.throttle - dt * 0.5, 0, 1);
  const ab = input.down('ShiftLeft', 'ShiftRight');
  const brake = input.down('Space');

  const targetSpeed = CFG.cruiseSpeed * p.def.speed * (0.25 + p.throttle * 0.9) * (ab ? CFG.afterburnerBoost : 1) * (brake ? 0.55 : 1);
  p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 0.8);

  // pitch: Up arrow / W handled above; arrows pitch
  let pitchIn = 0;
  if (input.down('ArrowUp')) pitchIn += 1;
  if (input.down('ArrowDown')) pitchIn -= 1;
  const handling = p.def.handling;
  p.pitch = clamp(p.pitch + pitchIn * CFG.pitchRate * handling * dt, -0.6, 0.6);
  if (pitchIn === 0) p.pitch *= Math.max(0, 1 - dt * 0.8);

  // bank
  let bankIn = 0;
  if (input.down('ArrowLeft', 'KeyA')) bankIn -= 1;
  if (input.down('ArrowRight', 'KeyD')) bankIn += 1;
  p.bank = clamp(p.bank + bankIn * CFG.bankRate * handling * dt, -1.1, 1.1);
  if (bankIn === 0) p.bank *= Math.max(0, 1 - dt * CFG.rollReturn);

  // turn from bank, climb from pitch
  p.heading += -p.bank * CFG.turnFromBank * dt * (p.speed / 150);
  p.verticalSpeed = Math.sin(p.pitch) * p.speed * 0.9;
  const fwdX = Math.sin(p.heading), fwdZ = Math.cos(p.heading);
  p.pos[0] += fwdX * p.speed * dt * 0.55 + (wind ? wind[0] * dt : 0);
  p.pos[2] += fwdZ * p.speed * dt * 0.55;
  p.pos[1] += p.verticalSpeed * dt * 0.55;
  if (p.pos[1] < 4) { p.pos[1] = 4; if (p.verticalSpeed < -6) p.damage += 1; p.verticalSpeed = 0; }
  if (p.pos[1] > 420) { p.pos[1] = 420; p.pitch = Math.min(p.pitch, 0); }

  p.aoa = clamp(p.pitch * 2.2 + (CFG.cruiseSpeed - p.speed) * 0.004, -0.2, 0.5);

  // fuel
  let burn = CFG.fuelBurnCruise * (0.3 + p.throttle);
  if (ab) burn = CFG.fuelBurnAB;
  if (brake) burn *= 0.6;
  p.fuel = Math.max(0, p.fuel - burn * p.def.fuel * dt);
  if (p.fuel <= 0) { p.throttle = 0; p.speed = Math.max(p.speed - dt * 8, CFG.minFlySpeed * 0.5); }

  p.propAngle += dt * (6 + p.throttle * 26);
  p.afterburner = ab;
  p.airbrake = brake;
  return p;
}

export function damagePlane(p, amount, reason) {
  p.damage = Math.min(CFG.damageMax, p.damage + amount);
  p.lastHit = reason;
  return p.damage >= CFG.damageMax;
}
