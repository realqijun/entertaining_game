import { CARDS } from '../content/cards';
import { EVENTS } from '../content/events';
import { getFounder } from '../content/founders';
import { getProduct } from '../content/products';
import { regionTamMult } from '../content/regions';
import { makeTweet } from '../content/tweets';
import { getDifficulty } from '../content/worlds';
import { BASE, clamp, log, makeStar, shipFeature, totalEngineers, unlockCodex } from './helpers';
import { computeMods } from './mods';
import { chance, rand, randInt, weightedPick, weightedSample } from './rng';
import { endGame } from './score';
import { TEAMS, type GameState, type Metrics, type Mods, type RunConfig, type TeamId } from './types';

export const FUNDING_ROUNDS = [
  { name: 'Series A', tamFrac: 0.001, min: 2_000_000, dilution: 0.2 },
  { name: 'Series B', tamFrac: 0.02, min: 12_000_000, dilution: 0.15 },
  { name: 'Series C', tamFrac: 0.1, min: 50_000_000, dilution: 0.12 },
  { name: 'Series D', tamFrac: 0.3, min: 150_000_000, dilution: 0.08 },
];

export const IPO_THRESHOLD = 1_000_000_000;

export function featureCost(level: number): number {
  return 18 * Math.pow(1.2, level);
}

function layerLatency(util: number, service: number): number {
  return service / (1 - Math.min(util, 0.985));
}

function dropFraction(util: number): number {
  return util > 1 ? 1 - 1 / util : 0;
}

export function effectiveTeams(s: GameState, m: Mods): Record<TeamId, number> {
  const drag = 1 / (1 + s.debt / 150);
  const exp = clamp(0.8 + m.brooks, 0.5, 1);
  const out = {} as Record<TeamId, number>;
  for (const t of TEAMS) {
    const stars = s.stars.filter((st) => st.team === t).reduce((a, st) => a + st.power, 0);
    const ramping = s.onboarding.filter((o) => o.team === t).length * 0.6;
    const raw = Math.max(0, s.teams[t] + stars - ramping);
    out[t] = Math.pow(raw, exp) * m.productivity * drag;
  }
  return out;
}

export function capacityPerServer(m: Mods): number {
  return BASE.serverRps * m.serverPower;
}

export function computeMetrics(s: GameState, m: Mods, downtime: number): Metrics {
  const p = getProduct(s.productId);
  const d = getDifficulty(s.difficultyId);
  const users = Math.max(1, s.users);
  const rpsPeak = ((users * p.reqPerUser) / 86400) * p.peak * m.traffic;

  const cpuDemand = rpsPeak * p.cpu * m.cpuPerReq;
  const cpuCap = s.servers * capacityPerServer(m);
  const bwDemand = ((rpsPeak * p.payloadKB * m.payload * 8) / 1000) * (1 - m.cdnOffload);
  const bwCap = s.bandwidth * BASE.bandwidthMbps;
  const cacheHit = m.flags.has('cache') ? m.cacheHit : 0;
  const dbDemand = rpsPeak * p.dbPerReq * m.dbPerReq * (1 - cacheHit);
  const dbCap = s.dbNodes * BASE.dbQps * m.dbCapacity;

  const util = {
    cpu: cpuCap > 0 ? cpuDemand / cpuCap : 99,
    bw: bwCap > 0 ? bwDemand / bwCap : 99,
    db: dbCap > 0 ? dbDemand / dbCap : 99,
  };
  let floor = 20 * (m.flags.has('edge') ? 0.6 : 1);
  if (m.latencyFloor > 0) floor += m.latencyFloor * (m.flags.has('edge') ? 0.15 : 1) * (m.flags.has('cdn') ? 0.5 : 1);
  const latParts = {
    cpu: layerLatency(util.cpu, 40 * m.serviceTime),
    bw: layerLatency(util.bw, 15),
    db: layerLatency(util.db, 12),
    floor,
  };
  const latency = latParts.cpu + latParts.bw + latParts.db + latParts.floor;
  const dropRate = 1 - (1 - dropFraction(util.cpu)) * (1 - dropFraction(util.bw)) * (1 - dropFraction(util.db));
  const bugErr = s.bugs * 0.0003;
  const errorRate = clamp(downtime + (dropRate + bugErr) * m.errorMult, 0, 1);

  const expectedFeatures = (1 + s.day / 75) * d.expectMult;
  // Users expect things to get faster every year.
  const expect = 1 - 0.3 * Math.min(1, s.day / BASE.totalDays);
  let latScore = (100 * (p.latBad * expect - latency)) / ((p.latBad - p.latGood) * expect);
  latScore = clamp(latScore, 0, 100);
  const satParts = {
    latency: latScore,
    reliability: clamp(100 - errorRate * 400, 0, 100),
    features: clamp(60 + (s.featureLevel - expectedFeatures) * 10, 0, 100),
    bugs: clamp(100 - s.bugs * 1.5, 0, 100),
    price: clamp(100 - s.monetization * 70, 0, 100),
  };
  const w = p.weights;
  const satTarget = clamp(
    satParts.latency * w.latency + satParts.reliability * w.reliability + satParts.features * w.features + satParts.bugs * w.bugs + satParts.price * w.price + m.satBonus,
    0,
    100,
  );

  const revenueDay = s.users * ((p.arpu * m.arpu * d.arpuMult) / 30) * (0.2 + 1.6 * s.monetization) * (0.6 + s.sat / 250) * (1 - errorRate);
  const generic = s.teams.product + s.teams.sre + s.teams.rnd + s.teams.refactor;
  const starSalary = s.stars.reduce((a, st) => a + st.salary, 0);
  const salaryMult = m.salary * (0.5 + 0.5 * d.costMult);
  const costs = {
    salary: ((generic * BASE.salary + starSalary) * salaryMult) / 30,
    servers: (s.servers * BASE.serverCost * m.serverCost * d.costMult) / 30,
    bandwidth: (s.bandwidth * BASE.bandwidthCost * m.bandwidthCost * d.costMult) / 30,
    db: (s.dbNodes * BASE.dbCost * m.dbCost * d.costMult) / 30,
    marketing: BASE.marketing[s.marketing] / 30,
  };
  const costDay = costs.salary + costs.servers + costs.bandwidth + costs.db + costs.marketing;

  const tam = p.tam * (1 + 0.4 * Math.log(1 + s.featureLevel)) * regionTamMult(s.regions) * m.tam;
  const u30 = s.usersWindow.length ? s.usersWindow[0] : s.users;
  const growth30 = u30 > 0 ? s.users / u30 - 1 : 0;
  const multiple = clamp(3 + Math.min(growth30, 1) * 6 + (s.sat - 60) / 10, 1.5, 12);
  const valuation = Math.max(0, revenueDay * 365 * multiple + s.users * p.userValue * (0.5 + s.sat / 200) + s.skills.length * 30_000 + Math.max(0, s.cash) * 0.5);

  const uptime30 = s.uptimeWindow.length ? s.uptimeWindow.reduce((a, b) => a + b, 0) / s.uptimeWindow.length : 1;

  return {
    rpsPeak, cpuDemand, cpuCap, bwDemand, bwCap, dbDemand, dbCap, util, latency, latParts, dropRate, errorRate, downtime,
    satTarget, satParts, revenueDay, costDay, costs, growthDay: s.metrics?.growthDay ?? 0, tam, valuation,
    effective: effectiveTeams(s, m), uptime30, debtDrag: 1 / (1 + s.debt / 150), expectedFeatures, featureCost: featureCost(s.featureLevel),
  };
}

/** Recompute derived metrics without advancing time (after player actions). */
export function refresh(s: GameState): void {
  const m = computeMods(s);
  s.metrics = computeMetrics(s, m, s.metrics?.downtime ?? 0);
}

function autoscale(s: GameState, m: Mods): void {
  if (!m.flags.has('autoscale') || !s.autoscale) return;
  const met = computeMetrics(s, m, 0);
  s.servers = Math.max(1, Math.ceil(met.cpuDemand / (capacityPerServer(m) * 0.65)));
  s.bandwidth = Math.max(1, Math.ceil(met.bwDemand / (BASE.bandwidthMbps * 0.65)));
}

export function newGame(cfg: RunConfig): GameState {
  const founder = getFounder(cfg.founderId);
  const legacy = cfg.legacy ?? [];
  const extraCash = legacy.includes('seed-cash') ? 75_000 : 0;
  const extraEng = legacy.includes('cofounder') ? 1 : 0;
  const s: GameState = {
    version: 1,
    seed: cfg.seed,
    rng: cfg.seed,
    day: 0,
    productId: cfg.productId,
    founderId: cfg.founderId,
    difficultyId: cfg.difficultyId,
    mutators: [...cfg.mutators],
    daily: cfg.daily ?? null,
    companyName: cfg.companyName,
    cash: founder.cash + extraCash,
    users: 50,
    sat: 70,
    hype: 0.1,
    equity: founder.equity,
    teams: { product: Math.ceil((founder.engineers + extraEng) / 2), sre: 0, rnd: Math.floor((founder.engineers + extraEng) / 2), refactor: 0 },
    stars: [],
    onboarding: [],
    candidates: [],
    servers: 1,
    bandwidth: 1,
    dbNodes: 1,
    autoscale: true,
    monetization: 0.5,
    marketing: 0,
    featurePts: 0,
    featureLevel: 0,
    features: [],
    rp: legacy.includes('head-start') ? 40 : 0,
    skills: [...founder.startSkills],
    perks: [],
    regions: [],
    debt: cfg.mutators.includes('cobol') ? 120 : 0,
    bugs: 0,
    outageHours: 0,
    outageName: '',
    buffs: [],
    contracts: [],
    fundingRound: 0,
    pending: [],
    usedEvents: [],
    history: [],
    log: [],
    tweets: [],
    uptimeWindow: [],
    usersWindow: [],
    metrics: undefined as unknown as Metrics,
    stats: { peakUsers: 50, totalRevenue: 0, incidents: 0, featuresShipped: 0, bugsFixed: 0, quizCorrect: 0, quizTotal: 0, maxDownHours: 0, rounds: [] },
    codex: [],
    negativeCashDays: 0,
    lastBridgeDay: -9999,
    ipoOffered: false,
    over: null,
  };
  if (legacy.includes('mentor')) s.perks.push('cto');
  const m = computeMods(s);
  s.candidates = [makeStar(s, m.hireCost), makeStar(s, m.hireCost), makeStar(s, m.hireCost)];
  for (const id of s.mutators) {
    if (id === 'mars') unlockCodex(s, 'speed-of-light');
    if (id === 'byzantine') unlockCodex(s, 'byzantine');
    if (id === 'moore') unlockCodex(s, 'moore');
  }
  s.metrics = computeMetrics(s, m, 0);
  s.history.push(snapshot(s));
  log(s, `🏁 ${s.companyName} is born in a garage. ${getProduct(s.productId).tagline}`, 'info');
  return s;
}

function snapshot(s: GameState) {
  return {
    day: s.day,
    users: Math.round(s.users),
    cash: Math.round(s.cash),
    sat: Math.round(s.sat * 10) / 10,
    latency: Math.round(s.metrics.latency),
    revenue: Math.round(s.metrics.revenueDay * 30),
    valuation: Math.round(s.metrics.valuation),
  };
}

function resolveContracts(s: GameState, m: Mods): void {
  for (const c of [...s.contracts]) {
    c.daysLeft -= 1;
    c.track.days += 1;
    c.track.upSum += 1 - s.metrics.downtime - s.metrics.dropRate;
    c.track.latSum += s.metrics.latency;
    c.track.satMin = Math.min(c.track.satMin, s.sat);
    let done = c.daysLeft <= 0;
    let success = false;
    if (c.kind === 'users' && s.users >= c.target) { done = true; success = true; }
    if (done && !success) {
      if (c.kind === 'uptime') success = c.track.upSum / c.track.days >= c.target;
      if (c.kind === 'latency') success = c.track.latSum / c.track.days <= c.target;
      if (c.kind === 'sat') success = c.track.satMin >= c.target;
    }
    if (!done) continue;
    s.contracts.splice(s.contracts.indexOf(c), 1);
    if (success) {
      s.cash += c.reward;
      if (c.kind === 'latency') s.buffs.push({ id: 'partner', name: 'Partner Promotion', emoji: '🕹️', daysLeft: 90, effect: { mods: { growth: 1.2 } }, good: true });
      log(s, `✅ Contract complete: ${c.name}. +$${Math.round(c.reward / 1000)}k`, 'good');
    } else {
      s.cash -= c.penalty;
      if (c.kind === 'users') s.sat -= 10;
      log(s, `❌ Contract failed: ${c.name}.${c.penalty ? ` −$${Math.round(c.penalty / 1000)}k` : ' The board is disappointed.'}`, 'bad');
    }
  }
  void m;
}

function maybeEvent(s: GameState, m: Mods): void {
  const d = getDifficulty(s.difficultyId);
  if (s.day < 25 || !chance(s, (1 / 26) * d.eventMult)) return;
  const pool = EVENTS.filter((e) => !(e.once && s.usedEvents.includes(e.id)));
  const ev = weightedPick(s, pool, (e) => {
    const w = e.weight(s, m);
    // Dampen repeats so runs feel varied.
    const repeats = s.usedEvents.filter((u) => u === e.id).length;
    return w / (1 + repeats * 0.7);
  });
  if (!ev) return;
  s.usedEvents.push(ev.id);
  if (ev.auto) {
    const msg = ev.auto(s, m);
    if (ev.codex) unlockCodex(s, ev.codex);
    log(s, `${ev.emoji} ${ev.title}: ${msg}`, ev.tone === 'good' ? 'good' : ev.tone === 'bad' ? 'bad' : 'info');
  } else {
    s.pending.push({ kind: 'event', eventId: ev.id });
  }
}

function maybeFunding(s: GameState): void {
  const founder = getFounder(s.founderId);
  if (founder.noVC || s.fundingRound >= FUNDING_ROUNDS.length) return;
  if (s.pending.some((p) => p.kind === 'funding')) return;
  const round = FUNDING_ROUNDS[s.fundingRound];
  const p = getProduct(s.productId);
  if (s.users < p.tam * round.tamFrac) return;
  const m = computeMods(s);
  let cash = Math.max(round.min, (s.metrics.valuation * round.dilution) / (1 - round.dilution));
  if (m.flags.has('goodTerms')) cash *= 1.25;
  if (m.flags.has('hypecycle')) cash *= 1 + 0.4 * Math.sin((s.day / 365) * Math.PI * 2);
  cash = Math.round(cash / 100_000) * 100_000;
  s.pending.push({ kind: 'funding', round: s.fundingRound, cash, dilution: round.dilution });
}

function checkCodex(s: GameState, m: Mods): void {
  const met = s.metrics;
  const maxU = Math.max(met.util.cpu, met.util.bw, met.util.db);
  const minU = Math.min(met.util.cpu, met.util.bw, met.util.db);
  if (maxU > 0.85) unlockCodex(s, 'queueing');
  if (maxU > 1 && minU < 0.4) unlockCodex(s, 'bottleneck');
  if (s.debt > 60) unlockCodex(s, 'debt');
  if (s.users > met.tam * 0.5) unlockCodex(s, 'logistic');
  if (met.revenueDay > met.costDay && s.day > 10) unlockCodex(s, 'unit-economics');
  if (s.monetization > 0.8) unlockCodex(s, 'pricing');
  if (m.flags.has('cache')) unlockCodex(s, 'caching');
}

/** Advance the simulation by one in-game day. */
export function tick(s: GameState): void {
  if (s.over || s.pending.length) return;
  const p = getProduct(s.productId);
  const d = getDifficulty(s.difficultyId);
  s.day += 1;
  const m = computeMods(s);
  autoscale(s, m);

  const downtime = Math.min(24, s.outageHours) / 24;
  s.outageHours = Math.max(0, s.outageHours - 24);
  const met = computeMetrics(s, m, downtime);
  s.metrics = met;
  const eff = met.effective;

  // Engineering output
  s.featurePts += eff.product * m.featureSpeed;
  let guard = 0;
  while (s.featurePts >= featureCost(s.featureLevel) && guard++ < 5) {
    s.featurePts -= featureCost(s.featureLevel);
    shipFeature(s, 8 * m.debtPerFeature);
  }
  s.rp += eff.rnd * 0.9 * m.researchSpeed;
  s.debt = Math.max(0, s.debt + 0.015 * totalEngineers(s) - eff.refactor * 0.6 * m.debtPaydown);

  const spawn = (0.1 + s.debt / 150) * (1 + Math.log10(Math.max(10, s.users)) / 3) * m.bugSpawn;
  const fixCap = (eff.sre * 0.7 + 0.3) * m.bugFix;
  const fixed = Math.min(s.bugs + spawn, fixCap);
  s.bugs = Math.max(0, s.bugs + spawn - fixCap);
  s.stats.bugsFixed += fixed;

  // Incidents
  const maxUtil = Math.max(met.util.cpu, met.util.bw, met.util.db);
  const pIncident = ((0.005 + s.debt / 9000 + Math.max(0, maxUtil - 0.9) * 0.15) * m.incidentChance * d.eventMult) / (1 + 0.12 * eff.sre);
  if (s.day > 10 && chance(s, pIncident)) {
    const hours = ((2 + rand(s) * 10) * (1 + s.debt / 120) * m.incidentDuration) / (1 + 0.08 * eff.sre);
    s.outageHours += hours;
    s.stats.incidents += 1;
    s.stats.maxDownHours = Math.max(s.stats.maxDownHours, hours);
    s.outageName = INCIDENTS[randInt(s, 0, INCIDENTS.length - 1)];
    log(s, `🔥 Incident: ${s.outageName} (~${Math.round(hours)}h)`, 'bad');
    unlockCodex(s, 'nines');
  }

  // Satisfaction
  s.sat += (met.satTarget - s.sat) * 0.08;
  if (downtime > 0) s.sat -= downtime * 10 * (0.5 + p.weights.reliability * 2);
  s.sat = clamp(s.sat, 0, 100);

  // Growth (logistic) + paid acquisition
  const tam = met.tam;
  const satF = clamp((s.sat - 40) / 50, -1, 1);
  // Bonuses compound under a square root so stacking growth perks has diminishing returns.
  const r = p.growth * d.growthMult * Math.sqrt(m.growth * (1 + 0.6 * s.hype)) * (1.15 - 0.6 * s.monetization);
  let dU: number;
  if (satF >= 0) dU = s.users * r * satF * (1 - s.users / tam) + 12 * satF * (1 + s.hype);
  else dU = s.users * 0.01 * satF;
  const spend = BASE.marketing[s.marketing] / 30;
  if (spend > 0) {
    const cac = (p.cac * m.cac * (1 + 4 * Math.pow(s.users / tam, 2))) / (0.5 + s.sat / 100);
    dU += (spend / cac) * (s.users < tam ? 1 : 0.2);
  }
  s.users = Math.max(0, s.users + dU);
  s.metrics.growthDay = dU;
  s.stats.peakUsers = Math.max(s.stats.peakUsers, s.users);

  // Money
  s.cash += met.revenueDay - met.costDay;
  s.stats.totalRevenue += met.revenueDay;

  s.hype = Math.max(0, s.hype * 0.97);
  for (const b of s.buffs) b.daysLeft -= 1;
  s.buffs = s.buffs.filter((b) => b.daysLeft > 0);
  for (const o of s.onboarding) o.days -= 1;
  s.onboarding = s.onboarding.filter((o) => o.days > 0);
  resolveContracts(s, m);

  s.uptimeWindow.push(1 - downtime);
  if (s.uptimeWindow.length > 30) s.uptimeWindow.shift();
  s.usersWindow.push(s.users);
  if (s.usersWindow.length > 31) s.usersWindow.shift();
  if (s.day % 3 === 0) {
    s.history.push(snapshot(s));
    if (s.history.length > 800) s.history.shift();
  }
  if (s.day % 4 === 0 || (downtime > 0 && chance(s, 0.5))) {
    s.tweets.unshift(makeTweet(s));
    if (s.tweets.length > 30) s.tweets.length = 30;
  }

  if (s.day % 30 === 0) {
    s.candidates = [makeStar(s, m.hireCost), makeStar(s, m.hireCost), makeStar(s, m.hireCost)];
  }
  checkCodex(s, m);

  if (s.cash < 0) {
    s.negativeCashDays += 1;
    if (s.day - s.lastBridgeDay > 365 && !getFounder(s.founderId).noVC) {
      s.lastBridgeDay = s.day;
      const cash = Math.round(Math.max(250_000, met.costDay * 30 * 4) / 10_000) * 10_000;
      s.pending.push({ kind: 'bridge', cash, dilution: 0.25 });
    }
    if (s.negativeCashDays === 1) log(s, '⚠️ You are out of cash! Cut costs or raise money within 30 days or the company dies.', 'bad');
    if (s.negativeCashDays > 30) {
      log(s, '💀 Bankrupt. The servers are being auctioned off.', 'bad');
      endGame(s, 'bankrupt');
      return;
    }
  } else {
    s.negativeCashDays = 0;
  }

  if (s.day % BASE.boardEvery === 0) {
    const cards = weightedSample(s, CARDS, 3, (c) => (c.weight ? c.weight(s) : 1) * (c.rarity === 'legendary' ? 0.25 : c.rarity === 'rare' ? 0.6 : 1));
    s.pending.push({ kind: 'board', cards: cards.map((c) => c.id) });
  }
  maybeEvent(s, m);
  maybeFunding(s);
  if (!s.ipoOffered && met.valuation >= IPO_THRESHOLD) {
    s.ipoOffered = true;
    s.pending.push({ kind: 'ipo' });
  }

  if (s.day >= BASE.totalDays) {
    refresh(s);
    endGame(s, 'time');
  }
}

const INCIDENTS = [
  'Memory leak in the image resizer',
  'Off-by-one in pagination',
  'Race condition in checkout',
  'Cache stampede',
  'Disk full of debug logs',
  'Expired API key',
  'Infinite retry loop',
  'Null pointer in the auth middleware',
  'Kafka consumer lag',
  'Deadlock in the payments table',
  'Regex catastrophic backtracking',
  'Timezone bug (it is always timezones)',
  'Unbounded query: SELECT * FROM events',
  'Garbage collector pause storm',
  'Config typo: replicas: 0',
  'Leap second confusion',
];
