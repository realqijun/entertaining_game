import type { Effect } from '../engine/types';

export interface Founder {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  perks: string[];
  cash: number;
  engineers: number;
  equity: number;
  startSkills: string[];
  noVC?: boolean;
  scoreMult: number;
  effect: Effect;
  unlockCost: number;
}

export const FOUNDERS: Founder[] = [
  {
    id: 'hacker',
    name: 'The Hacker',
    emoji: '🧑‍💻',
    desc: 'Dropped out to ship. Writes code at 3am, fueled by energy drinks.',
    perks: ['+25% research speed', '+10% feature speed', '−20% starting cash'],
    cash: 200_000,
    engineers: 3,
    equity: 0.9,
    startSkills: [],
    scoreMult: 1,
    effect: { mods: { researchSpeed: 1.25, featureSpeed: 1.1 } },
    unlockCost: 0,
  },
  {
    id: 'mba',
    name: 'The MBA',
    emoji: '👔',
    desc: 'Has a 40-slide deck and a VC on speed dial. Has never heard of Big-O.',
    perks: ['+$150k starting cash', '+20% revenue per user', '−25% research speed', 'Better funding terms'],
    cash: 400_000,
    engineers: 3,
    equity: 0.85,
    startSkills: [],
    scoreMult: 1,
    effect: { mods: { arpu: 1.2, researchSpeed: 0.75, cac: 0.85 }, flags: ['goodTerms'] },
    unlockCost: 0,
  },
  {
    id: 'phd',
    name: 'The PhD',
    emoji: '🎓',
    desc: 'Wrote a thesis on cache-oblivious algorithms. Ships slowly, but ships correctly.',
    perks: ['Starts with Binary Search + Indexing', 'Correct quiz answers refund 50% instead of 25%', '−15% feature speed'],
    cash: 250_000,
    engineers: 3,
    equity: 0.9,
    startSkills: ['binary-search', 'indexing'],
    scoreMult: 1,
    effect: { mods: { featureSpeed: 0.85, bugSpawn: 0.85 }, flags: ['scholar'] },
    unlockCost: 10,
  },
  {
    id: 'faang',
    name: 'The Ex-FAANG',
    emoji: '🏢',
    desc: 'Left a big tech job with stock to burn and a network of senior engineers.',
    perks: ['Starts with 5 engineers', '−30% recruiting fees', '+10% salaries (they expect it)', 'Starts with Monitoring'],
    cash: 300_000,
    engineers: 5,
    equity: 0.9,
    startSkills: ['monitoring'],
    scoreMult: 1,
    effect: { mods: { hireCost: 0.7, salary: 1.1 } },
    unlockCost: 20,
  },
  {
    id: 'indie',
    name: 'The Indie Hacker',
    emoji: '🏕️',
    desc: 'Bootstrapped. Profitable or dead. Owns 100% of something.',
    perks: ['100% equity, no VC rounds', '−25% salaries, −20% infra costs, −20% marketing cost', 'Score ×1.5'],
    cash: 160_000,
    engineers: 2,
    equity: 1,
    startSkills: [],
    noVC: true,
    scoreMult: 1.5,
    effect: { mods: { salary: 0.75, serverCost: 0.8, dbCost: 0.8, cac: 0.8 } },
    unlockCost: 35,
  },
];

export function getFounder(id: string): Founder {
  return FOUNDERS.find((f) => f.id === id) ?? FOUNDERS[0];
}
