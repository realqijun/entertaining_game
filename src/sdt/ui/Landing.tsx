import { useMemo, useState } from 'react';
import { computeMetrics, newGame } from '../engine/sim';
import { APP_NAME, FOUNDERS, HEADLINES, MENTOR } from '../content/story';
import { FounderAvatar, MentorAvatar } from './Art';
import { Canvas } from './Canvas';

/** The game's own canvas, frozen at the first incident: a viral spike saturating the database. */
function demoState() {
  const s = newGame(1);
  s.workload = { demand: 925, read: 0.85, cacheable: 1, cause: 'Meteor panic goes viral' };
  s.metrics = computeMetrics(s, s.workload, false);
  return s;
}

export function Landing({ hasSave, onPlay, onContinue, onSignup }: { hasSave: boolean; onPlay: () => void; onContinue: () => void; onSignup: (email: string) => Promise<boolean> }) {
  const demo = useMemo(demoState, []);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'err'>('idle');

  return (
    <div className="landing">
      <header className="land-top">
        <span className="brand">
          99.99<span>%</span>
        </span>
        <a href="#signup" className="btn sm ghost">
          Join the playtest
        </a>
      </header>

      <section className="hero">
        <p className="eyebrow">System Design Tycoon · public beta</p>
        <h1>
          500,000 dinosaurs. One database.
          <br />
          <span className="grad">Servers on fire.</span> What do you do?
        </h1>
        <p className="lede">
          You are <b>{FOUNDERS[0]}</b>, founder of <b>{APP_NAME}</b>, the hottest news app on Pangaea. Everyone wants to read about the bright light in the sky. Grow from 50k to 1 million readers by designing the system behind it: scale, cache, balance and fail over. When it breaks, {MENTOR.name} explains why.
        </p>
        <div className="cta-row">
          <button className="btn primary big" onClick={onPlay}>
            ▶ Play the beta
            <small>Free · in your browser · about 12 minutes</small>
          </button>
          {hasSave && (
            <button className="btn" onClick={onContinue}>
              Continue run
            </button>
          )}
        </div>
      </section>

      <section className="demo" aria-label="Game preview">
        <Canvas s={demo} selected="db" compact />
        <p className="demo-cap">
          ☄️ Meteor panic goes viral. The database is at <b className="bad">154%</b> and panicking. Adding app servers will not save it.
        </p>
      </section>

      <section className="cast" aria-label="The cast">
        <div>
          <FounderAvatar size={64} />
          <b>You</b>
          <small>{FOUNDERS.slice(0, 3).join(' · ')}…</small>
        </div>
        <div>
          <MentorAvatar size={64} />
          <b>{MENTOR.name}</b>
          <small>Your mentor. Gives hints, writes every incident report.</small>
        </div>
        <div className="cast-news">
          <span className="news-logo">🦖📰</span>
          <b>{APP_NAME}</b>
          {HEADLINES.slice(0, 3).map((h) => (
            <small key={h.text}>
              {h.emoji} {h.text}
            </small>
          ))}
        </div>
      </section>

      <section className="pillars">
        <div>
          <span className="pillar-ic" aria-hidden>🧩</span>
          <h3>Design</h3>
          <p>App servers, a load balancer, a read cache and a database. Real capacity numbers, not flavour text.</p>
        </div>
        <div>
          <span className="pillar-ic" aria-hidden>🔥</span>
          <h3>Break</h3>
          <p>Viral spikes, flash sales and crashed instances. Find the bottleneck from the metrics, then act before users leave.</p>
        </div>
        <div>
          <span className="pillar-ic" aria-hidden>📚</span>
          <h3>Learn</h3>
          <p>Each incident ends with a postmortem: the cause, what helped, what did not, and what to build next time.</p>
        </div>
      </section>

      <section className="challenge">
        <h2>Can your architecture survive a 10× traffic spike?</h2>
        <p className="muted">Made by NUS computing students, for anyone who wants to know why big systems fall over.</p>
      </section>

      <section className="signup" id="signup">
        <h2>Get the next build first</h2>
        <p className="muted">Join our playtest list. We email when a new scenario is ready, nothing else.</p>
        {state === 'done' ? (
          <p className="good">You are on the list. Thanks!</p>
        ) : (
          <form
            className="row"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email.includes('@')) return;
              setState('sending');
              setState((await onSignup(email)) ? 'done' : 'err');
            }}
          >
            <input type="email" required placeholder="you@u.nus.edu" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
            <button className="btn primary" disabled={state === 'sending'}>
              Join playtest
            </button>
          </form>
        )}
        {state === 'err' && <p className="bad small">Could not send. Please try again.</p>}
      </section>

      <footer className="land-foot muted small">99.99%: System Design Tycoon · a CS3216 project · simplified models, not production advice</footer>
    </div>
  );
}
