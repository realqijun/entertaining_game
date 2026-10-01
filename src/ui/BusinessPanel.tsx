import { getCard } from '../content/cards';
import { getFounder } from '../content/founders';
import { getProduct } from '../content/products';
import { REGIONS } from '../content/regions';
import { getSkill } from '../content/skills';
import { getDifficulty } from '../content/worlds';
import * as A from '../engine/actions';
import { BASE } from '../engine/helpers';
import { computeMods } from '../engine/mods';
import { FUNDING_ROUNDS } from '../engine/sim';
import type { GameState } from '../engine/types';
import { money, ms, num, pct } from './format';
import { Tip } from './Tip';

type Act = <T>(fn: (s: GameState) => T) => T;

const MKT_LABELS = ['Off', '$5k', '$20k', '$60k', '$150k', '$400k'];

export function BusinessPanel({ s, act }: { s: GameState; act: Act }) {
  const m = s.metrics;
  const p = getProduct(s.productId);
  const founder = getFounder(s.founderId);
  const mods = computeMods(s);
  const arpu = p.arpu * mods.arpu * getDifficulty(s.difficultyId).arpuMult * (0.2 + 1.6 * s.monetization);
  const nextRound = FUNDING_ROUNDS[s.fundingRound];
  const cac = (p.cac * mods.cac * (1 + 4 * Math.pow(s.users / m.tam, 2))) / (0.5 + s.sat / 100);
  const costs = m.costs;
  const costRows: [string, number][] = [
    ['👩‍💻 Salaries', costs.salary * 30],
    ['🖥️ Servers', costs.servers * 30],
    ['🌐 Bandwidth', costs.bandwidth * 30],
    ['🗄️ Database', costs.db * 30],
    ['📣 Marketing', costs.marketing * 30],
  ];
  const totalCost = m.costDay * 30;
  return (
    <div className="business">
      <div className="panel-title">💵 Pricing <Tip text="Price elasticity: higher prices raise revenue per user but slow growth and lower happiness. Find the sweet spot for your product." /></div>
      <input type="range" min={0} max={100} value={Math.round(s.monetization * 100)} onChange={(e) => act((st) => A.setMonetization(st, Number(e.target.value) / 100))} aria-label="Monetization" />
      <div className="range-labels"><span>Free 🎁</span><span>{pct(s.monetization)} · {money(arpu, 2)}/user/mo</span><span>Premium 💎</span></div>

      <div className="panel-title">📣 Marketing <Tip text={`Paid acquisition brings users at about ${money(cac, 2)} each. That cost rises as you saturate your market and falls when users are happy.`} /></div>
      <div className="seg">
        {BASE.marketing.map((v, i) => (
          <button key={v} className={`btn sm ${s.marketing === i ? 'active' : ''}`} onClick={() => act((st) => A.setMarketing(st, i))} title={`${money(v)}/mo`}>{MKT_LABELS[i]}</button>
        ))}
      </div>
      <div className="muted small">≈ {num(s.marketing ? BASE.marketing[s.marketing] / cac : 0)} new users/mo at {money(cac, 2)} each</div>

      <div className="panel-title">🧾 Monthly P&amp;L</div>
      <div className="pnl">
        <div className="pnl-row good"><span>Revenue</span><b>{money(m.revenueDay * 30)}</b></div>
        {costRows.map(([label, v]) => (
          <div className="pnl-row" key={label}>
            <span>{label}</span>
            <span className="pnl-bar"><i style={{ width: `${totalCost ? (v / totalCost) * 100 : 0}%` }} /></span>
            <b>{money(v)}</b>
          </div>
        ))}
        <div className={`pnl-row total ${m.revenueDay >= m.costDay ? 'good' : 'bad'}`}><span>Profit</span><b>{money((m.revenueDay - m.costDay) * 30)}</b></div>
        <div className="muted small">Infra cost per user: {money(((costs.servers + costs.bandwidth + costs.db) * 30) / Math.max(1, s.users), 3)}/mo · revenue per user {money((m.revenueDay * 30) / Math.max(1, s.users), 2)}/mo</div>
      </div>

      <div className="panel-title">🏦 Funding</div>
      {founder.noVC ? (
        <div className="muted small">🏕️ Bootstrapped: no VCs, 100% yours.</div>
      ) : nextRound ? (
        <div className="small">Next: <b>{nextRound.name}</b> at {num(p.tam * nextRound.tamFrac)} users (~{pct(nextRound.dilution)} dilution)</div>
      ) : (
        <div className="small muted">All rounds raised. Next stop: IPO at a {money(1e9)} valuation.</div>
      )}
      {s.stats.rounds.length > 0 && <div className="muted small">Raised: {s.stats.rounds.join(' → ')}</div>}

      {s.contracts.length > 0 && (
        <>
          <div className="panel-title">📜 Contracts</div>
          {s.contracts.map((c) => {
            const prog = c.kind === 'users' ? `${num(s.users)} / ${num(c.target)}` : c.kind === 'uptime' ? `${pct(c.track.days ? c.track.upSum / c.track.days : 1, 2)} vs ${pct(c.target, 1)}` : c.kind === 'latency' ? `${ms(c.track.days ? c.track.latSum / c.track.days : m.latency)} vs ${ms(c.target)}` : '';
            return (
              <div className="contract" key={c.id + c.daysLeft}>
                <b>{c.name}</b> <span className="muted small">· {c.daysLeft}d left</span>
                <div className="small">{prog} · reward {money(c.reward)}</div>
              </div>
            );
          })}
        </>
      )}

      {(s.buffs.length > 0 || s.perks.length > 0) && (
        <>
          <div className="panel-title">🎴 Active effects</div>
          <div className="chips">
            {s.buffs.map((b) => <span key={b.id} className={`chip ${b.good ? 'good' : 'bad'}`} title={`${b.daysLeft} days left`}>{b.emoji} {b.name} · {b.daysLeft}d</span>)}
            {s.perks.map((id, i) => { const c = getCard(id); return c ? <span key={id + i} className="chip" title={c.desc(s)}>{c.emoji} {c.name}</span> : null; })}
          </div>
        </>
      )}
    </div>
  );
}

export function ExpansionPanel({ s, act }: { s: GameState; act: Act }) {
  return (
    <div className="expansion">
      <div className="panel-title">🌐 Global expansion <Tip text="Each region grows your addressable market (TAM), but your tech stack must be ready to serve it first." /></div>
      <div className="regions">
        {REGIONS.map((r) => {
          const owned = s.regions.includes(r.id);
          const cost = A.regionCost(s, r.id);
          const missing = r.requires.filter((k) => !s.skills.includes(k));
          return (
            <div key={r.id} className={`region ${owned ? 'owned' : ''}`}>
              <div className="region-head"><span className="region-emoji">{r.emoji}</span><b>{r.name}</b><span className="chip good">+{pct(r.tam)} TAM</span></div>
              <div className="muted small">{r.why}</div>
              <div className="reqs">
                {r.requires.map((k) => (
                  <span key={k} className={`req ${s.skills.includes(k) ? 'ok' : 'no'}`}>{s.skills.includes(k) ? '✔' : '✘'} {getSkill(k)?.name}</span>
                ))}
              </div>
              {owned ? (
                <div className="good small">✅ Live</div>
              ) : (
                <button className="btn sm primary" disabled={!A.canExpand(s, r.id)} onClick={() => act((st) => A.expand(st, r.id))}>
                  {missing.length ? `Needs ${missing.length} tech` : `Launch · ${money(cost)}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
