// config.js — all tuning numbers + storm-dusk palette for STEEL DECK.
export const CFG = {
  canvasW: 1280,
  canvasH: 800,
  gravity: 9.8,
  maxSpeed: 320,        // knots-ish units
  cruiseSpeed: 150,
  minFlySpeed: 55,
  afterburnerBoost: 1.7,
  fuelMax: 100,
  fuelBurnCruise: 0.55, // per second
  fuelBurnAB: 2.6,
  fuelBurnIdle: 0.18,
  pitchRate: 0.9,
  bankRate: 1.6,
  rollReturn: 1.2,
  turnFromBank: 0.55,
  damageMax: 3,
  stormCells: 6,
  wireScores: [100, 150, 250], // wire 1, 2, 3
  seaSize: 2600,
  carrierSpeed: 14,
  deckLength: 260,
  deckWidth: 58,
  deckY: 18,
};

export const PALETTE = {
  skyTop: [0.16, 0.10, 0.38],
  skyMid: [0.45, 0.22, 0.45],
  sunset: [1.0, 0.55, 0.18],
  sunsetSoft: [1.0, 0.72, 0.38],
  seaDeep: [0.05, 0.13, 0.30],
  seaLight: [0.12, 0.30, 0.48],
  deckGrey: [0.32, 0.34, 0.38],
  deckDark: [0.20, 0.21, 0.25],
  deckLine: [1.0, 0.75, 0.20],
  amber: [1.0, 0.72, 0.15],
  cyan: [0.25, 0.95, 1.0],
  white: [1.0, 1.0, 1.0],
  planeGrey: [0.72, 0.75, 0.80],
  planeDark: [0.30, 0.33, 0.38],
  islandGreen: [0.14, 0.32, 0.18],
  islandRock: [0.35, 0.30, 0.28],
  cloudDark: [0.30, 0.24, 0.42],
  cloudLit: [1.0, 0.62, 0.30],
  red: [1.0, 0.15, 0.15],
  green: [0.15, 1.0, 0.35],
};

export const PLANES = [
  { id: 'camar7', name: 'CAMAR-7', role: 'Light Interceptor', speed: 1.15, fuel: 0.85, handling: 1.25, color: [0.75, 0.78, 0.82] },
  { id: 'rajawali9', name: 'RAJAWALI-9', role: 'Strike', speed: 1.0, fuel: 1.0, handling: 1.0, color: [0.55, 0.60, 0.68] },
  { id: 'albatros3', name: 'ALBATROS-3', role: 'Heavy Lifter', speed: 0.85, fuel: 1.35, handling: 0.8, color: [0.85, 0.72, 0.45] },
];

export const UPGRADES = [
  { id: 'hook', name: 'Arrestor Hook', desc: '+1 wire catch window' },
  { id: 'catapult', name: 'Catapult Bridle', desc: 'Faster deck launch' },
  { id: 'tank', name: 'Bigger Tank', desc: '+30 fuel capacity' },
  { id: 'radar', name: 'Storm Radar', desc: 'See cells on HUD' },
  { id: 'lights', name: 'Landing Lights', desc: 'Deck glows brighter' },
  { id: 'gear', name: 'Reinforced Gear', desc: 'Survive hard landings' },
  { id: 'goggles', name: 'Night Goggles', desc: 'Night patrol vision' },
  { id: 'radio', name: 'Ship Radio', desc: 'LSO calls out glide' },
  { id: 'heater', name: 'Cockpit Heater', desc: 'No icing in squall' },
  { id: 'prop', name: 'Fast Propeller', desc: '+10% climb rate' },
  { id: 'net', name: 'Cargo Net', desc: 'Carry +1 cargo' },
  { id: 'hull', name: 'Reinforced Hull', desc: '+1 hull heart' },
];
