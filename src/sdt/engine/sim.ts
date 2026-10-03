import { founderFor } from '../content/story';
import { BAL, BUILD, CACHE, DB_TIERS, INSTANCE_DELAY, MILESTONES, SIZES } from '../content/balance';
import { buildSchedule, describeEvent, eventOn, NORMAL } from '../content/events';
import { rand } from './rng';
import type { Alert, GameState, Incident, Instance, Metrics, Point, TraceEntry, Workload } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function newGame(seed: number): GameState {
  const s: GameState = {
    version: 1,
    seed,
    founder: founderFor(seed),
    rng: seed >>> 0,
    mode: 'day',
    day: 1,
    step: 0,
    cash: BAL.startCash,
    rep: BAL.startRep,
    baseRps: BAL.startRps,
    promoDays: 0,
    promos: 0,
    limit: 1,
    instances: [{ id: 1, size: 'M', status: 'up', timer: 0 }],
    nextInstanceId: 2,
    standby: null,
    dbTier: 0,
    cache: { on: false, tuned: false, warm: 0 },
    lb: false,
    hc: false,
    autoscale: false,
    tech: [],
    rp: 1,
    milestone: 0,
    builds: [],
    backlog: 0,
    workload: { demand: BAL.startRps, read: NORMAL.read, cacheable: NORMAL.cacheable, cause: null },
    metrics: null as unknown as Metrics,
    dayHist: [],
    liveHist: [],
    alerts: [],
    log: [],
    events: [],
    failureDays: [],
    incident: null,
    liveTrace: [],
    incidents: [],
    nextIncidentId: 1,
    overSteps: 0,
    healthySteps: 0,
    pending: [],
    over: null,
    avail: { total: 0, failed: 0 },
    stats: { actions: 0, hints: 0, inspects: 0, promos: 0, lostRevenue: 0 },
  };
  const sched = buildSchedule(s);
  s.events = sched.events;
  s.failureDays = sched.failureDays;
  s.metrics = computeMetrics(s, s.workload, false);
  s.alerts = alertsFor(s);
  s.dayHist.push(pointOf(s.day, s.metrics));
  log(s, 'info', 'Day 1: one app server, one database, 50k users. Reach 1M users.');
  return s;
}

export const users = (s: GameState) => Math.round(s.baseRps * BAL.usersPerRps);

export function log(s: GameState, tone: GameState['log'][number]['tone'], text: string) {
  s.log.unshift({ day: s.day, tone, text });
  if (s.log.length > 60) s.log.length = 60;
}

/** Record something in the live trace (and the incident, if one is open). */
export function trace(s: GameState, entry: Omit<TraceEntry, 'step'>) {
  if (s.mode !== 'live') return;
  const e = { step: s.step, ...entry };
  (s.incident ? s.incident.trace : s.liveTrace).push(e);
}

export function cacheHitRate(s: GameState): number {
  if (!s.cache.on) return 0;
  return (s.cache.tuned ? CACHE.tunedHit : CACHE.hit) * s.cache.warm;
}

/**
 * The shared request pipeline used by both day turns and live steps.
 * Admitted traffic → app instances → (cache) → database. Each stage is a queue:
 * latency rises as utilisation nears 100%, and beyond capacity a bounded backlog
 * builds and the overflow fails.
 */
export function computeMetrics(s: GameState, w: Workload, dynamic: boolean): Metrics {
  const demand = w.demand;
  const admitted = demand * s.limit;
  const rejected = demand - admitted;

  const up = s.instances.filter((i) => i.status === 'up');
  const appCap = up.reduce((sum, i) => sum + SIZES[i.size].cap, 0);
  let downShare: number;
  if (!up.length) downShare = 1;
  else if (!s.lb) downShare = s.instances[0].status === 'up' ? 0 : 1;
  else if (s.hc) downShare = 0;
  // Without health checks the load balancer keeps sending an equal share to dead instances.
  // Booting instances are not registered with the load balancer yet.
  else downShare = 1 - up.length / s.instances.filter((i) => i.status !== 'booting').length;

  const toApp = admitted * (1 - downShare);
  const hit = cacheHitRate(s) * w.cacheable;
  const opsPerReq = w.read * (1 - hit) + (1 - w.read);
  const dbCap = DB_TIERS[s.dbTier].cap;
  const dbCapReq = dbCap / opsPerReq;
  const sysCap = Math.min(appCap, dbCapReq);
  const bottleneck = appCap <= dbCapReq ? 'app' : 'db';

  let served: number;
  let failedQ: number;
  let backlog = 0;
  if (dynamic) {
    const total = toApp + s.backlog;
    served = Math.min(total, sysCap);
    const b = total - served;
    const bmax = sysCap * 0.5;
    failedQ = Math.max(0, b - bmax);
    backlog = Math.min(b, bmax);
    s.backlog = backlog;
  } else {
    served = Math.min(toApp, sysCap);
    failedQ = toApp - served;
    if (failedQ > 0) backlog = sysCap * 0.5;
  }
  const failed = admitted * downShare + failedQ;
  const u = sysCap > 0 ? Math.min(toApp / sysCap, 0.97) : 0.97;
  const latency = sysCap > 0 ? 40 + 25 / (1 - u) + (backlog / sysCap) * 1000 : 3000;
  const errRate = admitted > 0 ? failed / admitted : 0;
  const appUtil = appCap > 0 ? toApp / appCap : toApp > 0 ? 9.99 : 0;
  const dbOps = Math.min(toApp, appCap) * opsPerReq;
  const dbUtil = dbOps / dbCap;
  const overloaded = toApp > sysCap * 1.0001 && sysCap > 0;
  return {
    demand,
    admitted,
    rejected,
    served,
    failed,
    latency,
    errRate,
    appCap,
    appLoad: toApp,
    appUtil,
    dbCap,
    dbOps,
    dbUtil,
    cacheHit: hit,
    read: w.read,
    downShare,
    bottleneck,
    overloaded,
    healthy: latency < BAL.latencyOk && errRate < BAL.errOk && downShare === 0,
  };
}

export function dailyCost(s: GameState): number {
  let c = s.instances.reduce((sum, i) => sum + SIZES[i.target ?? i.size].cost, 0);
  if (s.standby) c += SIZES.M.cost;
  c += DB_TIERS[s.dbTier].cost;
  if (s.cache.on) c += CACHE.cost + (s.cache.tuned ? CACHE.tuneCost : 0);
  if (s.lb) c += BUILD.lb.cost;
  if (s.hc) c += BUILD.hc.cost;
  for (const b of s.builds) {
    if (b.kind === 'cache') c += CACHE.cost;
    if (b.kind === 'cacheTune') c += CACHE.tuneCost;
    if (b.kind === 'lb') c += BUILD.lb.cost;
  }
  return c;
}

export const dailyRevenue = (m: Metrics) => m.served * BAL.revenuePerRps;

export function workloadFor(s: GameState, day: number): Workload {
  const ev = eventOn(s, day);
  let demand = s.baseRps;
  let cause: string | null = null;
  if (s.promoDays > 0) {
    demand *= BAL.promo.mult;
    cause = 'Promotion';
  }
  if (ev) {
    demand *= ev.mult;
    cause = ev.name;
  }
  return { demand, read: ev?.read ?? NORMAL.read, cacheable: ev?.cacheable ?? NORMAL.cacheable, cause };
}

function pointOf(t: number, m: Metrics): Point {
  return { t, latency: m.latency, errRate: m.errRate, appUtil: m.appUtil, dbUtil: m.dbUtil, demand: m.demand };
}

export function alertsFor(s: GameState): Alert[] {
  const m = s.metrics;
  const out: Alert[] = [];
  const down = s.instances.filter((i) => i.status === 'down').length;
  if (down) out.push({ level: 'crit', comp: 'app', text: `${down} app instance${down > 1 ? 's' : ''} down` });
  if (m.downShare > 0 && m.downShare < 1) out.push({ level: 'crit', comp: 'lb', text: `${Math.round(m.downShare * 100)}% of traffic sent to dead instances` });
  if (m.appUtil > 1) out.push({ level: 'crit', comp: 'app', text: `App servers at ${Math.round(m.appUtil * 100)}%` });
  else if (m.appUtil > 0.85) out.push({ level: 'warn', comp: 'app', text: `App servers at ${Math.round(m.appUtil * 100)}%` });
  if (m.dbUtil > 1) out.push({ level: 'crit', comp: 'db', text: `Database at ${Math.round(m.dbUtil * 100)}%` });
  else if (m.dbUtil > 0.85) out.push({ level: 'warn', comp: 'db', text: `Database at ${Math.round(m.dbUtil * 100)}%` });
  if (m.errRate >= BAL.errOk) out.push({ level: 'crit', comp: 'users', text: `${(m.errRate * 100).toFixed(1)}% of requests failing` });
  if (m.latency >= BAL.latencyOk) out.push({ level: 'warn', comp: 'users', text: `Latency ${Math.round(m.latency)} ms` });
  if (s.cache.on && s.cache.warm < 1) out.push({ level: 'warn', comp: 'cache', text: `Cache warming (${Math.round(s.cache.warm * 100)}%)` });
  return out;
}

function finishBuild(s: GameState, kind: GameState['builds'][number]['kind']) {
  if (kind === 'db') s.dbTier++;
  else if (kind === 'cache') s.cache = { on: true, tuned: false, warm: 0 };
  else if (kind === 'cacheTune') s.cache.tuned = true;
  else if (kind === 'lb') s.lb = true;
  else if (kind === 'hc') s.hc = true;
  else if (kind === 'autoscale') s.autoscale = true;
}

function finishInstance(i: Instance) {
  if (i.target) i.size = i.target;
  i.target = undefined;
  i.status = 'up';
  i.timer = 0;
}

/** Overnight: every pending change completes and caches are warm. */
function completeAll(s: GameState) {
  for (const b of s.builds) finishBuild(s, b.kind);
  s.builds = [];
  for (const i of s.instances) if (i.status === 'booting' || i.status === 'resizing') finishInstance(i);
  if (s.standby && s.standby.status !== 'up') finishInstance(s.standby);
  if (s.cache.on) s.cache.warm = 1;
  s.backlog = 0;
}

function autoscaleDay(s: GameState) {
  if (!s.autoscale || !s.lb) return;
  const m = computeMetrics(s, s.workload, false);
  const target = 0.7;
  const need = m.appLoad / target;
  let cap = m.appCap;
  while (cap < need && s.instances.length < BAL.maxInstances) {
    s.instances.push({ id: s.nextInstanceId++, size: 'M', status: 'up', timer: 0, auto: true });
    cap += SIZES.M.cap;
  }
  for (let i = s.instances.length - 1; i > 0; i--) {
    const inst = s.instances[i];
    if (inst.auto && inst.status === 'up' && cap - SIZES.M.cap >= need) {
      s.instances.splice(i, 1);
      cap -= SIZES.M.cap;
    }
  }
}

function startLive(s: GameState, why: string) {
  s.mode = 'live';
  s.step = 0;
  s.liveHist = [];
  s.liveTrace = [];
  s.overSteps = 0;
  s.healthySteps = 0;
  s.backlog = 0;
  log(s, 'bad', why);
  trace(s, { kind: 'alert', text: why });
}

function checkMilestones(s: GameState) {
  while (s.milestone < MILESTONES.length && users(s) >= MILESTONES[s.milestone].users) {
    const m = MILESTONES[s.milestone];
    s.milestone++;
    if (s.milestone < MILESTONES.length) {
      s.rp++;
      s.cash += m.cash;
      log(s, 'good', `${m.title}! +$${m.cash.toLocaleString()} and 1 research point.`);
      s.pending.push({ kind: 'milestone', index: s.milestone - 1 });
    }
  }
}

function checkEnd(s: GameState) {
  if (s.over) return;
  if (s.rep <= 0) s.over = { reason: 'reputation', day: s.day };
  else if (s.cash < 0) s.over = { reason: 'bankrupt', day: s.day };
  else if (s.mode === 'day' && !s.incident && s.milestone >= MILESTONES.length) s.over = { reason: 'win', day: s.day };
  else if (s.mode === 'day' && s.day >= BAL.lastDay) s.over = { reason: 'timeout', day: s.day };
}

/** Advance one management turn (a day). */
export function advanceDay(s: GameState) {
  if (s.over || s.mode !== 'day' || s.pending.length) return;
  s.day++;
  completeAll(s);

  const g = BAL.growth * clamp(s.rep / BAL.startRep, 0.2, 1.2) * (s.limit < 1 ? s.limit : 1);
  s.baseRps *= 1 + g;
  if (s.promoDays > 0) s.promoDays--;

  s.workload = workloadFor(s, s.day);
  autoscaleDay(s);
  const m = computeMetrics(s, s.workload, false);
  s.metrics = m;

  s.cash += dailyRevenue(m) - dailyCost(s);

  const ev = eventOn(s, s.day);
  if (ev && ev.day === s.day) log(s, 'warn', describeEvent(ev));
  const tomorrow = s.events.find((e) => e.day === s.day + 1);
  if (tomorrow) log(s, 'info', `Forecast for tomorrow: ${describeEvent(tomorrow)}`);

  if (s.failureDays.includes(s.day)) {
    const victim = s.instances.find((i) => i.status === 'up');
    if (victim) {
      victim.status = 'down';
      s.metrics = computeMetrics(s, s.workload, false);
      startLive(s, `App instance #${victim.id} crashed.`);
    }
  }
  if (s.mode === 'day') {
    if (s.metrics.overloaded) startLive(s, `${s.metrics.bottleneck === 'db' ? 'Database' : 'App servers'} overloaded at peak.`);
    else if (s.metrics.downShare > 0) startLive(s, 'Requests are reaching a dead instance.');
  }
  if (s.mode === 'day') {
    // A calm day counts as a full day of service; a live day is measured step by step instead.
    s.avail.total += s.metrics.admitted * BAL.stepsPerDay;
    s.avail.failed += s.metrics.failed * BAL.stepsPerDay;
    if (s.metrics.latency >= BAL.latencyOk) {
      s.rep = clamp(s.rep - 2, 0, 100);
      log(s, 'warn', `Slow day: ${Math.round(s.metrics.latency)} ms at peak. Running near 100% leaves no headroom.`);
    } else s.rep = clamp(s.rep + 1.5, 0, 100);
  }

  s.alerts = alertsFor(s);
  s.dayHist.push(pointOf(s.day, s.metrics));
  if (s.dayHist.length > 60) s.dayHist.shift();
  checkMilestones(s);
  checkEnd(s);
}

function tickTimers(s: GameState) {
  for (const b of s.builds) b.left--;
  for (const b of s.builds.filter((x) => x.left <= 0)) {
    finishBuild(s, b.kind);
    trace(s, { kind: 'ready', text: `${b.label} is live` });
  }
  s.builds = s.builds.filter((b) => b.left > 0);
  for (const i of [...s.instances, ...(s.standby ? [s.standby] : [])]) {
    if (i.status !== 'booting' && i.status !== 'resizing') continue;
    if (--i.timer <= 0) {
      finishInstance(i);
      trace(s, { kind: 'ready', text: `Instance #${i.id} up (${SIZES[i.size].label})` });
    }
  }
  if (s.cache.on && s.cache.warm < 1) s.cache.warm = Math.min(1, s.cache.warm + CACHE.warmPerStep);
}

function autoscaleLive(s: GameState) {
  if (!s.autoscale || !s.lb) return;
  const busy = s.instances.some((i) => i.status === 'booting');
  if (!busy && s.metrics.appUtil > 0.85 && s.instances.length < BAL.maxInstances) {
    s.instances.push({ id: s.nextInstanceId++, size: 'M', status: 'booting', timer: INSTANCE_DELAY.boot, auto: true });
    trace(s, { kind: 'auto', text: 'Autoscaling launched an instance' });
  }
}

function failover(s: GameState) {
  if (!s.tech.includes('failover') || !s.lb || !s.hc) return;
  for (const i of s.instances) {
    if (i.status !== 'down') continue;
    if (s.standby?.status === 'up') {
      s.instances.push(s.standby);
      trace(s, { kind: 'auto', text: `Failover promoted standby #${s.standby.id}` });
      s.standby = null;
    }
    i.status = 'booting';
    i.timer = INSTANCE_DELAY.restart;
    trace(s, { kind: 'auto', text: `Failover restarting #${i.id}` });
  }
}

function declare(s: GameState, kind: Incident['kind'], variant: Incident['variant']) {
  const m = s.metrics;
  const trigger =
    kind === 'failure'
      ? 'An app instance crashed'
      : s.workload.cause
        ? `${s.workload.cause} pushed demand to ${Math.round(m.demand)} req/s`
        : `Growth pushed demand to ${Math.round(m.demand)} req/s`;
  s.incident = {
    id: s.nextIncidentId++,
    kind,
    variant,
    day: s.day,
    trigger,
    startStep: s.step,
    endStep: null,
    trace: [...s.liveTrace],
    series: [...s.liveHist],
    peakAppUtil: m.appUtil,
    peakDbUtil: m.dbUtil,
    peakErr: m.errRate,
    peakLatency: m.latency,
    failed: 0,
    rejected: 0,
    repLost: 0,
    hints: 0,
    workload: { ...s.workload },
    start: { appCap: m.appCap, dbCap: m.dbCap, dbOps: m.dbOps, cacheHit: m.cacheHit },
  };
  const what = kind === 'failure' ? 'App instance failure' : variant === 'db' ? 'Database overload' : 'App server overload';
  log(s, 'bad', `Incident: ${what}.`);
  trace(s, { kind: 'alert', text: `Incident declared: ${what}` });
}

/** Advance one real-time step during a live episode. */
export function liveStep(s: GameState) {
  if (s.over || s.mode !== 'live' || s.pending.length) return;
  s.step++;
  tickTimers(s);
  failover(s);

  const noise = 1 + (rand(s) - 0.5) * 0.06;
  const m = computeMetrics(s, { ...s.workload, demand: s.workload.demand * noise }, true);
  s.metrics = m;
  autoscaleLive(s);

  const lost = (m.failed + m.rejected) * (BAL.revenuePerRps / 12);
  s.cash -= lost;
  s.stats.lostRevenue += lost;
  s.avail.total += m.admitted;
  s.avail.failed += m.failed;

  let repLoss = 0;
  if (!m.healthy) repLoss += m.errRate > 0.2 ? 1 : 0.5;
  if (m.rejected > 0) repLoss += 0.15;
  s.rep = clamp(s.rep - repLoss, 0, 100);

  s.overSteps = m.overloaded ? s.overSteps + 1 : 0;
  if (!s.incident) {
    if (m.downShare > 0) declare(s, 'failure', 'instance');
    else if (s.overSteps >= BAL.overloadSteps) declare(s, 'overload', m.bottleneck);
  }
  // An open incident needs full recovery; a live episode with no incident ends once it is stable.
  const ok = s.incident ? m.healthy : !m.overloaded && m.downShare === 0;
  s.healthySteps = ok ? s.healthySteps + 1 : 0;

  const inc = s.incident;
  if (inc) {
    inc.peakAppUtil = Math.max(inc.peakAppUtil, m.appUtil);
    inc.peakDbUtil = Math.max(inc.peakDbUtil, m.dbUtil);
    inc.peakErr = Math.max(inc.peakErr, m.errRate);
    inc.peakLatency = Math.max(inc.peakLatency, m.latency);
    inc.failed += m.failed;
    inc.rejected += m.rejected;
    inc.repLost += repLoss;
  }

  const p = pointOf(s.step, m);
  s.liveHist.push(p);
  if (inc) inc.series.push(p);
  s.alerts = alertsFor(s);

  if (inc && s.healthySteps >= BAL.recoverSteps) {
    inc.endStep = s.step;
    trace(s, { kind: 'ready', text: `Recovered: ${BAL.recoverSteps} healthy steps in a row` });
    s.incidents.push(inc);
    s.incident = null;
    s.mode = 'day';
    s.pending.push({ kind: 'postmortem', incidentId: inc.id });
    log(s, 'good', `Recovered after ${inc.endStep - inc.startStep} steps.`);
  } else if (!inc && s.healthySteps >= BAL.recoverSteps) {
    s.mode = 'day';
    log(s, 'good', 'Incident averted: the system absorbed it.');
  }
  checkEnd(s);
}

/** Overall availability so far (served ÷ admitted, weighted by time). */
export function availability(s: GameState): number {
  return s.avail.total > 0 ? 1 - s.avail.failed / s.avail.total : 1;
}
