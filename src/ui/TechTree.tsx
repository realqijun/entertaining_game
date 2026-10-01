import { useMemo, useState } from 'react';
import { questionsFor, type QuizQuestion } from '../content/quiz';
import { BRANCHES, SKILLS, getSkill, skillStatus } from '../content/skills';
import * as A from '../engine/actions';
import { computeMods } from '../engine/mods';
import type { GameState, ModKey, SkillNode } from '../engine/types';
import { sfx } from './sfx';

type Act = <T>(fn: (s: GameState) => T) => T;

const STATUS_ICON = { owned: '✅', available: '🔓', locked: '🔒', excluded: '⛔' } as const;

export function TechTree({ s, act, onClose }: { s: GameState; act: Act; onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<{ node: SkillNode; q: QuizQuestion } | null>(null);
  const node = selected ? getSkill(selected) : null;
  const tiers = [1, 2, 3, 4, 5];
  const scholar = computeMods(s).flags.has('scholar');

  const doResearch = (n: SkillNode) => {
    const ok = act((st) => A.research(st, n.id));
    if (!ok) return;
    const pool = questionsFor(n.quizTag);
    setQuiz({ node: n, q: pool[Math.floor(Math.random() * pool.length)] });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="techtree" onClick={(e) => e.stopPropagation()}>
        <div className="tt-head">
          <h2>🌳 Tech Tree</h2>
          <div className="rp">🔬 <b>{Math.floor(s.rp)}</b> RP <span className="muted">(+{(s.metrics.effective.rnd * 0.9 * computeMods(s).researchSpeed).toFixed(1)}/day)</span></div>
          <div className="muted small">🧠 Quiz after each = {scholar ? '50' : '25'}% refund</div>
          <button className="btn sm" onClick={onClose} aria-label="Close tech tree">✕</button>
        </div>
        <div className="tt-body">
          <div className="tt-grid">
            {BRANCHES.map((b) => (
              <div className="tt-col" key={b.id}>
                <div className="tt-branch" style={{ borderColor: b.color }}>
                  <span>{b.emoji} {b.name}</span>
                  <span className="muted small">{b.desc}</span>
                </div>
                {tiers.map((t) => (
                  <div className="tt-tier" key={t}>
                    {SKILLS.filter((n) => n.branch === b.id && n.tier === t).map((n) => {
                      const st = skillStatus(s.skills, n);
                      const affordable = st === 'available' && s.rp >= n.cost;
                      const isReq = node?.requires.includes(n.id);
                      return (
                        <button
                          key={n.id}
                          className={`tt-node ${st} ${affordable ? 'affordable' : ''} ${selected === n.id ? 'selected' : ''} ${isReq ? 'is-req' : ''}`}
                          style={{ ['--branch' as string]: b.color }}
                          onClick={() => setSelected(n.id)}
                        >
                          <span className="tt-name">{STATUS_ICON[st]} {n.name}</span>
                          <span className="tt-cost">{st === 'owned' ? 'owned' : `${n.cost} RP`}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <aside className="tt-detail">
            {node ? (
              <NodeDetail s={s} node={node} onResearch={doResearch} />
            ) : (
              <div className="muted">
                <p>👈 Pick a tech</p>
              </div>
            )}
          </aside>
        </div>
        {quiz && (
          <QuizModal
            q={quiz.q}
            node={quiz.node}
            scholar={scholar}
            onDone={(correct) => {
              if (correct !== null) act((st) => A.quizResult(st, quiz.node.id, correct));
              setQuiz(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

const MOD_LABELS: Partial<Record<ModKey, [string, boolean]>> = {
  cpuPerReq: ['CPU per request', false],
  serverPower: ['Server power', true],
  dbCapacity: ['DB capacity', true],
  dbPerReq: ['DB queries per request', false],
  payload: ['Payload size', false],
  serverCost: ['Server cost', false],
  bandwidthCost: ['Bandwidth cost', false],
  featureSpeed: ['Feature speed', true],
  researchSpeed: ['Research speed', true],
  bugSpawn: ['Bug rate', false],
  bugFix: ['Bug fixing', true],
  debtPerFeature: ['Debt per feature', false],
  incidentChance: ['Incident chance', false],
  incidentDuration: ['Incident duration', false],
  growth: ['Growth', true],
  arpu: ['Revenue per user', true],
  serviceTime: ['Service latency', false],
  errorMult: ['Visible errors', false],
  productivity: ['Productivity', true],
  salary: ['Salaries', false],
  hireCost: ['Recruiting cost', false],
  cac: ['Marketing cost per user', false],
  cacheHit: ['Cache hit rate', true],
  cdnOffload: ['CDN offload', true],
  brooks: ['Team scaling exponent', true],
  satBonus: ['Happiness', true],
  hypeGain: ['Hype gain', true],
};

function NodeDetail({ s, node, onResearch }: { s: GameState; node: SkillNode; onResearch: (n: SkillNode) => void }) {
  const st = skillStatus(s.skills, node);
  const effects = useMemo(
    () =>
      Object.entries(node.effect.mods ?? {}).map(([k, v]) => {
        const lab = MOD_LABELS[k as ModKey];
        if (!lab) return null;
        const additive = ['cacheHit', 'cdnOffload', 'brooks', 'satBonus', 'hypeGain'].includes(k);
        const sign = v > 0 ? '+' : '';
        let text = `×${v}`;
        if (k === 'satBonus' || k === 'brooks') text = `${sign}${v}`;
        else if (additive) text = `${sign}${Math.round(v * 100)}%`;
        const good = additive ? v > 0 === lab[1] : v > 1 === lab[1];
        return <li key={k} className={good ? 'good' : 'bad'}>{lab[0]} {text}</li>;
      }),
    [node],
  );
  return (
    <div>
      <h3>{node.name}</h3>
      <div className="muted small">Tier {node.tier} · {node.cost} RP</div>
      <p>{node.desc}</p>
      <ul className="effects">{effects}</ul>
      <details className="lesson"><summary>📚 Learn the CS</summary><p>{node.lesson}</p></details>
      {node.requires.length > 0 && <div className="small">Requires: {node.requires.map((r) => `${s.skills.includes(r) ? '✔' : '✘'} ${getSkill(r)?.name}`).join(', ')}</div>}
      {node.excludes && <div className="small warn">Rival of: {node.excludes.map((r) => getSkill(r)?.name).join(', ')}. You can only pick one.</div>}
      {st === 'owned' ? (
        <div className="good">✅ Researched</div>
      ) : st === 'excluded' ? (
        <div className="bad">⛔ Locked out by your earlier choice.</div>
      ) : (
        <button className="btn primary wide" disabled={st !== 'available' || s.rp < node.cost} onClick={() => onResearch(node)}>
          {st === 'locked' ? '🔒 Prerequisites missing' : s.rp < node.cost ? `Need ${Math.ceil(node.cost - s.rp)} more RP` : `Research (${node.cost} RP)`}
        </button>
      )}
    </div>
  );
}

function QuizModal({ q, node, scholar, onDone }: { q: QuizQuestion; node: SkillNode; scholar: boolean; onDone: (correct: boolean | null) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const refund = Math.round(node.cost * (scholar ? 0.5 : 0.25));
  return (
    <div className="overlay inner">
      <div className="modal quiz">
        <div className="modal-emoji">🧠</div>
        <h3>Prove it! <span className="muted small">+{refund} RP if correct</span></h3>
        <p className="quiz-q">{q.q}</p>
        <div className="quiz-options">
          {q.options.map((o, i) => (
            <button
              key={o}
              className={`btn quiz-opt ${picked !== null ? (i === q.answer ? 'right' : i === picked ? 'wrong' : '') : ''}`}
              disabled={picked !== null}
              onClick={() => { setPicked(i); if (i === q.answer) sfx.correct(); else sfx.wrong(); }}
            >
              {o}
            </button>
          ))}
        </div>
        {picked !== null && (
          <div className={`quiz-result ${picked === q.answer ? 'good' : 'bad'}`}>
            <b>{picked === q.answer ? `✅ Correct! +${refund} RP` : '❌ Not quite.'}</b>
            <p>{q.explain}</p>
          </div>
        )}
        <div className="modal-actions">
          {picked === null ? (
            <button className="btn ghost" onClick={() => onDone(null)}>Skip</button>
          ) : (
            <button className="btn primary" onClick={() => onDone(picked === q.answer)}>Continue</button>
          )}
        </div>
      </div>
    </div>
  );
}
