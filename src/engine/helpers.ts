import { getProduct } from '../content/products';
import { FIRST_NAMES, LAST_NAMES, TRAITS, getTrait } from '../content/people';
import { pick, rand, randInt } from './rng';
import type { Buff, Effect, GameState, LogEntry, Star, TeamId } from './types';

export const BASE = {
  salary: 8_000,
  recruit: 6_000,
  serverCost: 300,
  serverRps: 12,
  bandwidthCost: 120,
  bandwidthMbps: 10,
  dbCost: 600,
  dbQps: 100,
  marketing: [0, 5_000, 20_000, 60_000, 150_000, 400_000],
  totalDays: 1825,
  boardEvery: 90,
} as const;

export function log(s: GameState, text: string, tone: LogEntry['tone'] = 'info'): void {
  s.log.unshift({ day: s.day, text, tone });
  if (s.log.length > 120) s.log.length = 120;
}

export function addBuff(s: GameState, id: string, name: string, emoji: string, days: number, effect: Effect, good: boolean): void {
  const existing = s.buffs.find((b) => b.id === id);
  if (existing) {
    existing.daysLeft = Math.max(existing.daysLeft, days);
    return;
  }
  const buff: Buff = { id, name, emoji, daysLeft: days, effect, good };
  s.buffs.push(buff);
}

export function unlockCodex(s: GameState, id: string): void {
  if (!s.codex.includes(id)) {
    s.codex.push(id);
    log(s, `📖 Codex unlocked: new CS concept discovered! (see Codex tab)`, 'info');
  }
}

export function totalEngineers(s: GameState): number {
  return s.teams.product + s.teams.sre + s.teams.rnd + s.teams.refactor + s.stars.length;
}

export function makeStar(s: GameState, costMult: number): Star {
  const trait = pick(s, TRAITS);
  const level = 1 + Math.floor(s.day / 365);
  const salary = Math.round((BASE.salary * 1.6 * trait.salaryMult * (0.9 + rand(s) * 0.3)) / 100) * 100;
  const teams: TeamId[] = ['product', 'sre', 'rnd', 'refactor'];
  return {
    id: `star-${s.day}-${randInt(s, 0, 1e6)}`,
    name: `${pick(s, FIRST_NAMES)} ${pick(s, LAST_NAMES)}`,
    emoji: getTrait(trait.id).emoji,
    trait: trait.id,
    team: pick(s, teams),
    power: Math.round(trait.power * (1 + 0.08 * level) * 10) / 10,
    salary,
    signing: Math.round((salary * 2 * costMult) / 1000) * 1000,
  };
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Ship the next feature on the roadmap. Raises TAM and hype, adds tech debt and a few launch bugs. */
export function shipFeature(s: GameState, debt: number): string {
  const product = getProduct(s.productId);
  const name = s.featureLevel < product.featureNames.length ? product.featureNames[s.featureLevel] : `${pick(s, FEATURE_SUFFIX)} v${s.featureLevel - product.featureNames.length + 2}`;
  s.featureLevel += 1;
  s.features.push(name);
  s.stats.featuresShipped += 1;
  s.debt += debt;
  s.bugs += 1 + rand(s) * 2;
  s.hype += 0.06;
  log(s, `🚀 Shipped: ${name}`, 'good');
  return name;
}

const FEATURE_SUFFIX = ['Redesign', 'AI Assistant', 'Dashboard', 'Settings Page', 'Mobile App', 'Blockchain Integration (why?)', 'Enterprise SSO', 'Dark Mode 2', 'Onboarding Flow', 'Notifications'];
