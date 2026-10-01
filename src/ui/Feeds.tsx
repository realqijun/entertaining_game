import { useEffect, useRef, useState } from 'react';
import { CODEX } from '../content/codex';
import type { GameState, LogEntry } from '../engine/types';

export function LogPanel({ s }: { s: GameState }) {
  return (
    <div className="log">
      {s.log.slice(0, 80).map((l, i) => (
        <div key={`${l.day}-${i}`} className={`log-row ${l.tone}`}>
          <span className="log-day">D{l.day}</span>
          <span>{l.text}</span>
        </div>
      ))}
    </div>
  );
}

export function TweetFeed({ s }: { s: GameState }) {
  return (
    <div className="tweets">
      {s.tweets.slice(0, 6).map((t, i) => (
        <div key={`${t.day}-${i}`} className={`tweet ${t.mood}`}>
          <span className="tweet-handle">{t.handle}</span> {t.text}
        </div>
      ))}
      {s.tweets.length === 0 && <div className="muted small">Your users will start talking soon…</div>}
    </div>
  );
}

export function CodexView({ unlocked }: { unlocked: string[] }) {
  return (
    <div className="codex">
      <div className="muted small">{unlocked.length}/{CODEX.length} concepts discovered. Each one is real CS that the simulation actually models.</div>
      {CODEX.map((c) => {
        const open = unlocked.includes(c.id);
        return (
          <details key={c.id} className={`codex-entry ${open ? '' : 'locked'}`}>
            <summary>{open ? c.emoji : '🔒'} {open ? c.title : '???'} {!open && <span className="muted small"> · {c.hint}</span>}</summary>
            {open && <p>{c.body}</p>}
          </details>
        );
      })}
    </div>
  );
}

interface Toast {
  id: number;
  entry: LogEntry;
}

/** Pops important log lines as toasts and shakes the screen on bad news. */
export function Toasts({ s, onShake }: { s: GameState; onShake: () => void }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seen = useRef<LogEntry | null>(s.log[0] ?? null);
  const counter = useRef(0);
  useEffect(() => {
    const fresh: LogEntry[] = [];
    for (const l of s.log) {
      if (l === seen.current) break;
      fresh.push(l);
    }
    seen.current = s.log[0] ?? null;
    if (!fresh.length) return;
    const add = fresh.slice(0, 3).reverse().map((entry) => ({ id: ++counter.current, entry }));
    if (fresh.some((f) => f.tone === 'bad')) onShake();
    setToasts((t) => [...add, ...t].slice(0, 4));
    for (const a of add) window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== a.id)), 5000);
  });
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.entry.tone}`}>{t.entry.text}</div>
      ))}
    </div>
  );
}
