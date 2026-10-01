import { getCard } from '../content/cards';
import { getEvent, resolveEventChoice } from '../content/events';
import { getRegion } from '../content/regions';
import { getSkill, skillStatus } from '../content/skills';
import { BASE, log, unlockCodex } from './helpers';
import { computeMods } from './mods';
import { endGame } from './score';
import { FUNDING_ROUNDS, IPO_THRESHOLD, refresh } from './sim';
import type { GameState, TeamId } from './types';

export function recruitCost(s: GameState): number {
  return Math.round(BASE.recruit * computeMods(s).hireCost);
}

export function hire(s: GameState, team: TeamId, count = 1): boolean {
  const cost = recruitCost(s) * count;
  if (s.cash < cost) return false;
  s.cash -= cost;
  s.teams[team] += count;
  for (let i = 0; i < count; i++) s.onboarding.push({ team, days: 20 });
  if (s.onboarding.length >= 3) unlockCodex(s, 'brooks');
  refresh(s);
  return true;
}

export function fire(s: GameState, team: TeamId): boolean {
  if (s.teams[team] <= 0) return false;
  s.teams[team] -= 1;
  s.cash -= BASE.salary * computeMods(s).salary;
  const idx = s.onboarding.findIndex((o) => o.team === team);
  if (idx >= 0) s.onboarding.splice(idx, 1);
  refresh(s);
  return true;
}

/** Moving an engineer costs a short context-switch ramp-up on the new team. */
export function moveEngineer(s: GameState, from: TeamId, to: TeamId): boolean {
  if (s.teams[from] <= 0 || from === to) return false;
  s.teams[from] -= 1;
  s.teams[to] += 1;
  const idx = s.onboarding.findIndex((o) => o.team === from);
  if (idx >= 0) s.onboarding.splice(idx, 1);
  s.onboarding.push({ team: to, days: 7 });
  refresh(s);
  return true;
}

export function hireStar(s: GameState, id: string): boolean {
  const st = s.candidates.find((c) => c.id === id);
  if (!st || s.cash < st.signing) return false;
  s.cash -= st.signing;
  s.candidates = s.candidates.filter((c) => c.id !== id);
  s.stars.push(st);
  s.onboarding.push({ team: st.team, days: 10 });
  log(s, `🌟 Hired ${st.name} to the ${st.team} team.`, 'good');
  refresh(s);
  return true;
}

export function moveStar(s: GameState, id: string, team: TeamId): void {
  const st = s.stars.find((x) => x.id === id);
  if (!st || st.team === team) return;
  st.team = team;
  s.onboarding.push({ team, days: 7 });
  refresh(s);
}

export function fireStar(s: GameState, id: string): void {
  const st = s.stars.find((x) => x.id === id);
  if (!st) return;
  s.stars = s.stars.filter((x) => x.id !== id);
  s.cash -= st.salary;
  log(s, `👋 ${st.name} has left the company.`, 'info');
  refresh(s);
}

export type Infra = 'servers' | 'bandwidth' | 'dbNodes';

export function setInfra(s: GameState, kind: Infra, value: number): void {
  s[kind] = Math.max(kind === 'dbNodes' ? 1 : 1, Math.min(100_000, Math.round(value)));
  refresh(s);
}

export function setMonetization(s: GameState, v: number): void {
  s.monetization = Math.max(0, Math.min(1, v));
  refresh(s);
}

export function setMarketing(s: GameState, level: number): void {
  s.marketing = Math.max(0, Math.min(BASE.marketing.length - 1, level));
  refresh(s);
}

export function toggleAutoscale(s: GameState): void {
  s.autoscale = !s.autoscale;
}

export function canResearch(s: GameState, id: string): boolean {
  const node = getSkill(id);
  return !!node && skillStatus(s.skills, node) === 'available' && s.rp >= node.cost;
}

export function research(s: GameState, id: string): boolean {
  const node = getSkill(id);
  if (!node || !canResearch(s, id)) return false;
  s.rp -= node.cost;
  s.skills.push(id);
  log(s, `🔬 Researched ${node.name}`, 'good');
  if (id === 'cache') unlockCodex(s, 'caching');
  if (id === 'sql' || id === 'nosql') unlockCodex(s, 'cap');
  if (s.skills.filter((k) => getSkill(k)?.branch === 'algo').length >= 3) unlockCodex(s, 'amdahl');
  if (id === 'autoscale') s.autoscale = true;
  refresh(s);
  return true;
}

/** Answering the "prove it" quiz refunds part of the research cost. */
export function quizResult(s: GameState, id: string, correct: boolean): number {
  const node = getSkill(id);
  s.stats.quizTotal += 1;
  if (!node || !correct) return 0;
  s.stats.quizCorrect += 1;
  const refund = Math.round(node.cost * (computeMods(s).flags.has('scholar') ? 0.5 : 0.25));
  s.rp += refund;
  return refund;
}

export function resolveEvent(s: GameState, choice: number): string {
  const p = s.pending[0];
  if (!p || p.kind !== 'event') return '';
  const ev = getEvent(p.eventId);
  s.pending.shift();
  const msg = ev ? resolveEventChoice(s, ev, choice) : '';
  refresh(s);
  return msg;
}

export function pickCard(s: GameState, cardId: string): void {
  const p = s.pending[0];
  if (!p || p.kind !== 'board') return;
  s.pending.shift();
  const card = getCard(cardId);
  if (!card) return;
  card.apply?.(s);
  if (card.perk) s.perks.push(card.id);
  log(s, `🃏 Board meeting: ${card.emoji} ${card.name}`, 'info');
  refresh(s);
}

export function resolveFunding(s: GameState, accept: boolean): void {
  const p = s.pending[0];
  if (!p || (p.kind !== 'funding' && p.kind !== 'bridge')) return;
  s.pending.shift();
  if (p.kind === 'funding') s.fundingRound = p.round + 1;
  if (!accept) {
    log(s, p.kind === 'funding' ? `🙅 Declined ${FUNDING_ROUNDS[p.round].name}. Bootstrapping is a lifestyle.` : '🙅 Declined the bridge loan.', 'info');
    return;
  }
  s.cash += p.cash;
  s.equity *= 1 - p.dilution;
  const name = p.kind === 'funding' ? FUNDING_ROUNDS[p.round].name : 'Bridge round';
  s.stats.rounds.push(name);
  unlockCodex(s, 'dilution');
  log(s, `💰 Closed ${name}: +$${(p.cash / 1e6).toFixed(1)}M for ${Math.round(p.dilution * 100)}%`, 'good');
  if (p.kind === 'funding') s.hype += 0.3;
  refresh(s);
}

export function resolveIpo(s: GameState, accept: boolean): void {
  const p = s.pending[0];
  if (p?.kind === 'ipo') s.pending.shift();
  if (accept) ipo(s);
  else log(s, '🔔 Not yet. You can ring the IPO bell any time from the top bar.', 'info');
}

export function canIpo(s: GameState): boolean {
  return !s.over && s.metrics.valuation >= IPO_THRESHOLD;
}

export function ipo(s: GameState): void {
  if (!canIpo(s)) return;
  log(s, '🔔 IPO! You rang the bell at the stock exchange.', 'good');
  endGame(s, 'ipo');
}

export function retire(s: GameState): void {
  endGame(s, 'time');
}

export function regionCost(s: GameState, id: string): number {
  const r = getRegion(id);
  if (!r) return Infinity;
  // Each region you already serve makes the next one cheaper to launch (shared playbook).
  return Math.round(r.cost * Math.pow(0.9, s.regions.length));
}

export function canExpand(s: GameState, id: string): boolean {
  const r = getRegion(id);
  return !!r && !s.regions.includes(id) && r.requires.every((k) => s.skills.includes(k)) && s.cash >= regionCost(s, id);
}

export function expand(s: GameState, id: string): boolean {
  const r = getRegion(id);
  if (!r || !canExpand(s, id)) return false;
  s.cash -= regionCost(s, id);
  s.regions.push(id);
  s.hype += 0.25;
  log(s, `${r.emoji} Launched in ${r.name}! Addressable market +${Math.round(r.tam * 100)}%.`, 'good');
  refresh(s);
  return true;
}
