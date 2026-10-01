import { useState, type ReactElement } from 'react';
import { getCard } from '../content/cards';
import { getFounder } from '../content/founders';
import { getTrait } from '../content/people';
import { getProduct } from '../content/products';
import { REGIONS } from '../content/regions';
import { getSkill } from '../content/skills';
import { getDifficulty } from '../content/worlds';
import * as A from '../engine/actions';
import { BASE } from '../engine/helpers';
import { computeMods } from '../engine/mods';
import { FUNDING_ROUNDS, featureCost } from '../engine/sim';
import { TEAMS, type GameState, type TeamId } from '../engine/types';
import { Charts } from './Charts';
import { money, num, pct } from './format';
import { Broom, Bug, Flask, Shield, Spark } from './Icons';
import { sfx } from './sfx';

type Act = <T>(fn: (s: GameState) => T) => T;

const TEAM_UI: Record<TeamId, { name: string; icon: ReactElement; color: string }> = {
  product: { name: 'Product', icon: <Spark size={20} />, color: '#f472b6' },
  sre: { name: 'SRE', icon: <Shield size={20} />, color: '#fbbf24' },
  rnd: { name: 'R&D', icon: <Flask size={20} />, color: '#a78bfa' },
  refactor: { name: 'Refactor', icon: <Broom size={20} />, color: '#34d399' },
};

export function TeamDrawer({ s, act }: { s: GameState; act: Act }) {
  const [moving, setMoving] = useState<TeamId | null>(null);
  const m = s.metrics;
  const mods = computeMods(s);
  const eff = m.effective;
  const recruit = A.recruitCost(s);
  const out: Record<TeamId, string> = {
    product: `${Math.round((s.featurePts / featureCost(s.featureLevel)) * 100)}% → next feature`,
    sre: `${((eff.sre * 0.7 + 0.3) * mods.bugFix).toFixed(1)} bugs/day`,
    rnd: `${(eff.rnd * 0.9 * mods.researchSpeed).toFixed(1)} RP/day`,
    refactor: `−${(eff.refactor * 0.6 * mods.debtPaydown).toFixed(1)} debt/day`,
  };
  return (
    <div className="drawer-body">
      <div className="chips-row">
        <span className={`stat-chip ${s.debt > 80 ? 'bad' : ''}`} title="Tech debt slows everyone">🧱 Debt {Math.round(s.debt)} <em>×{m.debtDrag.toFixed(2)}</em></span>
        <span className={`stat-chip ${s.bugs > 30 ? 'bad' : ''}`}><Bug size={14} /> {Math.round(s.bugs)} bugs</span>
        <span className="stat-chip" title="Recruiting fee + monthly salary">💼 {money(recruit)} + {money(BASE.salary * mods.salary)}/mo</span>
      </div>
      {TEAMS.map((t) => {
        const ui = TEAM_UI[t];
        const stars = s.stars.filter((x) => x.team === t).length;
        const ramp = s.onboarding.filter((o) => o.team === t).length;
        return (
          <div key={t} className={`team-row ${moving && moving !== t ? 'target' : ''}`} style={{ ['--tc' as string]: ui.color }}
            onClick={() => { if (moving && moving !== t) { act((st) => A.moveEngineer(st, moving, t)); setMoving(null); sfx.click(); } }}>
            <div className="team-ic">{ui.icon}</div>
            <div className="team-mid">
              <b>{ui.name}</b>
              <span>{out[t]}{ramp ? ` · ${ramp}⏳` : ''}</span>
            </div>
            <div className="team-n">{s.teams[t]}{stars ? <sup>+{stars}★</sup> : null}</div>
            <div className="team-btns">
              <button onClick={(e) => { e.stopPropagation(); act((st) => A.fire(st, t)); sfx.sell(); }} disabled={s.teams[t] <= 0} title="Let go">−</button>
              <button onClick={(e) => { e.stopPropagation(); setMoving(moving === t ? null : t); }} disabled={s.teams[t] <= 0} className={moving === t ? 'on' : ''} title="Move one to another team">⇄</button>
              <button className="plus" onClick={(e) => { e.stopPropagation(); if (act((st) => A.hire(st, t))) sfx.buy(); }} disabled={s.cash < recruit} title="Hire">+</button>
            </div>
          </div>
        );
      })}
      {moving && <div className="hint">Tap a team to move one engineer there</div>}

      <h4>⭐ Recruits <small>refresh monthly</small></h4>
      <div className="cand-grid">
        {s.candidates.map((c) => {
          const tr = getTrait(c.trait);
          return (
            <button key={c.id} className="cand" disabled={s.cash < c.signing} onClick={() => { if (act((st) => A.hireStar(st, c.id))) sfx.fanfare(); }} title={tr.desc}>
              <span className="cand-emoji">{c.emoji}</span>
              <b>{c.name.split(' ')[0]}</b>
              <span className="cand-trait">{tr.name}</span>
              <span className="cand-meta">{TEAM_UI[c.team].name} · ⚡{c.power}</span>
              <span className="cand-cost">{money(c.signing)}</span>
            </button>
          );
        })}
        {!s.candidates.length && <div className="muted small">None this month</div>}
      </div>
      {s.stars.length > 0 && (
        <>
          <h4>🌟 Your stars</h4>
          <div className="star-list">
            {s.stars.map((st) => (
              <div key={st.id} className="star-chip" title={getTrait(st.trait).desc}>
                <span>{st.emoji} {st.name.split(' ')[0]}</span>
                <select value={st.team} onChange={(e) => act((x) => A.moveStar(x, st.id, e.target.value as TeamId))} aria-label="Team">
                  {TEAMS.map((t) => <option key={t} value={t}>{TEAM_UI[t].name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const MKT = ['Off', '5k', '20k', '60k', '150k', '400k'];

export function MoneyDrawer({ s, act }: { s: GameState; act: Act }) {
  const m = s.metrics;
  const p = getProduct(s.productId);
  const mods = computeMods(s);
  const arpu = p.arpu * mods.arpu * getDifficulty(s.difficultyId).arpuMult * (0.2 + 1.6 * s.monetization);
  const round = FUNDING_ROUNDS[s.fundingRound];
  const c = m.costs;
  const rows: [string, number, string][] = [
    ['👩‍💻', c.salary * 30, '#f472b6'],
    ['🖥️', c.servers * 30, '#22d3ee'],
    ['📡', c.bandwidth * 30, '#60a5fa'],
    ['🗄️', c.db * 30, '#34d399'],
    ['📣', c.marketing * 30, '#fbbf24'],
  ];
  const total = Math.max(1, m.costDay * 30);
  return (
    <div className="drawer-body">
      <div className="pnl-big">
        <div><span>Revenue</span><b className="good">{money(m.revenueDay * 30)}</b></div>
        <div><span>Costs</span><b className="bad">{money(m.costDay * 30)}</b></div>
        <div><span>Profit</span><b className={m.revenueDay >= m.costDay ? 'good' : 'bad'}>{money((m.revenueDay - m.costDay) * 30)}</b></div>
      </div>
      <div className="stack-bar">
        {rows.map(([ic, v, col]) => v > 0 && <i key={ic} style={{ width: `${(v / total) * 100}%`, background: col }} title={`${ic} ${money(v)}/mo`}>{v / total > 0.12 ? ic : ''}</i>)}
      </div>

      <h4>🏷️ Price <small>{money(arpu, 2)}/user</small></h4>
      <input type="range" min={0} max={100} value={Math.round(s.monetization * 100)} onChange={(e) => act((st) => A.setMonetization(st, Number(e.target.value) / 100))} aria-label="Price" />
      <div className="range-ends"><span>🎁 grow</span><span>💎 earn</span></div>

      <h4>📣 Ads <small>per month</small></h4>
      <div className="seg">
        {MKT.map((l, i) => <button key={l} className={s.marketing === i ? 'on' : ''} onClick={() => { act((st) => A.setMarketing(st, i)); sfx.click(); }}>{l}</button>)}
      </div>

      <h4>🏦 Funding</h4>
      <div className="small">
        {getFounder(s.founderId).noVC ? '🏕️ Bootstrapped: 100% yours' : round ? <>Next <b>{round.name}</b> at <b>{num(p.tam * round.tamFrac)}</b> users</> : 'All rounds raised. Aim for the IPO!'}
      </div>

      {(s.contracts.length > 0 || s.buffs.length > 0 || s.perks.length > 0) && (
        <>
          <h4>🎴 Active</h4>
          <div className="chips-row">
            {s.contracts.map((ct) => <span key={ct.id + ct.daysLeft} className="stat-chip">📜 {ct.name} · {ct.daysLeft}d</span>)}
            {s.buffs.map((b) => <span key={b.id} className={`stat-chip ${b.good ? 'goodc' : 'bad'}`}>{b.emoji} {b.name} · {b.daysLeft}d</span>)}
            {s.perks.map((id, i) => { const cd = getCard(id); return cd ? <span key={id + i} className="stat-chip" title={cd.desc(s)}>{cd.emoji} {cd.name}</span> : null; })}
          </div>
        </>
      )}
      <h4>📈 History</h4>
      <Charts s={s} />
    </div>
  );
}

export function WorldDrawer({ s, act }: { s: GameState; act: Act }) {
  return (
    <div className="drawer-body">
      <div className="small muted">Bigger market = more users. Each region needs certain tech.</div>
      <div className="region-grid">
        {REGIONS.map((r) => {
          const owned = s.regions.includes(r.id);
          const cost = A.regionCost(s, r.id);
          return (
            <div key={r.id} className={`region-tile ${owned ? 'owned' : ''}`} title={r.why}>
              <div className="region-top"><span className="region-em">{r.emoji}</span><b>{r.name}</b><em>+{pct(r.tam)}</em></div>
              <div className="reqs">
                {r.requires.map((k) => <span key={k} className={s.skills.includes(k) ? 'ok' : 'no'}>{s.skills.includes(k) ? '✓' : '✗'} {getSkill(k)?.name}</span>)}
              </div>
              {owned ? <div className="good small">✅ Live</div> : (
                <button className="btn sm primary" disabled={!A.canExpand(s, r.id)} onClick={() => { if (act((st) => A.expand(st, r.id))) sfx.fanfare(); }}>Launch {money(cost)}</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
