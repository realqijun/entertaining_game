import { getCard } from '../content/cards';
import { getEvent } from '../content/events';
import * as A from '../engine/actions';
import { computeMods } from '../engine/mods';
import { FUNDING_ROUNDS } from '../engine/sim';
import type { GameState } from '../engine/types';
import { money, pct } from './format';

type Act = <T>(fn: (s: GameState) => T) => T;

export function PendingModal({ s, act }: { s: GameState; act: Act }) {
  const p = s.pending[0];
  if (!p || s.over) return null;

  if (p.kind === 'event') {
    const ev = getEvent(p.eventId);
    if (!ev) {
      return (
        <div className="overlay">
          <div className="modal">
            <button className="btn primary" onClick={() => act((st) => st.pending.shift())}>Continue</button>
          </div>
        </div>
      );
    }
    const mods = computeMods(s);
    return (
      <div className="overlay">
        <div className={`modal event ${ev.tone}`}>
          <div className="modal-emoji">{ev.emoji}</div>
          <h3>{ev.title}</h3>
          <p>{ev.text(s, mods)}</p>
          <div className="choices">
            {ev.choices?.map((c, i) => {
              const disabled = c.disabled?.(s) ?? false;
              return (
                <button key={c.label} className="btn choice" disabled={disabled} onClick={() => act((st) => A.resolveEvent(st, i))}>
                  <b>{c.label}</b>
                  {c.hint && <span className="muted small">{c.hint(s)}</span>}
                  {disabled && <span className="bad small">Can't afford</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (p.kind === 'board') {
    return (
      <div className="overlay">
        <div className="modal board">
          <div className="modal-emoji">🃏</div>
          <h3>Quarterly Board Meeting</h3>
          <p className="muted">The board offers three strategic options. Pick one.</p>
          <div className="cards">
            {p.cards.map((id) => {
              const c = getCard(id);
              if (!c) return null;
              return (
                <button key={id} className={`card-pick ${c.rarity}`} onClick={() => act((st) => A.pickCard(st, id))}>
                  <span className="card-rarity">{c.rarity}</span>
                  <span className="card-emoji">{c.emoji}</span>
                  <b>{c.name}</b>
                  <span className="small">{c.desc(s)}</span>
                  {c.perk && <span className="chip">permanent</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (p.kind === 'funding' || p.kind === 'bridge') {
    const name = p.kind === 'funding' ? FUNDING_ROUNDS[p.round].name : 'Emergency Bridge Round';
    const newEquity = s.equity * (1 - p.dilution);
    return (
      <div className="overlay">
        <div className="modal funding">
          <div className="modal-emoji">{p.kind === 'funding' ? '💰' : '🆘'}</div>
          <h3>{name}</h3>
          <p>
            {p.kind === 'funding'
              ? `VCs want in. They offer ${money(p.cash)} for ${pct(p.dilution)} of the company.`
              : `You're out of money. A predatory fund offers ${money(p.cash)} for ${pct(p.dilution)} of the company. Decline, and you have 30 days to become profitable or go bankrupt.`}
          </p>
          <div className="funding-math">
            <div><span className="muted">Your stake</span><b>{pct(s.equity)} → {pct(newEquity)}</b></div>
            <div><span className="muted">Cash</span><b>{money(s.cash)} → {money(s.cash + p.cash)}</b></div>
          </div>
          <p className="muted small">Your final score is valuation × your stake. More money means faster growth, but a smaller slice.</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => act((st) => A.resolveFunding(st, false))}>Decline</button>
            <button className="btn primary" onClick={() => act((st) => A.resolveFunding(st, true))}>Take the money</button>
          </div>
        </div>
      </div>
    );
  }

  if (p.kind === 'ipo') {
    return (
      <div className="overlay">
        <div className="modal ipo-modal">
          <div className="modal-emoji">🦄</div>
          <h3>You're a Unicorn!</h3>
          <p>Your valuation just crossed {money(1e9)}. Bankers are calling. Go public now for a score bonus that's bigger the earlier you do it, or keep growing and IPO later from the top bar.</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => act((st) => A.resolveIpo(st, false))}>Keep building</button>
            <button className="btn primary" onClick={() => act((st) => A.resolveIpo(st, true))}>🔔 IPO now</button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
