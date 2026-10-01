import { getEvent } from '../src/content/events';
import { REGIONS } from '../src/content/regions';
import { SKILLS, skillStatus } from '../src/content/skills';
import * as A from '../src/engine/actions';
import { newGame, tick } from '../src/engine/sim';
import type { GameState, RunConfig, TeamId } from '../src/engine/types';

export interface BotOptions {
  skill: 'smart' | 'idle';
}

const MIX: Record<TeamId, number> = { product: 0.4, rnd: 0.3, sre: 0.15, refactor: 0.15 };

function resolvePending(s: GameState): void {
  while (s.pending.length && !s.over) {
    const p = s.pending[0];
    if (p.kind === 'event') {
      const ev = getEvent(p.eventId);
      const idx = p.eventId === 'acquisition' ? 1 : ev?.choices?.findIndex((c) => !c.disabled?.(s)) ?? 0;
      A.resolveEvent(s, Math.max(0, idx));
    } else if (p.kind === 'board') A.pickCard(s, p.cards[0]);
    else if (p.kind === 'funding' || p.kind === 'bridge') A.resolveFunding(s, true);
    else if (p.kind === 'ipo') A.resolveIpo(s, false);
    else s.pending.shift();
  }
}

function manageInfra(s: GameState): void {
  const m = s.metrics;
  const fit = (demand: number, perUnit: number) => Math.max(1, Math.ceil(demand / (perUnit * 0.6)));
  if (!s.skills.includes('autoscale')) {
    const per = m.cpuCap / s.servers;
    if (m.util.cpu > 0.7 || m.util.cpu < 0.3) A.setInfra(s, 'servers', fit(m.cpuDemand, per));
    if (m.util.bw > 0.7 || m.util.bw < 0.3) A.setInfra(s, 'bandwidth', fit(m.bwDemand, m.bwCap / s.bandwidth));
  }
  if (s.metrics.util.db > 0.7 || s.metrics.util.db < 0.3) A.setInfra(s, 'dbNodes', fit(s.metrics.dbDemand, s.metrics.dbCap / s.dbNodes));
}

function manageTeam(s: GameState): void {
  const m = s.metrics;
  const net = m.revenueDay - m.costDay;
  const runwayDays = net >= 0 ? Infinity : s.cash / -net;
  const total = s.teams.product + s.teams.rnd + s.teams.sre + s.teams.refactor;
  if (runwayDays > 420 && s.cash > 100_000 && total < 120) {
    // hire into the most under-staffed team
    let best: TeamId = 'product';
    let gap = -Infinity;
    for (const t of Object.keys(MIX) as TeamId[]) {
      const g = MIX[t] * (total + 1) - s.teams[t];
      if (g > gap) { gap = g; best = t; }
    }
    A.hire(s, best, 1);
  } else if (runwayDays < 90 && total > 2) {
    const t = (['refactor', 'sre', 'rnd', 'product'] as TeamId[]).find((x) => s.teams[x] > 0);
    if (t) A.fire(s, t);
  }
  if (s.bugs > 40 && s.teams.sre === 0) {
    const from = (['rnd', 'refactor', 'product'] as TeamId[]).find((x) => s.teams[x] > 1);
    if (from) A.moveEngineer(s, from, 'sre');
  }
  if (s.candidates.length && s.cash > 2_000_000) A.hireStar(s, s.candidates[0].id);
}

function manageResearch(s: GameState): void {
  const avail = SKILLS.filter((n) => skillStatus(s.skills, n) === 'available').sort((a, b) => a.cost - b.cost);
  for (const n of avail) {
    if (s.rp >= n.cost) { A.research(s, n.id); A.quizResult(s, n.id, s.day % 5 < 3); }
  }
}

export function runBot(cfg: Partial<RunConfig>, opts: BotOptions = { skill: 'smart' }, onDay?: (s: GameState) => void): GameState {
  const s = newGame({ productId: 'social', founderId: 'hacker', difficultyId: 'ologn', mutators: [], seed: 42, companyName: 'BotCo', ...cfg });
  let guard = 0;
  while (!s.over && guard++ < 5000) {
    resolvePending(s);
    if (s.over) break;
    if (opts.skill === 'smart') {
      manageInfra(s);
      if (s.day % 7 === 0) manageTeam(s);
      manageResearch(s);
      for (const r of REGIONS) if (A.canExpand(s, r.id) && s.cash > A.regionCost(s, r.id) * 3) A.expand(s, r.id);
      if (s.day % 30 === 0) {
        const net = s.metrics.revenueDay - s.metrics.costDay;
        A.setMarketing(s, s.cash > 5_000_000 ? 3 : s.cash > 1_000_000 ? 2 : net > 0 ? 1 : 0);
      }
    } else {
      // idle: only keep the lights on
      if (s.metrics.util.cpu > 0.9) A.setInfra(s, 'servers', s.servers + 1);
      if (s.metrics.util.bw > 0.9) A.setInfra(s, 'bandwidth', s.bandwidth + 1);
      if (s.metrics.util.db > 0.9) A.setInfra(s, 'dbNodes', s.dbNodes + 1);
    }
    tick(s);
    onDay?.(s);
  }
  return s;
}
