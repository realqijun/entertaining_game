import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { runBot } from './bot';

it.skipIf(!process.env.TRACE)('trace report', () => {
  const rows: string[] = [];
  runBot({ productId: process.env.TRACE!, seed: Number(process.env.SEED ?? 1), founderId: process.env.FOUNDER ?? 'hacker' }, { skill: (process.env.SKILL as 'smart') ?? 'smart' }, (s) => {
    if (s.day % 60 !== 0) return;
    const m = s.metrics;
    rows.push([`d${s.day}`.padEnd(6), `u ${(s.users / 1e3).toFixed(1)}k`.padEnd(11), `tam ${(m.tam / 1e6).toFixed(1)}M`, `sat ${s.sat.toFixed(0)}`, `tgt ${m.satTarget.toFixed(0)}`, `parts L${m.satParts.latency.toFixed(0)} R${m.satParts.reliability.toFixed(0)} F${m.satParts.features.toFixed(0)} B${m.satParts.bugs.toFixed(0)}`, `cash $${(s.cash / 1e6).toFixed(2)}M`, `rev/mo $${(m.revenueDay * 30 / 1e3).toFixed(0)}k`, `cost/mo $${(m.costDay * 30 / 1e3).toFixed(0)}k`, `val $${(m.valuation / 1e6).toFixed(1)}M`, `eng ${s.teams.product}/${s.teams.rnd}/${s.teams.sre}/${s.teams.refactor}`, `srv ${s.servers} bw ${s.bandwidth} db ${s.dbNodes}`, `sk ${s.skills.length} f ${s.featureLevel} debt ${s.debt.toFixed(0)} bugs ${s.bugs.toFixed(0)} hype ${s.hype.toFixed(2)} mkt ${s.marketing}`].join(' '));
  });
  writeFileSync(process.env.BALANCE_OUT ?? 'trace.txt', rows.join('\n'));
}, 60_000);
