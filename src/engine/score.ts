import { getFounder } from '../content/founders';
import { getDifficulty, getMutator } from '../content/worlds';
import { BASE } from './helpers';
import type { GameOver, GameState } from './types';

export const TITLES: [number, string][] = [
  [0, 'Garage Tinkerer 🔧'],
  [1_000_000, 'Ramen Profitable 🍜'],
  [10_000_000, 'Series A Survivor 🌱'],
  [100_000_000, 'Hypergrowth Hacker 🚀'],
  [1_000_000_000, 'Unicorn Founder 🦄'],
  [10_000_000_000, 'Decacorn Deity 🐉'],
  [100_000_000_000, 'FAANG Slayer 👑'],
];

export function scoreMultiplier(s: GameState): number {
  let m = getDifficulty(s.difficultyId).scoreMult * getFounder(s.founderId).scoreMult;
  for (const id of s.mutators) m *= getMutator(id)?.scoreMult ?? 1;
  return m;
}

export function titleFor(score: number): string {
  let t = TITLES[0][1];
  for (const [min, name] of TITLES) if (score >= min) t = name;
  return t;
}

/** GitHub stars ★ are the meta currency. They grow with the square root of score, so every run is worth something. */
export function starsFor(score: number, reason: GameOver['reason']): number {
  const base = Math.floor(Math.sqrt(Math.max(0, score) / 1_000_000) * 1.5);
  return Math.max(reason === 'bankrupt' ? 1 : 2, base + (reason === 'ipo' ? 5 : 0));
}

export function endGame(s: GameState, reason: GameOver['reason'], valuationOverride?: number): void {
  if (s.over) return;
  const valuation = reason === 'bankrupt' ? 0 : valuationOverride ?? s.metrics.valuation;
  let mult = scoreMultiplier(s);
  if (reason === 'ipo') mult *= 1.25 + Math.max(0, (BASE.totalDays - s.day) / 365) * 0.1;
  const score = reason === 'bankrupt' ? Math.max(0, s.stats.totalRevenue * 0.05) : valuation * s.equity * mult;
  s.over = { reason, valuation, equity: s.equity, score, stars: starsFor(score, reason), title: titleFor(score) };
}
