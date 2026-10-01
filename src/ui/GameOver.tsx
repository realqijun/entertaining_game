import { useState } from 'react';
import { getFounder } from '../content/founders';
import { getProduct } from '../content/products';
import { getDifficulty, getMutator } from '../content/worlds';
import type { GameState } from '../engine/types';
import { dailyNumber, type RunResult } from '../meta';
import { money, ms, num, uptime } from './format';

const REASON: Record<string, [string, string]> = {
  ipo: ['🔔', 'You rang the bell!'],
  time: ['🏁', 'Five years are up.'],
  acquired: ['💼', 'Acquired!'],
  bankrupt: ['💀', 'Bankrupt.'],
};

export function shareText(s: GameState): string {
  const o = s.over!;
  const p = getProduct(s.productId);
  const f = getFounder(s.founderId);
  const muts = s.mutators.map((id) => getMutator(id)?.emoji).join('');
  const head = s.daily ? `Big-O Tycoon Daily #${dailyNumber(s.daily)}` : 'Big-O Tycoon';
  return [
    `${head} ${o.reason === 'bankrupt' ? '💀' : o.score >= 1e9 ? '🦄' : '🚀'}`,
    `${p.emoji} ${p.name} · ${f.emoji} ${f.name.replace('The ', '')} · ${getDifficulty(s.difficultyId).name}${muts ? ` · ${muts}` : ''}`,
    `Score ${money(o.score, 2)}: ${o.title}`,
    `👥 ${num(s.stats.peakUsers)} users · ⏱️ ${ms(s.metrics.latency)} · ⬆ ${uptime(s.metrics.uptime30)}`,
    `🔬 ${s.skills.length} techs · 🧠 ${s.stats.quizCorrect}/${s.stats.quizTotal} quiz · 📅 day ${s.day}`,
  ].join('\n');
}

export function GameOver({ s, result, onMenu, onAgain }: { s: GameState; result: RunResult | null; onMenu: () => void; onAgain: () => void }) {
  const [copied, setCopied] = useState(false);
  const o = s.over!;
  const [emoji, headline] = REASON[o.reason];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText(s));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="overlay">
      <div className="modal gameover">
        <div className="modal-emoji big">{emoji}</div>
        <h2>{headline}</h2>
        <div className="final-title">{o.title}</div>
        <div className="final-score">{money(o.score, 2)}</div>
        <div className="muted small">Founder net worth = valuation {money(o.valuation)} × your stake {(o.equity * 100).toFixed(1)}% × difficulty/mutator multipliers</div>
        <div className="final-grid">
          <div><span>Peak users</span><b>{num(s.stats.peakUsers)}</b></div>
          <div><span>Total revenue</span><b>{money(s.stats.totalRevenue)}</b></div>
          <div><span>Features shipped</span><b>{s.stats.featuresShipped}</b></div>
          <div><span>Techs researched</span><b>{s.skills.length}</b></div>
          <div><span>Incidents</span><b>{s.stats.incidents}</b></div>
          <div><span>Bugs squashed</span><b>{num(s.stats.bugsFixed)}</b></div>
          <div><span>Quiz score</span><b>{s.stats.quizCorrect}/{s.stats.quizTotal}</b></div>
          <div><span>Regions</span><b>{s.regions.length}</b></div>
        </div>
        {result && (
          <div className="rewards">
            <div className="stars-earned">+{result.starsEarned} ★ GitHub stars</div>
            {result.newAchievements.map((a) => (
              <div key={a.id} className="achievement">{a.emoji} <b>{a.name}</b> <span className="muted small">{a.desc} (+3★)</span></div>
            ))}
            {result.newCodex > 0 && <div className="small">📖 {result.newCodex} new Codex entries added to your collection.</div>}
          </div>
        )}
        <pre className="share">{shareText(s)}</pre>
        <div className="modal-actions">
          <button className="btn ghost" onClick={copy}>{copied ? '✅ Copied!' : '📋 Copy result'}</button>
          <button className="btn ghost" onClick={onMenu}>Menu</button>
          <button className="btn primary" onClick={onAgain}>Play again</button>
        </div>
      </div>
    </div>
  );
}
