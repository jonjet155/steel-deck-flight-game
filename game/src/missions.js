// missions.js — 4 sorties, 3 planes, 12 upgrades, 6 storm cells, 2 bosses.
import { PLANES, UPGRADES, CFG } from './config.js';
import { makeRng, randRange } from './random.js';

export const SORTIES = [
  {
    id: 1, name: 'STORM INTERCEPT', goal: 'Thread 6 storm cells to intercept',
    desc: 'Fly through all 6 storm cells. Turbulence is heavy — watch your hull.',
    target: 'cells', reward: 400,
  },
  {
    id: 2, name: 'SUPPLY RUN', goal: 'Deliver cargo to the island strip in the squall',
    desc: 'Carry supplies to Pulau Karang Api strip. Land gently or drop low and slow.',
    target: 'strip', reward: 500,
  },
  {
    id: 3, name: 'NIGHT PATROL', goal: 'Patrol the archipelago and light the deck',
    desc: 'Circle all 4 islands at night. Deck lights guide you home.',
    target: 'patrol', reward: 450,
  },
  {
    id: 4, name: 'TRAP FINALE', goal: '3-wire trap landing in the storm',
    desc: 'The Eye is overhead. Bring her home — catch WIRE 3 for a PERFECT trap.',
    target: 'trap', reward: 1000,
  },
];

export function makeStormCells(seed) {
  const rng = makeRng(seed);
  const cells = [];
  const spots = [[-260, 300], [180, 420], [-80, -120], [320, -60], [-380, -300], [60, 700]];
  for (let i = 0; i < CFG.stormCells; i++) {
    cells.push({
      id: i + 1,
      x: spots[i][0] + randRange(rng, -40, 40),
      z: spots[i][1] + randRange(rng, -40, 40),
      y: 90 + randRange(rng, 0, 60),
      r: 55 + randRange(rng, 0, 35),
      strength: 0.7 + rng() * 0.6,
      visited: false,
      phase: rng() * Math.PI * 2,
    });
  }
  return cells;
}

export const BOSSES = [
  { id: 'eye', name: 'THE EYE', desc: 'The storm eye — a wall of cloud with a calm, deadly core.', x: 0, z: 900, r: 160 },
  { id: 'squall', name: 'NIGHT SQUALL', desc: 'The night squall — lightning, rain and zero visibility.', x: -300, z: -500, r: 140 },
];

export function makeGameState() {
  return {
    state: 'title', // title | map | play | trapped | bolter | crashed
    sortieIdx: 0,
    planeIdx: 1,
    score: 0,
    chain: 0,
    cellsHit: 0,
    islandsVisited: [],
    cargoDelivered: false,
    time: 0,
    popup: null,
    popupT: 0,
    message: '',
    upgradesOwned: [],
    lightning: 0,
    lightningT: 0,
  };
}

export { PLANES, UPGRADES };
