import type { Effect } from '../engine/types';

export interface Difficulty {
  id: string;
  name: string;
  label: string;
  desc: string;
  costMult: number;
  eventMult: number;
  expectMult: number;
  /** Market headwinds: slower growth and thinner margins. */
  growthMult: number;
  arpuMult: number;
  scoreMult: number;
  unlockCost: number;
}

/** Difficulty levels are named after complexity classes: bigger O, harder life. */
export const DIFFICULTIES: Difficulty[] = [
  { id: 'o1', name: 'O(1)', label: 'Constant', desc: 'Cheap cloud, patient users. Good for learning the ropes.', costMult: 0.75, eventMult: 0.6, expectMult: 0.75, growthMult: 1.15, arpuMult: 1.15, scoreMult: 0.6, unlockCost: 0 },
  { id: 'ologn', name: 'O(log n)', label: 'Logarithmic', desc: 'The intended experience.', costMult: 1, eventMult: 1, expectMult: 1, growthMult: 1, arpuMult: 1, scoreMult: 1, unlockCost: 0 },
  { id: 'on', name: 'O(n)', label: 'Linear', desc: 'Costlier infra, pickier users, slower markets, more chaos.', costMult: 1.2, eventMult: 1.25, expectMult: 1.15, growthMult: 0.88, arpuMult: 0.85, scoreMult: 1.5, unlockCost: 10 },
  { id: 'on2', name: 'O(n²)', label: 'Quadratic', desc: 'Everything is on fire and the fire is expensive.', costMult: 1.45, eventMult: 1.5, expectMult: 1.3, growthMult: 0.78, arpuMult: 0.72, scoreMult: 2.25, unlockCost: 30 },
  { id: 'o2n', name: 'O(2ⁿ)', label: 'Exponential', desc: 'For people who think NP-hard is a challenge rating.', costMult: 1.8, eventMult: 1.8, expectMult: 1.5, growthMult: 0.7, arpuMult: 0.6, scoreMult: 3.5, unlockCost: 60 },
];

export interface Mutator {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  lesson: string;
  scoreMult: number;
  effect: Effect;
  unlockCost: number;
}

/**
 * Mutators are odd worlds that bend one rule of computing. Stack them for score multipliers.
 * Each one is a lesson in disguise.
 */
export const MUTATORS: Mutator[] = [
  {
    id: 'mars',
    name: 'Interplanetary',
    emoji: '🪐',
    desc: 'Half your users live on Mars. Light takes minutes to get there. Every request gets +400ms unless you build Edge Computing or a CDN.',
    lesson: 'The speed of light is a hard latency floor. That is why edge computing and local-first apps exist.',
    scoreMult: 1.35,
    effect: { mods: { latencyFloor: 400 }, flags: ['mars'] },
    unlockCost: 5,
  },
  {
    id: 'cosmic',
    name: 'Cosmic Rays',
    emoji: '☢️',
    desc: 'Solar flares flip random bits in RAM. Bugs spawn 60% faster and incidents happen more often.',
    lesson: 'Bit flips really happen. ECC memory, checksums and formal verification exist for a reason.',
    scoreMult: 1.2,
    effect: { mods: { bugSpawn: 1.6, incidentChance: 1.3 } },
    unlockCost: 5,
  },
  {
    id: 'moore',
    name: "Moore's Law Is Dead",
    emoji: '🪦',
    desc: 'Hardware stopped getting cheaper. Server prices rise 2% a month, but algorithm upgrades are 25% stronger.',
    lesson: 'When hardware stops getting faster, efficient algorithms become the only way to scale.',
    scoreMult: 1.25,
    effect: { flags: ['moore'] },
    unlockCost: 10,
  },
  {
    id: 'green',
    name: 'Green Mandate',
    emoji: '🌱',
    desc: 'A carbon tax doubles the price of servers and DB nodes. Eco-conscious users are 10% happier.',
    lesson: 'Data centres use a lot of electricity. Efficient code is green code.',
    scoreMult: 1.2,
    effect: { mods: { serverCost: 2, dbCost: 2, satBonus: 4 } },
    unlockCost: 10,
  },
  {
    id: 'cobol',
    name: 'Legacy COBOL',
    emoji: '🦖',
    desc: 'You acquired a 1974 mainframe codebase. You start with 120 tech debt, and refactoring is 30% slower.',
    lesson: 'Most of the world still runs on legacy code. Paying down debt is a skill.',
    scoreMult: 1.3,
    effect: { mods: { debtPaydown: 0.7 }, flags: ['cobol'] },
    unlockCost: 15,
  },
  {
    id: 'zipf',
    name: "Zipf's Revenge",
    emoji: '📈',
    desc: 'A few celebrity users generate most of the traffic. Random traffic spikes are 3× more common, but caching is 15% more effective.',
    lesson: "Zipf's law: in real traffic, a few hot keys get most of the hits. That is why caching works so well.",
    scoreMult: 1.2,
    effect: { mods: { cacheHit: 0.15 }, flags: ['zipf'] },
    unlockCost: 15,
  },
  {
    id: 'byzantine',
    name: 'Byzantine Cloud',
    emoji: '🏛️',
    desc: "Some of your servers lie. You lose 15% of capacity and incidents last longer, unless you research Consensus (Raft).",
    lesson: 'The Byzantine Generals problem: reaching agreement when some nodes may be faulty or malicious.',
    scoreMult: 1.25,
    effect: { flags: ['byzantine'] },
    unlockCost: 20,
  },
  {
    id: 'hypecycle',
    name: 'Hype Cycle',
    emoji: '🎢',
    desc: 'The market swings between boom and bust every year. Growth and investor appetite ride the wave.',
    lesson: 'Gartner hype cycle: peak of inflated expectations, then the trough of disillusionment.',
    scoreMult: 1.15,
    effect: { flags: ['hypecycle'] },
    unlockCost: 20,
  },
];

export function getDifficulty(id: string): Difficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}

export function getMutator(id: string): Mutator | undefined {
  return MUTATORS.find((m) => m.id === id);
}
