import { useState } from 'react';
import { CODEX } from '../content/codex';
import { FOUNDERS, getFounder } from '../content/founders';
import { PRODUCTS, getProduct } from '../content/products';
import { DIFFICULTIES, MUTATORS, getDifficulty, getMutator } from '../content/worlds';
import type { GameState, RunConfig } from '../engine/types';
import { ACHIEVEMENTS, LEGACY_PERKS, dailyConfig, dailyNumber, isUnlocked, randomCompanyName, todayKey, type Meta } from '../meta';
import { CodexView } from './Feeds';
import { Logo } from './Icons';
import { MenuWorld } from './MenuWorld';
import { money } from './format';

export function MainMenu({ meta, save, onNew, onContinue, onDaily, onLegacy }: { meta: Meta; save: GameState | null; onNew: () => void; onContinue: () => void; onDaily: () => void; onLegacy: () => void }) {
  const today = todayKey();
  const daily = dailyConfig(today);
  const dailyBest = meta.dailies[today];
  return (
    <div className="menu">
      <MenuWorld />
      <div className="menu-card">
        <div className="title-row"><Logo size={56} /><h1 className="title">Big-O Tycoon</h1></div>
        <p className="tagline">Garage → servers → unicorn 🦄</p>
        <div className="menu-buttons">
          {save && (
            <button className="btn primary big" onClick={onContinue}>
              ▶ Continue <span className="muted small">{save.companyName} · day {save.day}</span>
            </button>
          )}
          <button className={`btn big ${save ? '' : 'primary'}`} onClick={onNew}>🚀 New run</button>
          <button className="btn big daily" onClick={onDaily}>
            📅 Daily Challenge #{dailyNumber(today)}
            <span className="muted small">
              {getProduct(daily.productId).emoji} {getProduct(daily.productId).name} · {getFounder(daily.founderId).emoji} · {daily.mutators.map((m) => getMutator(m)?.emoji).join('')}
              {dailyBest !== undefined ? ` · best ${money(dailyBest)}` : ''}
            </span>
          </button>
          <button className="btn big" onClick={onLegacy}>★ Legacy &amp; Codex <span className="muted small">{meta.stars}★ to spend</span></button>
        </div>
        {meta.best.length > 0 && (
          <div className="hall">
            <div className="subhead">🏆 Hall of Fame</div>
            {meta.best.slice(0, 5).map((r, i) => (
              <div key={i} className="hall-row">
                <span>{i + 1}. {getProduct(r.productId).emoji} {r.company}</span>
                <span className="muted small">{r.title}</span>
                <b>{money(r.score)}</b>
              </div>
            ))}
          </div>
        )}
        <div className="muted small foot">Runs played: {meta.runs} · Codex {meta.codex.length}/{CODEX.length} · Achievements {meta.achievements.length}/{ACHIEVEMENTS.length}</div>
      </div>
    </div>
  );
}

export function Setup({ meta, onStart, onBack }: { meta: Meta; onStart: (cfg: RunConfig) => void; onBack: () => void }) {
  const [productId, setProduct] = useState('social');
  const [founderId, setFounder] = useState('hacker');
  const [difficultyId, setDifficulty] = useState('ologn');
  const [mutators, setMutators] = useState<string[]>([]);
  const [name, setName] = useState(() => randomCompanyName());
  const mult = getDifficulty(difficultyId).scoreMult * getFounder(founderId).scoreMult * mutators.reduce((a, id) => a * (getMutator(id)?.scoreMult ?? 1), 1);
  return (
    <div className="setup">
      <div className="setup-head">
        <button className="btn ghost" onClick={onBack}>← Back</button>
        <h2>New run</h2>
        <div className="mult">Score ×{mult.toFixed(2)}</div>
      </div>

      <h3>1. Build</h3>
      <div className="pick-grid">
        {PRODUCTS.map((p) => {
          const open = isUnlocked(meta, p.id, p.unlockCost);
          return (
            <button key={p.id} className={`pick ${productId === p.id ? 'selected' : ''}`} disabled={!open} onClick={() => setProduct(p.id)} title={p.twist}>
              <span className="pick-emoji">{p.emoji}</span>
              <b>{p.name}</b>
              <span className="muted small">{p.tagline}</span>
              {!open && <span className="lock">🔒 {p.unlockCost}★ in Legacy</span>}
            </button>
          );
        })}
      </div>

      <h3>2. Founder</h3>
      <div className="pick-grid">
        {FOUNDERS.map((f) => {
          const open = isUnlocked(meta, f.id, f.unlockCost);
          return (
            <button key={f.id} className={`pick ${founderId === f.id ? 'selected' : ''}`} disabled={!open} onClick={() => setFounder(f.id)} title={f.desc}>
              <span className="pick-emoji">{f.emoji}</span>
              <b>{f.name}</b>
              <ul className="perks">{f.perks.map((x) => <li key={x}>{x}</li>)}</ul>
              {!open && <span className="lock">🔒 {f.unlockCost}★ in Legacy</span>}
            </button>
          );
        })}
      </div>

      <h3>3. Difficulty</h3>
      <div className="pick-row">
        {DIFFICULTIES.map((d) => {
          const open = isUnlocked(meta, d.id, d.unlockCost);
          return (
            <button key={d.id} className={`pick small-pick ${difficultyId === d.id ? 'selected' : ''}`} disabled={!open} onClick={() => setDifficulty(d.id)} title={d.desc}>
              <b className="mono">{d.name}</b>
              <span className="muted small">score ×{d.scoreMult}</span>
              {!open && <span className="lock">🔒 {d.unlockCost}★</span>}
            </button>
          );
        })}
      </div>

      <h3>4. Weird worlds <span className="muted small">optional · hover for details</span></h3>
      <div className="pick-row">
        {MUTATORS.map((m) => {
          const open = isUnlocked(meta, m.id, m.unlockCost);
          const on = mutators.includes(m.id);
          return (
            <button key={m.id} className={`pick small-pick ${on ? 'selected' : ''}`} disabled={!open} onClick={() => setMutators(on ? mutators.filter((x) => x !== m.id) : [...mutators, m.id])} title={`${m.desc}\n\n💡 ${m.lesson}`}>
              <span className="pick-emoji">{m.emoji}</span>
              <b>{m.name}</b>
              <span className="muted small">score ×{m.scoreMult}</span>
              {!open && <span className="lock">🔒 {m.unlockCost}★ in Legacy</span>}
            </button>
          );
        })}
      </div>

      <h3>5. Name</h3>
      <div className="name-row">
        <input value={name} maxLength={28} onChange={(e) => setName(e.target.value)} aria-label="Company name" />
        <button className="btn ghost" onClick={() => setName(randomCompanyName())}>🎲</button>
        <button className="btn primary big" disabled={!name.trim()} onClick={() => onStart({ productId, founderId, difficultyId, mutators, seed: Math.floor(Math.random() * 2 ** 31), companyName: name.trim(), legacy: meta.legacy })}>
          🚀 Launch
        </button>
      </div>
    </div>
  );
}

export function Legacy({ meta, onMeta, onBack }: { meta: Meta; onMeta: (m: Meta) => void; onBack: () => void }) {
  const [tab, setTab] = useState<'unlocks' | 'achievements' | 'codex'>('unlocks');
  const buy = (id: string, cost: number, kind: 'unlock' | 'legacy') => {
    if (meta.stars < cost) return;
    const m = { ...meta, stars: meta.stars - cost };
    if (kind === 'unlock') m.unlocked = [...meta.unlocked, id];
    else m.legacy = [...meta.legacy, id];
    onMeta(m);
  };
  const lockables: { id: string; name: string; emoji: string; cost: number; kind: string }[] = [
    ...PRODUCTS.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, cost: p.unlockCost, kind: 'Product' })),
    ...FOUNDERS.map((f) => ({ id: f.id, name: f.name, emoji: f.emoji, cost: f.unlockCost, kind: 'Founder' })),
    ...DIFFICULTIES.map((d) => ({ id: d.id, name: d.name, emoji: '⚙️', cost: d.unlockCost, kind: 'Difficulty' })),
    ...MUTATORS.map((m) => ({ id: m.id, name: m.name, emoji: m.emoji, cost: m.unlockCost, kind: 'Mutator' })),
  ].filter((x) => x.cost > 0);
  return (
    <div className="setup legacy">
      <div className="setup-head">
        <button className="btn ghost" onClick={onBack}>← Back</button>
        <h2>★ Legacy</h2>
        <div className="mult">{meta.stars}★ available · {meta.totalStars}★ earned</div>
      </div>
      <p className="muted">Earn ★ every run. Spend them on unlocks.</p>
      <div className="tabs">
        <button className={`tab ${tab === 'unlocks' ? 'active' : ''}`} onClick={() => setTab('unlocks')}>Unlocks</button>
        <button className={`tab ${tab === 'achievements' ? 'active' : ''}`} onClick={() => setTab('achievements')}>Achievements {meta.achievements.length}/{ACHIEVEMENTS.length}</button>
        <button className={`tab ${tab === 'codex' ? 'active' : ''}`} onClick={() => setTab('codex')}>Codex {meta.codex.length}/{CODEX.length}</button>
      </div>
      {tab === 'unlocks' && (
        <>
          <h3>Permanent perks</h3>
          <div className="pick-grid">
            {LEGACY_PERKS.map((p) => {
              const owned = meta.legacy.includes(p.id);
              return (
                <div key={p.id} className={`pick ${owned ? 'selected' : ''}`}>
                  <span className="pick-emoji">{p.emoji}</span>
                  <b>{p.name}</b>
                  <span className="small">{p.desc}</span>
                  {owned ? <span className="good small">✅ Owned</span> : <button className="btn sm primary" disabled={meta.stars < p.cost} onClick={() => buy(p.id, p.cost, 'legacy')}>Buy · {p.cost}★</button>}
                </div>
              );
            })}
          </div>
          <h3>Unlocks</h3>
          <div className="pick-grid">
            {lockables.map((x) => {
              const owned = meta.unlocked.includes(x.id);
              return (
                <div key={x.id} className={`pick ${owned ? 'selected' : ''}`}>
                  <span className="pick-emoji">{x.emoji}</span>
                  <b>{x.name}</b>
                  <span className="muted small">{x.kind}</span>
                  {owned ? <span className="good small">✅ Unlocked</span> : <button className="btn sm primary" disabled={meta.stars < x.cost} onClick={() => buy(x.id, x.cost, 'unlock')}>Unlock · {x.cost}★</button>}
                </div>
              );
            })}
          </div>
        </>
      )}
      {tab === 'achievements' && (
        <div className="achievements">
          {ACHIEVEMENTS.map((a) => {
            const got = meta.achievements.includes(a.id);
            return (
              <div key={a.id} className={`achievement ${got ? '' : 'locked'}`}>
                <span className="pick-emoji">{got ? a.emoji : '🔒'}</span>
                <div><b>{a.name}</b><div className="muted small">{a.desc} · +3★</div></div>
              </div>
            );
          })}
        </div>
      )}
      {tab === 'codex' && <CodexView unlocked={meta.codex} />}
    </div>
  );
}
