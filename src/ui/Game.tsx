import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { GameState, LogEntry } from '../engine/types';
import { recordRun, type Meta, type RunResult } from '../meta';
import type { DataCenter } from '../three/DataCenter';
import { Confetti } from './Confetti';
import { MoneyDrawer, TeamDrawer, WorldDrawer } from './Drawers';
import { CodexView } from './Feeds';
import { num } from './format';
import { GameOver } from './GameOver';
import { Hud } from './Hud';
import { Book, Coin, Globe, Team, Tree } from './Icons';
import { PendingModal } from './Modals';
import { sfx } from './sfx';
import { TechTree } from './TechTree';
import { Tutorial } from './Tutorial';
import { useGame } from './useGame';
import { World3D, type PopFn } from './World3D';

type Drawer = 'team' | 'money' | 'world' | 'codex' | null;

interface Props {
  initial: GameState;
  meta: Meta;
  onMeta: (m: Meta) => void;
  onMenu: () => void;
  onAgain: () => void;
}

const MILESTONES = [100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000];

export function Game({ initial, meta, onMeta, onMenu, onAgain }: Props) {
  const { s, speed, setSpeed, act } = useGame(initial);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [tree, setTree] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [banner, setBanner] = useState<{ id: number; text: string; sub: string } | null>(null);
  const [tutorial, setTutorial] = useState(!meta.tutorialDone);
  const [result, setResult] = useState<RunResult | null>(null);
  const popRef = useRef<PopFn | null>(null);
  const sceneRef = useRef<DataCenter | null>(null);
  const prevSpeed = useRef(1);
  const seenLog = useRef<LogEntry | null>(s.log[0] ?? null);
  const milestone = useRef(MILESTONES.filter((x) => s.users >= x).length);
  const prev = useRef({ rounds: s.stats.rounds.length, regions: s.regions.length, ipo: s.ipoOffered, pending: 0 });

  const blocking = tree || tutorial || s.pending.length > 0 || !!s.over;
  useEffect(() => {
    if (blocking && speed !== 0) { prevSpeed.current = speed; setSpeed(0); }
    else if (!blocking && speed === 0 && prevSpeed.current) { setSpeed(prevSpeed.current); prevSpeed.current = 0; }
  }, [blocking, speed, setSpeed]);
  const changeSpeed = (n: number) => { prevSpeed.current = 0; setSpeed(n); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || tutorial) return;
      if (e.key === ' ') { e.preventDefault(); if (!blocking) changeSpeed(speed === 0 ? 1 : 0); }
      else if (['1', '2', '3'].includes(e.key) && !blocking) changeSpeed(Number(e.key));
      else if (e.key.toLowerCase() === 't' && !s.over && !s.pending.length) setTree((t) => !t);
      else if (e.key === 'Escape') { setTree(false); setDrawer(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Turn new log lines into floating text, sounds and camera shake.
  useEffect(() => {
    const fresh: LogEntry[] = [];
    for (const l of s.log) { if (l === seenLog.current) break; fresh.push(l); }
    seenLog.current = s.log[0] ?? null;
    const pop = popRef.current;
    for (const l of fresh.slice(0, 4).reverse()) {
      const t = l.text;
      if (t.startsWith('🚀')) { pop?.('office', t.replace('Shipped: ', '🚀 '), 'good'); sfx.ship(); }
      else if (t.startsWith('🔥')) { pop?.('cpu', '🔥 OUTAGE!', 'bad'); sfx.alarm(); sceneRef.current?.bump(0.9); }
      else if (t.startsWith('🔬')) sfx.research();
      else if (t.startsWith('💰')) { pop?.('users', t.split(':')[0], 'gold'); sfx.fanfare(); }
      else if (t.startsWith('📖')) pop?.('office', '📖 New codex entry', 'info');
      else if (l.tone === 'bad') { pop?.('cpu', t.split(':')[0], 'bad'); sfx.bad(); sceneRef.current?.bump(0.5); }
      else if (l.tone === 'good') pop?.('users', t.split(':')[0], 'good');
    }
  });

  // Celebrations.
  useEffect(() => {
    const p = prev.current;
    if (s.stats.rounds.length > p.rounds || s.regions.length > p.regions || (s.ipoOffered && !p.ipo)) setConfetti((c) => c + 1);
    const reached = MILESTONES.filter((x) => s.users >= x).length;
    if (reached > milestone.current) {
      milestone.current = reached;
      const n = MILESTONES[reached - 1];
      if (n >= 1000) {
        setBanner({ id: Date.now(), text: `${num(n)} USERS`, sub: n >= 1e6 ? 'You are officially a big deal' : 'Keep scaling!' });
        setConfetti((c) => c + 1);
        sfx.fanfare();
      }
    }
    if (s.pending.length > p.pending) sfx.click();
    prev.current = { rounds: s.stats.rounds.length, regions: s.regions.length, ipo: s.ipoOffered, pending: s.pending.length };
  });
  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => setBanner(null), 2600);
    return () => window.clearTimeout(id);
  }, [banner]);

  useEffect(() => {
    if (s.over && !result) {
      const m = { ...meta, codex: [...meta.codex], achievements: [...meta.achievements], best: [...meta.best], dailies: { ...meta.dailies }, productsPlayed: [...meta.productsPlayed] };
      setResult(recordRun(m, s));
      onMeta(m);
      if (s.over.reason !== 'bankrupt') { setConfetti((c) => c + 1); sfx.fanfare(); } else sfx.bad();
    }
  }, [s.over, result, meta, onMeta, s]);

  const finishTutorial = () => {
    setTutorial(false);
    if (!meta.tutorialDone) onMeta({ ...meta, tutorialDone: true });
  };
  const toggle = (d: Drawer) => { setDrawer((cur) => (cur === d ? null : d)); sfx.click(); };
  const knownCodex = Array.from(new Set([...meta.codex, ...s.codex]));

  return (
    <div className={`game3d ${s.metrics.downtime > 0 ? 'outage' : ''} ${drawer ? 'has-drawer' : ''}`}>
      <World3D s={s} speed={speed} act={act} popRef={popRef} sceneRef={sceneRef} />
      <Hud s={s} speed={speed} setSpeed={changeSpeed} act={act} onMenu={onMenu} />

      <div className="nudges">
        {s.outageHours > 0 && <div className="nudge bad">🔥 Outage! Click the fires</div>}
        {s.bugs >= 8 && <div className="nudge">🐛 Click bugs to squash them</div>}
      </div>

      <nav className="dock">
        <DockBtn icon={<Team size={26} />} label="Team" active={drawer === 'team'} onClick={() => toggle('team')} />
        <DockBtn icon={<Tree size={26} />} label="Tech" badge={`${Math.floor(s.rp)}`} glow={s.rp >= 20} onClick={() => { setTree(true); sfx.click(); }} />
        <DockBtn icon={<Coin size={26} />} label="Money" active={drawer === 'money'} onClick={() => toggle('money')} />
        <DockBtn icon={<Globe size={26} />} label="World" active={drawer === 'world'} onClick={() => toggle('world')} />
        <DockBtn icon={<Book size={26} />} label="Codex" active={drawer === 'codex'} onClick={() => toggle('codex')} />
      </nav>

      {drawer && (
        <aside className="drawer">
          <div className="drawer-head">
            <b>{{ team: '👩‍💻 Team', money: '💰 Money', world: '🌐 Expand', codex: '📖 Codex' }[drawer]}</b>
            <button onClick={() => setDrawer(null)} aria-label="Close">✕</button>
          </div>
          {drawer === 'team' && <TeamDrawer s={s} act={act} />}
          {drawer === 'money' && <MoneyDrawer s={s} act={act} />}
          {drawer === 'world' && <WorldDrawer s={s} act={act} />}
          {drawer === 'codex' && <div className="drawer-body"><CodexView unlocked={knownCodex} /></div>}
        </aside>
      )}

      {banner && <div className="banner" key={banner.id}><b>{banner.text}</b><span>{banner.sub}</span></div>}
      {tree && <TechTree s={s} act={act} onClose={() => setTree(false)} />}
      {!tree && !tutorial && <PendingModal s={s} act={act} />}
      {tutorial && <Tutorial onDone={finishTutorial} />}
      {s.over && <GameOver s={s} result={result} onMenu={onMenu} onAgain={onAgain} />}
      <Confetti trigger={confetti} />
    </div>
  );
}

function DockBtn({ icon, label, onClick, active, badge, glow }: { icon: ReactElement; label: string; onClick: () => void; active?: boolean; badge?: string; glow?: boolean }) {
  return (
    <button className={`dock-btn ${active ? 'on' : ''} ${glow ? 'glow' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {badge && <em>{badge}</em>}
    </button>
  );
}
