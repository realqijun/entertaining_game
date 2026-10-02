import { BAL, DB_TIERS, SIZES } from '../../src/sdt/content/balance';
import * as A from '../../src/sdt/engine/actions';
import { advanceDay, cacheHitRate, liveStep, newGame, workloadFor } from '../../src/sdt/engine/sim';
import type { GameState, TechId } from '../../src/sdt/engine/types';

const PRIORITY: TechId[] = ['cache', 'lb', 'largerDb', 'cacheTune', 'hc', 'scaleUp', 'autoscale', 'spare', 'failover'];

function plan(s: GameState, reactive = false) {
  for (const t of PRIORITY) if (s.rp > 0 && !A.canResearch(s, t)) A.research(s, t);
  A.buildCache(s);
  A.tuneCache(s);
  A.buildLb(s);
  A.buildHc(s);
  A.buildAutoscale(s);
  if (s.limit < 1) A.setLimit(s, 1);
  for (const i of s.instances) if (i.status === 'down') A.restartInstance(s, i.id);

  if (reactive) return;
  // Provision for tomorrow's forecast with 20% headroom.
  const w = workloadFor({ ...s, baseRps: s.baseRps * (1 + BAL.growth), promoDays: Math.max(0, s.promoDays - 1) }, s.day + 1);
  const need = w.demand / 0.8;
  let appCap = s.instances.reduce((sum, i) => sum + SIZES[i.target ?? i.size].cap, 0);
  while (appCap < need) {
    if (s.lb && !A.addInstance(s, 'M')) appCap += SIZES.M.cap;
    else if (s.instances[0].size !== 'L' && !A.resizeInstance(s, s.instances[0].id, 'L')) appCap = SIZES.L.cap;
    else break;
  }
  const hit = (s.cache.on ? (s.cache.tuned ? 0.8 : 0.6) : 0) * w.cacheable;
  const ops = Math.min(w.demand, appCap) * (w.read * (1 - hit) + 1 - w.read);
  const tier = s.dbTier + s.builds.filter((b) => b.kind === 'db').length;
  if (ops / 0.8 > DB_TIERS[tier].cap) A.upgradeDb(s);

  const calm = !s.events.some((e) => e.day >= s.day + 1 && e.day <= s.day + 3);
  if (calm && s.cash > 2500 && s.day > 8) A.runPromotion(s);
}

function respond(s: GameState) {
  const m = s.metrics;
  for (const i of s.instances) if (i.status === 'down') A.restartInstance(s, i.id);
  if (!m.overloaded) {
    if (!m.healthy && m.downShare === 0 && s.limit === 1) A.setLimit(s, 0.8);
    return;
  }
  if (m.bottleneck === 'db') {
    if (A.upgradeDb(s) && !s.builds.length) A.setLimit(s, 0.6);
  } else if (A.addInstance(s, 'M') && (s.instances[0].size === 'L' || A.resizeInstance(s, s.instances[0].id, 'L'))) A.setLimit(s, 0.6);
  void cacheHitRate;
}

export interface BotResult { reason: string; day: number; incidents: number; cash: number; s: GameState }

export type BotKind = 'smart' | 'reactive' | 'idle';

export function runBot(seed: number, kind: BotKind): BotResult {
  const smart = kind !== 'idle';
  const s = newGame(seed);
  let guard = 0;
  while (!s.over && guard++ < 20000) {
    while (s.pending.length) A.resolvePending(s);
    if (s.mode === 'day') {
      if (smart) plan(s, kind === 'reactive');
      advanceDay(s);
    } else {
      if (smart) respond(s);
      liveStep(s);
    }
  }
  return { reason: s.over?.reason ?? 'stuck', day: s.day, incidents: s.incidents.length, cash: Math.round(s.cash), s };
}
