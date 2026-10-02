import { BAL, BUILD, CACHE, DB_TIERS, INSTANCE_DELAY, SIZES } from '../content/balance';
import { TECH, techById } from '../content/tech';
import { log, trace } from './sim';
import type { BuildKind, Component, GameState, IncidentVariant, Size, TechId } from './types';

/** Actions return an error string when refused, or null on success. */
export type Result = string | null;

type Fix = 'app' | 'db' | 'instance' | 'limit';

/** What is limiting the system right now, if anything. */
export function currentProblem(s: GameState): IncidentVariant | null {
  if (s.mode !== 'live') return null;
  const m = s.metrics;
  if (m.downShare > 0) return 'instance';
  if (m.overloaded) return m.bottleneck;
  // Not overloaded but still too slow: the busiest component is what needs headroom.
  if (!m.healthy) return m.appUtil >= m.dbUtil ? 'app' : 'db';
  return s.incident?.variant ?? null;
}

const WHY_NOT: Record<IncidentVariant, string> = {
  db: 'The app servers had spare capacity; the database was the limit.',
  app: 'The database had headroom; the app servers were the limit.',
  instance: 'Traffic was still being sent to a dead instance.',
};

function judge(s: GameState, fixes: Fix[]): { helpful?: boolean; why?: string } {
  const p = currentProblem(s);
  if (!p) return {};
  if (fixes.includes('limit') && p !== 'instance') return { helpful: true, why: 'Fast relief, but every rejected request is lost revenue.' };
  if (fixes.includes(p)) return { helpful: true };
  return { helpful: false, why: WHY_NOT[p] };
}

function did(s: GameState, text: string, fixes: Fix[]) {
  s.stats.actions++;
  trace(s, { kind: 'action', text, ...judge(s, fixes) });
}

const has = (s: GameState, t: TechId) => s.tech.includes(t);
const building = (s: GameState, k: BuildKind) => s.builds.some((b) => b.kind === k);

function pay(s: GameState, cost: number): Result {
  if (cost > s.cash) return `Needs $${cost.toLocaleString()}`;
  s.cash -= cost;
  return null;
}

function startBuild(s: GameState, kind: BuildKind, label: string, delay: number) {
  s.builds.push({ kind, label, left: delay });
}

// ───── app instances ─────

export function canResize(s: GameState, size: Size): Result {
  if (size === 'L' && !has(s, 'scaleUp')) return 'Research Scale up';
  return null;
}

export function resizeInstance(s: GameState, id: number, size: Size): Result {
  const i = s.instances.find((x) => x.id === id);
  if (!i) return 'No such instance';
  if (i.size === size || i.target === size) return 'Already that size';
  const why = canResize(s, size);
  if (why) return why;
  i.target = size;
  i.status = 'resizing';
  i.timer = INSTANCE_DELAY.resize;
  did(s, `Resized #${id} to ${SIZES[size].label} (restarts it)`, ['app', 'instance']);
  log(s, 'info', `Resizing instance #${id} to ${SIZES[size].label}.`);
  return null;
}

export function canAddInstance(s: GameState): Result {
  if (!s.lb) return has(s, 'lb') ? 'Build the load balancer first' : 'Research Scale out';
  if (s.instances.length >= BAL.maxInstances) return `Max ${BAL.maxInstances} instances`;
  return null;
}

export function addInstance(s: GameState, size: Size = 'M'): Result {
  const why = canAddInstance(s) ?? canResize(s, size);
  if (why) return why;
  s.instances.push({ id: s.nextInstanceId++, size, status: 'booting', timer: INSTANCE_DELAY.boot });
  did(s, `Added a ${SIZES[size].label} instance`, s.hc ? ['app', 'instance'] : ['app']);
  return null;
}

export function removeInstance(s: GameState, id: number): Result {
  if (s.instances.length <= 1) return 'Keep at least one instance';
  const idx = s.instances.findIndex((x) => x.id === id);
  if (idx < 0) return 'No such instance';
  const [gone] = s.instances.splice(idx, 1);
  did(s, `Removed instance #${id}`, gone.status === 'down' ? ['instance'] : []);
  return null;
}

export function restartInstance(s: GameState, id: number): Result {
  const i = s.instances.find((x) => x.id === id);
  if (!i || i.status !== 'down') return 'Instance is not down';
  i.status = 'booting';
  i.timer = INSTANCE_DELAY.restart;
  did(s, `Restarted #${id}`, ['instance']);
  return null;
}

export function addStandby(s: GameState): Result {
  if (!has(s, 'spare')) return 'Research Spare instance';
  if (s.standby) return 'Already have a standby';
  s.standby = { id: s.nextInstanceId++, size: 'M', status: 'booting', timer: INSTANCE_DELAY.boot };
  did(s, 'Added a warm standby', []);
  return null;
}

export function promoteStandby(s: GameState): Result {
  const sb = s.standby;
  if (!sb || sb.status !== 'up') return 'No ready standby';
  sb.status = 'booting';
  sb.timer = INSTANCE_DELAY.promote;
  if (s.lb) s.instances.push(sb);
  else {
    // Without a load balancer the standby replaces the primary.
    s.instances[0] = sb;
  }
  s.standby = null;
  did(s, `Promoted standby #${sb.id}`, ['instance', 'app']);
  return null;
}

// ───── data tier ─────

export function canUpgradeDb(s: GameState): Result {
  const next = s.dbTier + 1 + s.builds.filter((b) => b.kind === 'db').length;
  if (next >= DB_TIERS.length) return 'Largest database';
  if (next >= 2 && !has(s, 'largerDb')) return 'Research Larger database';
  return null;
}

export function upgradeDb(s: GameState): Result {
  const why = canUpgradeDb(s);
  if (why) return why;
  const next = s.dbTier + 1 + s.builds.filter((b) => b.kind === 'db').length;
  const err = pay(s, DB_TIERS[next].upgrade);
  if (err) return err;
  startBuild(s, 'db', `Database ${DB_TIERS[next].cap.toLocaleString()} ops/s`, BUILD.db.delay);
  did(s, `Upgraded database to ${DB_TIERS[next].cap.toLocaleString()} ops/s (ready in ${BUILD.db.delay} steps)`, ['db']);
  return null;
}

export function buildCache(s: GameState): Result {
  if (!has(s, 'cache')) return 'Research Read cache';
  if (s.cache.on || building(s, 'cache')) return 'Already built';
  const err = pay(s, CACHE.setup);
  if (err) return err;
  startBuild(s, 'cache', 'Read cache', BUILD.cache.delay);
  did(s, 'Added a read cache (starts cold)', ['db']);
  return null;
}

export function tuneCache(s: GameState): Result {
  if (!has(s, 'cacheTune')) return 'Research Cache tuning';
  if (!s.cache.on) return 'Build the cache first';
  if (s.cache.tuned || building(s, 'cacheTune')) return 'Already tuned';
  const err = pay(s, CACHE.tuneSetup);
  if (err) return err;
  startBuild(s, 'cacheTune', 'Cache tuning', BUILD.cacheTune.delay);
  did(s, 'Tuned the cache (hit rate 60% → 80%)', ['db']);
  return null;
}

// ───── routing & reliability ─────

export function buildLb(s: GameState): Result {
  if (!has(s, 'lb')) return 'Research Scale out';
  if (s.lb || building(s, 'lb')) return 'Already built';
  const err = pay(s, BUILD.lb.setup);
  if (err) return err;
  startBuild(s, 'lb', 'Load balancer', BUILD.lb.delay);
  did(s, 'Added a load balancer', ['app']);
  return null;
}

export function buildHc(s: GameState): Result {
  if (!has(s, 'hc')) return 'Research Health checks';
  if (s.hc || building(s, 'hc')) return 'Already on';
  const err = pay(s, BUILD.hc.setup);
  if (err) return err;
  startBuild(s, 'hc', 'Health checks', BUILD.hc.delay);
  did(s, 'Turned on health checks', s.lb ? ['instance'] : []);
  return null;
}

export function buildAutoscale(s: GameState): Result {
  if (!has(s, 'autoscale')) return 'Research Autoscaling';
  if (!s.lb) return 'Build the load balancer first';
  if (s.autoscale || building(s, 'autoscale')) return 'Already on';
  const err = pay(s, BUILD.autoscale.setup);
  if (err) return err;
  startBuild(s, 'autoscale', 'Autoscaling', BUILD.autoscale.delay);
  did(s, 'Turned on autoscaling', ['app']);
  return null;
}

// ───── traffic ─────

export function runPromotion(s: GameState): Result {
  if (s.mode !== 'day') return 'Not during an incident';
  if (s.promoDays > 0) return 'Promotion already running';
  const err = pay(s, BAL.promo.cost);
  if (err) return err;
  s.baseRps *= 1 + BAL.promo.permanent;
  s.promoDays = BAL.promo.days + 1;
  s.promos++;
  s.stats.promos++;
  s.stats.actions++;
  log(s, 'info', `Promotion launched: traffic ×${BAL.promo.mult} for ${BAL.promo.days} days, +${BAL.promo.permanent * 100}% users.`);
  return null;
}

export function setLimit(s: GameState, frac: number): Result {
  if (!(BAL.limits as readonly number[]).includes(frac)) return 'Invalid limit';
  if (s.limit === frac) return null;
  s.limit = frac;
  did(s, frac < 1 ? `Limited traffic to ${Math.round(frac * 100)}%` : 'Removed the traffic limit', frac < 1 ? ['limit'] : []);
  return null;
}

// ───── research, inspection, hints ─────

export function techVisible(s: GameState, id: TechId): boolean {
  return techById(id).stage <= s.milestone;
}

export function canResearch(s: GameState, id: TechId): Result {
  const t = techById(id);
  if (has(s, id)) return 'Researched';
  if (!techVisible(s, id)) return 'Locked';
  const missing = t.requires.filter((r) => !has(s, r));
  if (missing.length) return `Needs ${missing.map((r) => techById(r).name).join(', ')}`;
  if (s.rp < 1) return 'No research points';
  return null;
}

export function research(s: GameState, id: TechId): Result {
  const why = canResearch(s, id);
  if (why) return why;
  s.rp--;
  s.tech.push(id);
  log(s, 'good', `Researched ${techById(id).name}.`);
  trace(s, { kind: 'action', text: `Researched ${techById(id).name}` });
  return null;
}

export const visibleTech = (s: GameState) => TECH.filter((t) => techVisible(s, t.id));

export function inspect(s: GameState, comp: Component) {
  s.stats.inspects++;
  const m = s.metrics;
  const detail: Record<Component, string> = {
    users: `${Math.round(m.demand)} req/s, ${Math.round(m.read * 100)}% reads`,
    lb: s.lb ? `${s.instances.length} targets${s.hc ? ', health-checked' : ''}` : 'none',
    app: `${Math.round(m.appUtil * 100)}% of ${Math.round(m.appCap)} req/s`,
    cache: s.cache.on ? `hit ${Math.round(m.cacheHit * 100)}%` : 'none',
    db: `${Math.round(m.dbUtil * 100)}% of ${m.dbCap} ops/s`,
  };
  trace(s, { kind: 'inspect', text: `Inspected ${comp}: ${detail[comp]}` });
}

/** Three-level hint ladder for the current problem. */
export function hint(s: GameState): string {
  const p = currentProblem(s);
  const level = s.incident ? s.incident.hints : 0;
  if (s.incident) s.incident.hints++;
  s.stats.hints++;
  trace(s, { kind: 'hint', text: `Hint ${level + 1} used` });
  const m = s.metrics;
  if (!p) return 'Everything is healthy. Watch the utilisation bars: anything above 85% has little headroom.';
  if (level === 0) return 'Find the component that is red or above 100%. Click it to inspect its numbers.';
  if (p === 'instance') {
    if (level === 1) return s.lb && !s.hc ? 'The load balancer keeps sending traffic to the crashed instance. It cannot tell it is dead.' : 'Your only app instance crashed, so every request fails.';
    return 'Restart the crashed instance (4 steps). Health checks and a spare instance would make this automatic next time.';
  }
  if (p === 'db') {
    if (level === 1) return `The database is at ${Math.round(m.dbUtil * 100)}%. Adding app servers will not help: every uncached request still hits the database.`;
    return 'Options: upgrade the database, add a read cache (helps reads only), or limit traffic for fast relief.';
  }
  if (level === 1) return `App servers are at ${Math.round(m.appUtil * 100)}% while the database has headroom.`;
  return s.lb ? 'Options: add instances, resize to a larger server, or limit traffic for fast relief.' : 'Options: resize to a larger server (it restarts), research Scale out, or limit traffic for fast relief.';
}

export function resolvePending(s: GameState) {
  s.pending.shift();
}
