import { useState, type ReactNode } from 'react';
import { MILESTONES } from '../content/balance';
import { BRANCHES, TECH } from '../content/tech';
import * as A from '../engine/actions';
import { postmortem } from '../engine/postmortem';
import { availability, users } from '../engine/sim';
import type { GameState, Incident, TechId } from '../engine/types';
import { APP_NAME, ENDINGS, MENTOR, MILESTONE_STORIES, storyForCause } from '../content/story';
import { CoachArt, FounderAvatar, MentorAvatar, MentorSays } from './Art';
import { avail, money, num } from './format';

export function Modal({ children, onClose, wide, label }: { children: ReactNode; onClose?: () => void; wide?: boolean; label: string }) {
  return (
    <div className="scrim" onClick={onClose} role="dialog" aria-modal="true" aria-label={label}>
      <div className={`modal${wide ? ' wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button className="x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

export function Research({ s, onPick, onClose }: { s: GameState; onPick: (id: TechId) => void; onClose: () => void }) {
  return (
    <Modal onClose={onClose} wide label="Research">
      <h2>Research</h2>
      <p className="muted">
        {s.rp > 0 ? (
          <>
            You have <b className="accent">{s.rp} research point{s.rp > 1 ? 's' : ''}</b>. Researching unlocks an option; building it still costs cash.
          </>
        ) : (
          'Milestones earn research points. More of the tree appears as you grow.'
        )}
      </p>
      <div className="tree">
        {BRANCHES.map((b) => (
          <div key={b.id} className="branch">
            <h4>
              {b.name} <small>{b.lo}</small>
            </h4>
            {TECH.filter((t) => t.branch === b.id).map((t) => {
              const done = s.tech.includes(t.id);
              const why = A.canResearch(s, t.id);
              const hidden = why === 'Locked';
              if (hidden)
                return (
                  <div key={t.id} className="tech hidden" title="Unlocks at a later milestone">
                    <b>??? </b>
                    <small>Reach {MILESTONES[t.stage - 1]?.title ?? 'a milestone'}</small>
                  </div>
                );
              return (
                <button key={t.id} className={`tech${done ? ' done' : ''}`} disabled={!!why} onClick={() => onPick(t.id)} title={why && !done ? why : t.concept}>
                  <b>
                    {done ? '✓ ' : ''}
                    {t.name}
                  </b>
                  <small>{t.unlocks}</small>
                  <span className="concept">{t.concept}</span>
                  {t.requires.length > 0 && !done && <em>needs {t.requires.map((r) => TECH.find((x) => x.id === r)!.name).join(' + ')}</em>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function Postmortem({ inc, onClose }: { inc: Incident; onClose: () => void }) {
  const pm = postmortem(inc);
  const story = storyForCause(inc.workload.cause);
  const max = Math.max(1.2, ...inc.series.map((p) => Math.max(p.appUtil, p.dbUtil)));
  return (
    <Modal label="Postmortem">
      <div className="pm-author">
        <MentorAvatar size={48} />
        <div>
          <p className="eyebrow">Incident report · Day {inc.day}</p>
          <small className="muted">by {MENTOR.name}, {MENTOR.title}</small>
        </div>
      </div>
      <h2>{pm.title}</h2>
      {story && (
        <p className="pm-headline">
          {story.emoji} <i>“{story.text}”</i> {story.why}
        </p>
      )}
      <section className="pm">
        <h4>What happened</h4>
        <p>{pm.cause}</p>
        <div className="pm-chart" aria-hidden>
          {inc.series.map((p, i) => (
            <span key={i} className="pm-col">
              <i className="app" style={{ height: `${(Math.min(p.appUtil, max) / max) * 100}%` }} />
              <i className="db" style={{ height: `${(Math.min(p.dbUtil, max) / max) * 100}%` }} />
            </span>
          ))}
          <span className="pm-100" style={{ bottom: `${(1 / max) * 100}%` }}>100%</span>
        </div>
        <p className="legend small">
          <i className="app" /> App load <i className="db" /> DB load, per step
        </p>
        <h4>Impact</h4>
        <ul>{pm.impact.map((x, i) => <li key={i}>{x}</li>)}</ul>
        {pm.worked.length > 0 && (
          <>
            <h4 className="good">What helped</h4>
            <ul>{pm.worked.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </>
        )}
        {pm.didNot.length > 0 && (
          <>
            <h4 className="warn">What did not help</h4>
            <ul>{pm.didNot.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </>
        )}
        <h4>Next time</h4>
        <p>{pm.prevent}</p>
        <p className="concept-line">{pm.concept}</p>
      </section>
      <button className="btn primary wide" onClick={onClose}>
        Back to work
      </button>
    </Modal>
  );
}

export function Milestone({ s, index, onClose, onResearch }: { s: GameState; index: number; onClose: () => void; onResearch: () => void }) {
  const m = MILESTONES[index];
  const fresh = TECH.filter((t) => t.stage === index + 1);
  return (
    <Modal label="Milestone">
      <p className="eyebrow">Milestone {index + 1} of {MILESTONES.length}</p>
      <h2>🎉 {m.title}</h2>
      <div className="story-end">
        <FounderAvatar size={44} />
        <p>{MILESTONE_STORIES[index]}</p>
      </div>
      <p>
        {num(m.users)} readers. +{money(m.cash)} and <b className="accent">+1 research point</b>.
      </p>
      {fresh.length > 0 && (
        <>
          <h4>New in the tech tree</h4>
          <ul className="fresh">
            {fresh.map((t) => (
              <li key={t.id}>
                <b>{t.name}</b>: {t.unlocks}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="muted small">Next goal: {num(MILESTONES[index + 1]?.users ?? users(s))} users.</p>
      <div className="row">
        <button className="btn" onClick={onClose}>
          Later
        </button>
        <button className="btn primary" onClick={onResearch}>
          Open research
        </button>
      </div>
    </Modal>
  );
}

const COACH = [
  { title: `Welcome to ${APP_NAME}!`, text: 'Your news app just launched. Every reader request goes through your app server to the database. Grow to 1 million readers!' },
  { title: 'Watch their faces', text: 'Busy parts start sweating. Past 100% they panic, pages slow down and some fail.' },
  { title: 'Click a part to upgrade it', text: 'Upgrades cost cash and land overnight, or a few steps later during an incident.' },
  { title: 'When it breaks, fix it', text: 'Fix whoever is panicking and stay healthy for 5 steps. Then I\'ll write you a report on what happened.' },
];

export function Coach({ founder, onReroll, onDone }: { founder: string; onReroll: () => void; onDone: () => void }) {
  const [i, setI] = useState(0);
  const c = COACH[i];
  return (
    <div className="coach" role="dialog" aria-label="How to play">
      <p className="eyebrow">
        {i + 1} / {COACH.length}
      </p>
      {i === 0 && (
        <div className="founder-card">
          <FounderAvatar size={56} />
          <div>
            <small>You are</small>
            <b>{founder}</b>
            <small>founder of {APP_NAME} 🦖📰</small>
          </div>
          <button className="btn sm ghost" onClick={onReroll} title="Pick another dinosaur name">
            🎲
          </button>
        </div>
      )}
      <CoachArt step={i} />
      <h3>{c.title}</h3>
      <MentorSays small>{i === 0 ? `I'm ${MENTOR.name}, the oldest system architect on Pangaea. ${c.text}` : c.text}</MentorSays>
      <div className="row">
        <button className="btn ghost sm" onClick={onDone}>
          Skip
        </button>
        <button className="btn primary sm" onClick={() => (i + 1 < COACH.length ? setI(i + 1) : onDone())}>
          {i + 1 < COACH.length ? 'Next' : 'Start'}
        </button>
      </div>
    </div>
  );
}


const TIPS: Record<string, string> = {
  reputation: 'An incident ran too long. Next time, find the red box first, and use 💡 Hint if you are stuck.',
  bankrupt: 'Costs outran revenue. Daily costs are shown on every upgrade; size for the next spike, not the biggest one.',
  timeout: 'Growth was too slow. Promotions grow users, but only run them when you have headroom.',
};

export function EndRun({ s, onSurvey, onAgain, onJoin, onHome }: {
  s: GameState;
  onSurvey: (n: number) => void;
  onAgain: () => void;
  onJoin: (email: string) => Promise<boolean>;
  onHome: () => void;
}) {
  const [rated, setRated] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState<'no' | 'sending' | 'yes' | 'err'>('no');
  const end = ENDINGS[s.over!.reason];

  // The enjoyment question comes first, before any results or coaching (proposal §2, target 2).
  if (rated === null) {
    return (
      <Modal label="Quick question">
        <p className="eyebrow">Before you see your results</p>
        <h2>How enjoyable was this play session?</h2>
        <div className="rate">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className="btn"
              onClick={() => {
                setRated(n);
                onSurvey(n);
              }}
            >
              <b>{n}</b>
              <small>{n === 1 ? 'Not at all' : n === 5 ? 'Extremely' : ''}</small>
            </button>
          ))}
        </div>
        <button className="btn ghost sm wide" onClick={() => setRated(0)}>
          Skip
        </button>
      </Modal>
    );
  }

  const resolved = s.incidents.length;
  return (
    <Modal label="Run over">
      <p className="eyebrow">Day {s.over!.day}</p>
      <h2>
        {end.icon} {end.title}
      </h2>
      <div className="story-end">
        <FounderAvatar size={44} mood={s.over!.reason === 'win' ? 'happy' : 'sweat'} />
        <p>{end.story}</p>
      </div>
      <div className="results">
        <div>
          <small>Users</small>
          <b>{num(users(s))}</b>
        </div>
        <div>
          <small>Uptime</small>
          <b>{avail(availability(s))}</b>
        </div>
        <div>
          <small>Incidents fixed</small>
          <b>{resolved}</b>
        </div>
        <div>
          <small>Cash</small>
          <b>{money(s.cash)}</b>
        </div>
      </div>
      {s.over!.reason !== 'win' && <p className="muted small">{TIPS[s.over!.reason]}</p>}
      <button className="btn primary wide" onClick={onAgain}>
        ↻ Play again
      </button>
      <form
        className="join"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!email.includes('@')) return;
          setJoined('sending');
          setJoined((await onJoin(email)) ? 'yes' : 'err');
        }}
      >
        <label htmlFor="join-email">Want to test the next version?</label>
        {joined === 'yes' ? (
          <p className="good">Thanks! We will be in touch.</p>
        ) : (
          <div className="row">
            <input id="join-email" type="email" placeholder="you@u.nus.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn" disabled={joined === 'sending'}>
              Join
            </button>
          </div>
        )}
        {joined === 'err' && <p className="bad small">Could not send. Try again later.</p>}
      </form>
      <button className="btn ghost sm wide" onClick={onHome}>
        Home
      </button>
    </Modal>
  );
}
