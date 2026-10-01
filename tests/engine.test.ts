import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/content/cards';
import { EVENTS } from '../src/content/events';
import { PRODUCTS } from '../src/content/products';
import { REGIONS } from '../src/content/regions';
import { SKILLS } from '../src/content/skills';
import * as A from '../src/engine/actions';
import { newGame, tick } from '../src/engine/sim';
import type { RunConfig } from '../src/engine/types';
import { dailyConfig } from '../src/meta';
import { runBot } from './bot';

const cfg = (over: Partial<RunConfig> = {}): RunConfig => ({ productId: 'social', founderId: 'hacker', difficultyId: 'ologn', mutators: [], seed: 7, companyName: 'Test Co', ...over });

function advance(s: ReturnType<typeof newGame>, days: number) {
  for (let i = 0; i < days && !s.over; i++) {
    while (s.pending.length) {
      const p = s.pending[0];
      if (p.kind === 'board') A.pickCard(s, p.cards[0]);
      else if (p.kind === 'event') A.resolveEvent(s, 1);
      else if (p.kind === 'ipo') A.resolveIpo(s, false);
      else A.resolveFunding(s, false);
    }
    tick(s);
  }
}

describe('content integrity', () => {
  it('skill prerequisites and exclusions reference real skills', () => {
    const ids = new Set(SKILLS.map((s) => s.id));
    expect(ids.size).toBe(SKILLS.length);
    for (const n of SKILLS) {
      for (const r of n.requires) expect(ids, `${n.id} requires ${r}`).toContain(r);
      for (const x of n.excludes ?? []) expect(ids, `${n.id} excludes ${x}`).toContain(x);
    }
  });

  it('region requirements reference real skills', () => {
    const ids = new Set(SKILLS.map((s) => s.id));
    for (const r of REGIONS) for (const k of r.requires) expect(ids).toContain(k);
  });

  it('event and card ids are unique', () => {
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
  });

  it('product satisfaction weights sum to 1', () => {
    for (const p of PRODUCTS) {
      const w = p.weights;
      expect(w.latency + w.reliability + w.features + w.bugs + w.price).toBeCloseTo(1, 5);
    }
  });
});

describe('simulation', () => {
  it('is deterministic for a given seed', () => {
    const a = newGame(cfg());
    const b = newGame(cfg());
    advance(a, 300);
    advance(b, 300);
    expect(a.users).toBe(b.users);
    expect(a.cash).toBe(b.cash);
    expect(a.log.map((l) => l.text)).toEqual(b.log.map((l) => l.text));
  });

  it('daily challenge config is stable per date', () => {
    expect(dailyConfig('2026-10-01')).toEqual(dailyConfig('2026-10-01'));
    expect(dailyConfig('2026-10-01').seed).not.toBe(dailyConfig('2026-10-02').seed);
  });

  it('overloaded layers increase latency and drop requests', () => {
    const s = newGame(cfg());
    s.users = 200_000;
    A.setInfra(s, 'servers', 1);
    expect(s.metrics.util.cpu).toBeGreaterThan(1);
    expect(s.metrics.dropRate).toBeGreaterThan(0.5);
    const slow = s.metrics.latency;
    A.setInfra(s, 'servers', 2000);
    A.setInfra(s, 'bandwidth', 2000);
    A.setInfra(s, 'dbNodes', 2000);
    expect(s.metrics.dropRate).toBe(0);
    expect(s.metrics.latency).toBeLessThan(slow);
  });

  it('research spends RP and applies effects', () => {
    const s = newGame(cfg());
    s.users = 50_000;
    A.setInfra(s, 'servers', 50);
    const before = s.metrics.cpuDemand;
    s.rp = 100;
    expect(A.research(s, 'binary-search')).toBe(true);
    expect(s.rp).toBe(75);
    expect(s.metrics.cpuDemand).toBeCloseTo(before * 0.85, 5);
    expect(A.research(s, 'ternary')).toBe(false);
  });

  it('rival techs exclude each other', () => {
    const s = newGame(cfg());
    s.rp = 10_000;
    for (const id of ['agile', 'monolith']) expect(A.research(s, id)).toBe(true);
    expect(A.canResearch(s, 'microservices')).toBe(false);
  });

  it('funding dilutes equity and adds cash', () => {
    const s = newGame(cfg());
    s.pending.push({ kind: 'funding', round: 0, cash: 2_000_000, dilution: 0.2 });
    const cash = s.cash;
    A.resolveFunding(s, true);
    expect(s.equity).toBeCloseTo(0.9 * 0.8);
    expect(s.cash).toBe(cash + 2_000_000);
    expect(s.fundingRound).toBe(1);
  });

  it('goes bankrupt after 30 days without cash', () => {
    const s = newGame(cfg({ founderId: 'indie' }));
    s.cash = -1_000_000;
    advance(s, 40);
    expect(s.over?.reason).toBe('bankrupt');
  });

  it('hiring has ramp-up (Brooks)', () => {
    const s = newGame(cfg());
    const before = s.metrics.effective.product;
    A.hire(s, 'product', 3);
    expect(s.metrics.effective.product).toBeLessThan(before * 2.5);
    advance(s, 25);
    expect(s.onboarding.filter((o) => o.team === 'product').length).toBe(0);
  });

  it('regions require tech and raise TAM', () => {
    const s = newGame(cfg());
    s.cash = 1e9;
    expect(A.expand(s, 'latam')).toBe(false);
    s.skills.push('compression');
    const tam = s.metrics.tam;
    expect(A.expand(s, 'latam')).toBe(true);
    expect(s.metrics.tam).toBeGreaterThan(tam);
  });

  it('runs end at year 5 with a score', () => {
    const s = newGame(cfg());
    advance(s, 2000);
    expect(s.over).not.toBeNull();
  });
});

describe('balance guards', () => {
  it('a competent strategy can reach a $1B valuation on every product', () => {
    for (const p of PRODUCTS) {
      const s = runBot({ productId: p.id, seed: 2 });
      expect(s.over?.reason, p.id).not.toBe('bankrupt');
      expect(s.ipoOffered, p.id).toBe(true);
    }
  }, 60_000);

  it('doing nothing does not produce a unicorn', () => {
    for (const p of PRODUCTS) {
      const s = runBot({ productId: p.id, seed: 3 }, { skill: 'idle' });
      expect(s.ipoOffered, p.id).toBe(false);
    }
  }, 60_000);
});
