import { useEffect, useRef, useState } from 'react';
import { getProduct } from '../content/products';
import { computeMods } from '../engine/mods';
import type { GameState } from '../engine/types';
import { recordRun, type Meta, type RunResult } from '../meta';
import { BusinessPanel, ExpansionPanel } from './BusinessPanel';
import { Charts } from './Charts';
import { Confetti } from './Confetti';
import { CodexView, LogPanel, Toasts, TweetFeed } from './Feeds';
import { GameOver } from './GameOver';
import { InfraPanel } from './InfraPanel';
import { PendingModal } from './Modals';
import { Pipeline } from './Pipeline';
import { SatPanel } from './SatPanel';
import { TeamPanel } from './TeamPanel';
import { TechTree } from './TechTree';
import { TopBar } from './TopBar';
import { Tutorial } from './Tutorial';
import { useGame } from './useGame';

type Tab = 'team' | 'biz' | 'world' | 'codex' | 'log';

interface Props {
  initial: GameState;
  meta: Meta;
  onMeta: (m: Meta) => void;
  onMenu: () => void;
  onAgain: () => void;
}

export function Game({ initial, meta, onMeta, onMenu, onAgain }: Props) {
  const { s, speed, setSpeed, act } = useGame(initial);
  const [tab, setTab] = useState<Tab>('team');
  const [tree, setTree] = useState(false);
  const [shake, setShake] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [tutorial, setTutorial] = useState(!meta.tutorialDone);
  const [result, setResult] = useState<RunResult | null>(null);
  const prevSpeed = useRef(1);
  const milestones = useRef({ rounds: s.stats.rounds.length, regions: s.regions.length, ipo: s.ipoOffered, features: s.featureLevel });

  // Pause while overlays that need attention are open.
  const blocking = tree || tutorial || s.pending.length > 0 || !!s.over;
  useEffect(() => {
    if (blocking && speed !== 0) {
      prevSpeed.current = speed;
      setSpeed(0);
    } else if (!blocking && speed === 0 && prevSpeed.current) {
      setSpeed(prevSpeed.current);
      prevSpeed.current = 0;
    }
  }, [blocking, speed, setSpeed]);

  const changeSpeed = (n: number) => {
    prevSpeed.current = 0;
    setSpeed(n);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (tutorial) return;
      if (e.key === ' ') { e.preventDefault(); if (!blocking) changeSpeed(speed === 0 ? 1 : 0); }
      else if (['1', '2', '3'].includes(e.key) && !blocking) changeSpeed(Number(e.key));
      else if (e.key.toLowerCase() === 't' && !s.over && !s.pending.length) setTree((t) => !t);
      else if (e.key === 'Escape') setTree(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Celebrate milestones.
  useEffect(() => {
    const ms = milestones.current;
    if (s.stats.rounds.length > ms.rounds || s.regions.length > ms.regions || (s.ipoOffered && !ms.ipo)) setConfetti((c) => c + 1);
    milestones.current = { rounds: s.stats.rounds.length, regions: s.regions.length, ipo: s.ipoOffered, features: s.featureLevel };
  });

  // Record the run exactly once when it ends.
  useEffect(() => {
    if (s.over && !result) {
      const m = { ...meta, codex: [...meta.codex], achievements: [...meta.achievements], best: [...meta.best], dailies: { ...meta.dailies }, productsPlayed: [...meta.productsPlayed] };
      const r = recordRun(m, s);
      setResult(r);
      onMeta(m);
      if (s.over.reason !== 'bankrupt') setConfetti((c) => c + 1);
    }
  }, [s.over, result, meta, onMeta, s]);

  const doShake = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 450);
  };

  const finishTutorial = () => {
    setTutorial(false);
    if (!meta.tutorialDone) onMeta({ ...meta, tutorialDone: true });
  };

  const mods = computeMods(s);
  const rpRate = s.metrics.effective.rnd * 0.9 * mods.researchSpeed;
  const p = getProduct(s.productId);
  const knownCodex = Array.from(new Set([...meta.codex, ...s.codex]));

  return (
    <div className={`game ${shake ? 'shake' : ''} ${s.metrics.downtime > 0 ? 'outage' : ''}`}>
      <TopBar s={s} speed={speed} setSpeed={changeSpeed} act={act} onMenu={onMenu} />
      <main className="layout">
        <section className="col-main">
          <div className="panel pipeline-panel">
            <div className="panel-title">
              Architecture <span className="muted small">· {p.name}: {p.twist}</span>
            </div>
            <Pipeline s={s} />
            <InfraPanel s={s} act={act} />
          </div>
          <div className="row2">
            <SatPanel s={s} />
            <Charts s={s} />
          </div>
          <div className="panel tweet-panel">
            <div className="panel-title">📱 What users are saying</div>
            <TweetFeed s={s} />
          </div>
        </section>
        <section className="col-side panel">
          <button className={`btn tree-btn ${s.rp >= 25 ? 'glow' : ''}`} onClick={() => setTree(true)}>
            🌳 Tech Tree <span className="rp-badge">🔬 {Math.floor(s.rp)} RP</span>
            <span className="muted small">+{rpRate.toFixed(1)}/day · {s.skills.length} owned</span>
          </button>
          <div className="tabs">
            {([['team', '👩‍💻 Team'], ['biz', '💵 Business'], ['world', '🌐 Expand'], ['codex', '📖 Codex'], ['log', '📜 Log']] as [Tab, string][]).map(([id, label]) => (
              <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          <div className="tab-body">
            {tab === 'team' && <TeamPanel s={s} act={act} />}
            {tab === 'biz' && <BusinessPanel s={s} act={act} />}
            {tab === 'world' && <ExpansionPanel s={s} act={act} />}
            {tab === 'codex' && <CodexView unlocked={knownCodex} />}
            {tab === 'log' && <LogPanel s={s} />}
          </div>
          <button className="btn ghost sm help-btn" onClick={() => setTutorial(true)}>❓ How to play</button>
        </section>
      </main>
      {tree && <TechTree s={s} act={act} onClose={() => setTree(false)} />}
      {!tree && !tutorial && <PendingModal s={s} act={act} />}
      {tutorial && <Tutorial onDone={finishTutorial} />}
      {s.over && <GameOver s={s} result={result} onMenu={onMenu} onAgain={onAgain} />}
      <Toasts s={s} onShake={doShake} />
      <Confetti trigger={confetti} />
    </div>
  );
}
