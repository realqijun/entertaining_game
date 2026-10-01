import { useState } from 'react';
import { getTrait } from '../content/people';
import * as A from '../engine/actions';
import { BASE, totalEngineers } from '../engine/helpers';
import { computeMods } from '../engine/mods';
import { featureCost } from '../engine/sim';
import { TEAMS, type GameState, type TeamId } from '../engine/types';
import { money, num } from './format';
import { Tip } from './Tip';

type Act = <T>(fn: (s: GameState) => T) => T;

export const TEAM_INFO: Record<TeamId, { name: string; emoji: string; job: string }> = {
  product: { name: 'Product', emoji: '✨', job: 'Ships features. Features grow your market and keep users happy, but add tech debt.' },
  sre: { name: 'SRE', emoji: '🛡️', job: 'Fixes bugs and shortens outages.' },
  rnd: { name: 'R&D', emoji: '🔬', job: 'Generates research points (RP) for the tech tree.' },
  refactor: { name: 'Refactor', emoji: '🧹', job: 'Pays down tech debt. Debt slows every team and breeds bugs.' },
};

export function TeamPanel({ s, act }: { s: GameState; act: Act }) {
  const [moveFrom, setMoveFrom] = useState<TeamId | null>(null);
  const m = s.metrics;
  const mods = computeMods(s);
  const eff = m.effective;
  const recruit = A.recruitCost(s);
  const salary = BASE.salary * mods.salary;
  const output: Record<TeamId, string> = {
    product: `${(eff.product * mods.featureSpeed).toFixed(1)} pts/day · next feature ${Math.round((s.featurePts / featureCost(s.featureLevel)) * 100)}%`,
    sre: `fixes ${((eff.sre * 0.7 + 0.3) * mods.bugFix).toFixed(1)} bugs/day`,
    rnd: `${(eff.rnd * 0.9 * mods.researchSpeed).toFixed(1)} RP/day`,
    refactor: `−${(eff.refactor * 0.6 * mods.debtPaydown).toFixed(1)} debt/day`,
  };
  const exp = Math.min(1, 0.8 + mods.brooks);
  return (
    <div className="team-panel">
      <div className="panel-title">
        Engineering · {totalEngineers(s)} people
        <Tip text={`Brooks's Law: team output grows like n^${exp.toFixed(2)}, so doubling a team gives ${Math.pow(2, exp).toFixed(2)}× the work. New hires need 20 days to ramp up. Moving people costs 7 days of context switching.`} />
      </div>
      <div className="debt-row">
        <span title="Tech debt drags every team's productivity">🧱 Tech debt <b className={s.debt > 100 ? 'bad' : s.debt > 50 ? 'warn' : ''}>{Math.round(s.debt)}</b> → productivity ×{m.debtDrag.toFixed(2)}</span>
        <span>🐛 <b className={s.bugs > 40 ? 'bad' : ''}>{Math.round(s.bugs)}</b> bugs</span>
      </div>
      <div className="teams">
        {TEAMS.map((t) => {
          const stars = s.stars.filter((x) => x.team === t);
          const ramping = s.onboarding.filter((o) => o.team === t).length;
          return (
            <div key={t} className={`team ${moveFrom && moveFrom !== t ? 'drop-target' : ''}`} onClick={() => {
              if (moveFrom && moveFrom !== t) { act((st) => A.moveEngineer(st, moveFrom, t)); setMoveFrom(null); }
            }}>
              <div className="team-head">
                <span>{TEAM_INFO[t].emoji} {TEAM_INFO[t].name}</span>
                <span className="team-count">{s.teams[t]}{stars.length ? `+${stars.length}★` : ''}</span>
              </div>
              <div className="team-job muted">{TEAM_INFO[t].job}</div>
              <div className="team-out">{output[t]}{ramping ? <span className="muted"> · {ramping} ramping</span> : null}</div>
              <div className="team-actions">
                <button className="btn sm" onClick={(e) => { e.stopPropagation(); act((st) => A.hire(st, t)); }} disabled={s.cash < recruit} title={`Hire: ${money(recruit)} recruiting fee + ${money(salary)}/mo`}>+ Hire</button>
                <button className="btn sm ghost" onClick={(e) => { e.stopPropagation(); setMoveFrom(moveFrom === t ? null : t); }} disabled={s.teams[t] <= 0} title="Move one engineer to another team">
                  {moveFrom === t ? 'Cancel' : '⇄ Move'}
                </button>
                <button className="btn sm ghost danger" onClick={(e) => { e.stopPropagation(); act((st) => A.fire(st, t)); }} disabled={s.teams[t] <= 0} title={`Let go (1 month severance: ${money(salary)})`}>−</button>
              </div>
              {moveFrom && moveFrom !== t && <div className="drop-hint">Move here</div>}
            </div>
          );
        })}
      </div>
      <div className="hire-note muted">Recruiting {money(recruit)} · salary {money(salary)}/mo per engineer</div>

      {s.stars.length > 0 && (
        <>
          <div className="subhead">🌟 Star engineers</div>
          <div className="stars">
            {s.stars.map((st) => {
              const tr = getTrait(st.trait);
              return (
                <div className="star" key={st.id}>
                  <div><b>{st.emoji} {st.name}</b> <span className="muted">· {tr.name}</span></div>
                  <div className="muted small">{tr.desc}</div>
                  <div className="star-row">
                    <select value={st.team} onChange={(e) => act((x) => A.moveStar(x, st.id, e.target.value as TeamId))} aria-label="Team">
                      {TEAMS.map((t) => <option key={t} value={t}>{TEAM_INFO[t].emoji} {TEAM_INFO[t].name}</option>)}
                    </select>
                    <span className="small">power {st.power} · {money(st.salary)}/mo</span>
                    <button className="btn sm ghost danger" onClick={() => act((x) => A.fireStar(x, st.id))}>Let go</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="subhead">📇 Candidates <span className="muted small">(new batch every 30 days)</span></div>
      <div className="stars">
        {s.candidates.length === 0 && <div className="muted small">No candidates right now.</div>}
        {s.candidates.map((st) => {
          const tr = getTrait(st.trait);
          return (
            <div className="star candidate" key={st.id}>
              <div><b>{st.emoji} {st.name}</b> <span className="muted">· {tr.name}</span></div>
              <div className="muted small">{tr.desc}</div>
              <div className="star-row">
                <span className="small">→ {TEAM_INFO[st.team].emoji} {TEAM_INFO[st.team].name} · power {st.power} · {money(st.salary)}/mo</span>
                <button className="btn sm primary" disabled={s.cash < st.signing} onClick={() => act((x) => A.hireStar(x, st.id))}>Hire ({money(st.signing)})</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="muted small">Effective output per team = (engineers + star power − ramp-up)^{exp.toFixed(2)} × productivity {num(mods.productivity, 2)} × debt drag.</div>
    </div>
  );
}
