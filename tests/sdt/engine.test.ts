import { describe, expect, it } from 'vitest';
import { BAL } from '../../src/sdt/content/balance';
import { TECH } from '../../src/sdt/content/tech';
import * as A from '../../src/sdt/engine/actions';
import { postmortem } from '../../src/sdt/engine/postmortem';
import { advanceDay, computeMetrics, liveStep, newGame } from '../../src/sdt/engine/sim';
import type { GameState } from '../../src/sdt/engine/types';
import { runBot } from './bot';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function toDay(s: GameState, day: number) {
  while (s.day < day && s.mode === 'day' && !s.over) {
    while (s.pending.length) A.resolvePending(s);
    advanceDay(s);
  }
}

describe('pipeline model', () => {
  it('reproduces the worked example from the proposal (§7.4)', () => {
    const s = newGame(1);
    s.tech.push('cache');
    s.cache = { on: true, tuned: false, warm: 1 };
    const m = computeMetrics(s, { demand: 900, read: 0.8, cacheable: 1, cause: null }, false);
    expect(m.dbOps).toBeCloseTo(900 * (1 - 0.8 * 0.6), 5); // 468
    expect(m.dbUtil).toBeLessThan(1);
    s.cache.on = false;
    const cold = computeMetrics(s, { demand: 900, read: 0.8, cacheable: 1, cause: null }, false);
    expect(cold.dbUtil).toBeCloseTo(1.5, 5);
    expect(cold.bottleneck).toBe('db');
    expect(cold.overloaded).toBe(true);
  });

  it('adding app servers does not raise database capacity', () => {
    const s = newGame(1);
    const w = { demand: 900, read: 0.8, cacheable: 1, cause: null };
    const before = computeMetrics(s, w, false);
    s.lb = true;
    s.instances.push({ id: 9, size: 'L', status: 'up', timer: 0 });
    const after = computeMetrics(s, w, false);
    expect(after.appCap).toBeGreaterThan(before.appCap);
    expect(after.dbUtil).toBeCloseTo(before.dbUtil, 5);
    expect(after.overloaded).toBe(true);
  });

  it('traffic limiting trades rejected demand for a healthy system', () => {
    const s = newGame(1);
    s.limit = 0.6;
    const m = computeMetrics(s, { demand: 900, read: 0.8, cacheable: 1, cause: null }, false);
    expect(m.rejected).toBeCloseTo(360, 5);
    expect(m.overloaded).toBe(false);
    expect(m.errRate).toBe(0);
  });

  it('a load balancer without health checks keeps routing to dead instances', () => {
    const s = newGame(1);
    s.lb = true;
    s.instances.push({ id: 2, size: 'M', status: 'up', timer: 0 });
    s.instances[0].status = 'down';
    const w = { demand: 400, read: 0.8, cacheable: 1, cause: null };
    expect(computeMetrics(s, w, false).errRate).toBeCloseTo(0.5, 5);
    s.hc = true;
    expect(computeMetrics(s, w, false).errRate).toBe(0);
  });

  it('booting instances receive no traffic', () => {
    const s = newGame(1);
    s.lb = true;
    s.instances.push({ id: 2, size: 'M', status: 'booting', timer: 3 });
    expect(computeMetrics(s, { demand: 400, read: 0.8, cacheable: 1, cause: null }, false).downShare).toBe(0);
  });
});

describe('incidents', () => {
  it('the first incident is the same read-heavy spike on day 6 for every seed', () => {
    for (const seed of SEEDS) {
      const s = newGame(seed);
      toDay(s, 6);
      expect(s.day).toBe(6);
      expect(s.mode).toBe('live');
      expect(s.workload.cause).toBe('Meteor panic goes viral');
      expect(s.metrics.bottleneck).toBe('db');
    }
  });

  it('declares an overload only after sustained steps, then recovers after healthy steps', () => {
    const s = newGame(3);
    toDay(s, 6);
    for (let i = 1; i < BAL.overloadSteps; i++) liveStep(s);
    expect(s.incident).toBeNull();
    liveStep(s);
    expect(s.incident?.variant).toBe('db');

    expect(A.addInstance(s)).toBe('Research Scale out');
    expect(A.resizeInstance(s, 1, 'S')).toBeNull(); // wrong component, and it restarts the server
    expect(A.upgradeDb(s)).toBeNull();
    expect(A.setLimit(s, 0.4)).toBeNull(); // the small server now needs a tighter limit
    let n = 0;
    while (s.mode === 'live' && n++ < 60) liveStep(s);
    expect(s.mode).toBe('day');
    expect(s.pending[0]).toMatchObject({ kind: 'postmortem' });

    const inc = s.incidents[0];
    const pm = postmortem(inc);
    expect(pm.title).toBe('Database overload');
    expect(pm.cause).toContain('Meteor panic goes viral');
    expect(pm.worked.join(' ')).toContain('Upgraded database');
    expect(pm.didNot.join(' ')).toContain('Resized');
  });

  it('an untreated overload ends the run through lost reputation', () => {
    const s = newGame(2);
    toDay(s, 6);
    let n = 0;
    while (!s.over && n++ < 1000) liveStep(s);
    expect(s.over?.reason).toBe('reputation');
    expect(n).toBeGreaterThan(40); // a new player gets time to react
  });

  it('automatic failover restarts a crashed instance without the player', () => {
    const s = newGame(1);
    s.tech.push('lb', 'hc', 'spare', 'failover');
    s.lb = true;
    s.hc = true;
    s.instances.push({ id: 2, size: 'M', status: 'up', timer: 0 });
    s.mode = 'live';
    s.instances[0].status = 'down';
    for (let i = 0; i < 8; i++) liveStep(s);
    expect(s.instances.every((i) => i.status === 'up')).toBe(true);
    expect(s.incident).toBeNull();
  });
});

describe('progression', () => {
  it('tech ids are unique and prerequisites exist', () => {
    const ids = new Set(TECH.map((t) => t.id));
    expect(ids.size).toBe(9);
    for (const t of TECH) for (const r of t.requires) expect(ids).toContain(r);
  });

  it('reveals the tree a few nodes at a time', () => {
    const s = newGame(1);
    expect(A.visibleTech(s).length).toBeLessThanOrEqual(3);
    expect(A.canResearch(s, 'lb')).toBe('Locked');
    expect(A.research(s, 'cache')).toBeNull();
    expect(A.canResearch(s, 'scaleUp')).toBe('No research points');
  });

  it('game state survives a JSON round trip', () => {
    const s = runBot(4, 'reactive').s;
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it('is deterministic for a seed and action sequence', () => {
    const a = runBot(7, 'smart').s;
    const b = runBot(7, 'smart').s;
    expect(a.log).toEqual(b.log);
    expect(a.cash).toBe(b.cash);
  });
});

describe('balance guards', () => {
  it('a planning player and a reactive player both reach 1M users in time', () => {
    for (const seed of SEEDS) {
      for (const kind of ['smart', 'reactive'] as const) {
        const r = runBot(seed, kind);
        expect(r.reason, `${kind} seed ${seed}`).toBe('win');
        expect(r.day).toBeLessThanOrEqual(BAL.lastDay);
      }
    }
  });

  it('an idle player does not', () => {
    for (const seed of SEEDS) expect(runBot(seed, 'idle').reason).not.toBe('win');
  });
});
