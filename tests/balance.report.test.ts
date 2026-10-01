import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { PRODUCTS } from '../src/content/products';
import { runBot } from './bot';

it.skipIf(!process.env.BALANCE)('balance report', () => {
  const rows: string[] = [];
  for (const p of PRODUCTS) {
    for (const seed of [1, 2, 3]) {
      for (const skill of ['smart', 'idle'] as const) {
        const s = runBot({ productId: p.id, seed, founderId: process.env.FOUNDER ?? 'hacker', difficultyId: process.env.DIFF ?? 'ologn' }, { skill });
        const o = s.over!;
        rows.push(
          [p.id.padEnd(8), skill.padEnd(5), `seed${seed}`, o.reason.padEnd(8), `d${s.day}`.padEnd(6), `users ${(s.users / 1e3).toFixed(0)}k`.padEnd(13), `val $${(o.valuation / 1e6).toFixed(1)}M`.padEnd(14), `eq ${(o.equity * 100).toFixed(0)}%`, `score $${(o.score / 1e6).toFixed(1)}M`.padEnd(16), `sat ${s.sat.toFixed(0)}`, `eng ${s.teams.product + s.teams.rnd + s.teams.sre + s.teams.refactor}`, `skills ${s.skills.length}`, `feat ${s.featureLevel}`, `debt ${s.debt.toFixed(0)}`, `bugs ${s.bugs.toFixed(0)}`, `lat ${s.metrics.latency.toFixed(0)}`, `inc ${s.stats.incidents}`, `rounds ${s.stats.rounds.join('/')}`].join(' '),
        );
      }
    }
  }
  writeFileSync(process.env.BALANCE_OUT ?? 'balance.txt', rows.join('\n'));
}, 120_000);
