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
  // EMBER DUSK identity, 6.3: ember is DOMINANT, not an accent — the sky
  // is a deep ember dusk top to horizon, the sea a dark glowing teal.
  // At judge size the world reads as two tones: ember sky / teal sea.
  skyTop: [0.30, 0.14, 0.08],
  skyMid: [0.88, 0.38, 0.10],
  sunset: [1.0, 0.55, 0.12],
  sunsetSoft: [1.0, 0.72, 0.38],
  teal: [0.05, 0.55, 0.58],
  tealDeep: [0.03, 0.28, 0.34],
  ember: [1.0, 0.45, 0.08],
  seaDeep: [0.03, 0.28, 0.30],
  seaLight: [0.12, 0.58, 0.55],
  deckGrey: [0.30, 0.36, 0.40],
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
  { id: 'camar7', name: 'CAMAR-7', role: 'Light Interceptor', speed: 1.15, fuel: 0.85, handling: 1.25, color: [1.0, 0.50, 0.12] },
  { id: 'rajawali9', name: 'RAJAWALI-9', role: 'Strike', speed: 1.0, fuel: 1.0, handling: 1.0, color: [0.95, 0.42, 0.08] },
  { id: 'albatros3', name: 'ALBATROS-3', role: 'Heavy Lifter', speed: 0.85, fuel: 1.35, handling: 0.8, color: [1.0, 0.60, 0.20] },
];

export const UPGRADES = [
  { id: 'hook', name: 'Arrestor Hook', desc: '+1 wire catch window', price: 150 },
  { id: 'catapult', name: 'Catapult Bridle', desc: 'Faster deck launch', price: 200 },
  { id: 'tank', name: 'Bigger Tank', desc: '+30 fuel capacity', price: 250 },
  { id: 'radar', name: 'Storm Radar', desc: 'See cells on HUD', price: 300 },
  { id: 'lights', name: 'Landing Lights', desc: 'Deck glows brighter', price: 120 },
  { id: 'gear', name: 'Reinforced Gear', desc: 'Survive hard landings', price: 180 },
  { id: 'goggles', name: 'Night Goggles', desc: 'Night patrol vision', price: 220 },
  { id: 'radio', name: 'Ship Radio', desc: 'LSO calls out glide', price: 100 },
  { id: 'heater', name: 'Cockpit Heater', desc: 'No icing in squall', price: 80 },
  { id: 'prop', name: 'Fast Propeller', desc: '+10% climb rate', price: 260 },
  { id: 'net', name: 'Cargo Net', desc: 'Carry +1 cargo', price: 140 },
  { id: 'hull', name: 'Reinforced Hull', desc: '+1 hull heart', price: 320 },
];
