import { useEffect, useRef, useState } from 'react';
import { track } from '../analytics';
import * as A from '../engine/actions';
import { advanceDay, availability } from '../engine/sim';
import type { Component, GameState } from '../engine/types';
import { Canvas } from './Canvas';
import { Inspector, type Run } from './Inspector';
import { Coach, EndRun, Milestone, Postmortem, Research } from './Modals';
import { FOUNDERS, MENTOR, MENTOR_INCIDENT, crashStory } from '../content/story';
import { MentorSays } from './Art';
import { Feed, Hud, IncidentBar, Metrics, NewsApp } from './Panels';
import { sfx } from './sfx';
import { useGame, writeSave } from './useGame';

const ONBOARD_KEY = 'sdt-onboarded';

function onboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARD_KEY) === '1';
  } catch {
    return false;
  }
}

interface Props {
  initial: GameState;
  run: number;
  onAgain: () => void;
  onHome: () => void;
  onJoin: (email: string) => Promise<boolean>;
}

export function Game({ initial, run, onAgain, onHome, onJoin }: Props) {
  const [coach, setCoach] = useState(() => !onboarded());
  const { s, paused, setPaused, fast, setFast, act } = useGame(initial, coach);
  const [sel, setSel] = useState<Component | null>(null);
  const [tree, setTree] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [callout, setCallout] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  const seen = useRef({ incident: s.incident?.id ?? 0, resolved: s.incidents.length, over: !!s.over, milestone: s.milestone, mode: s.mode });

  // Turn state transitions into analytics events and sounds.
  useEffect(() => {
    const p = seen.current;
    if (s.incident && s.incident.id !== p.incident) {
      p.incident = s.incident.id;
      track('incident_start', { run, variant: s.incident.variant, day: s.day });
      sfx.alarm();
      setHint(null);
      setCallout(`${s.incident.variant === 'instance' ? `${crashStory(s.seed, s.day)} ` : ''}${MENTOR_INCIDENT[s.incident.variant]}`);
    }
    if (s.incidents.length > p.resolved) {
      const inc = s.incidents[s.incidents.length - 1];
      p.resolved = s.incidents.length;
      track('incident_resolved', { run, variant: inc.variant, steps: (inc.endStep ?? 0) - inc.startStep, hints: inc.hints, ms: Date.now() - startedAt.current });
      sfx.ship();
      setHint(null);
      setCallout(null);
    }
    if (s.mode !== p.mode) {
      if (s.mode === 'live' && !s.incident) sfx.bad();
      if (s.mode === 'day') setHint(null);
      p.mode = s.mode;
    }
    if (s.milestone > p.milestone) {
      p.milestone = s.milestone;
      track('milestone', { run, index: s.milestone, day: s.day });
      sfx.fanfare();
    }
    if (s.over && !p.over) {
      p.over = true;
      track('run_end', { run, reason: s.over.reason, day: s.over.day, ms: Date.now() - startedAt.current, uptime: Number(availability(s).toFixed(5)), incidents: s.incidents.length });
      writeSave(null);
      if (s.over.reason === 'win') sfx.fanfare();
    }
  });

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  const doRun: Run = (name, fn) => {
    const err = act(fn);
    if (err) {
      setToast(err);
      sfx.wrong();
      return;
    }
    track('action', { run, a: name, mode: s.mode, day: s.day });
    sfx.buy();
  };

  const select = (c: Component) => {
    setSel(c);
    act((st) => A.inspect(st, c));
    track('inspect', { run, c, mode: s.mode });
    sfx.click();
  };

  const pending = s.pending[0];
  const pm = pending?.kind === 'postmortem' ? s.incidents.find((i) => i.id === pending.incidentId) : null;

  return (
    <div className={`game mode-${s.mode}${s.incident ? ' burning' : ''}`}>
      <Hud
        s={s}
        paused={paused}
        fast={fast}
        onPause={() => setPaused(!paused)}
        onFast={() => setFast(!fast)}
        onNext={() => act(advanceDay)}
        onResearch={() => {
          setTree(true);
          track('open_research', { run });
        }}
        onMenu={onHome}
        researchPulse={s.rp > 0 && s.day >= 2}
      />
      <IncidentBar
        s={s}
        onHint={() => {
          const h = act(A.hint);
          setHint(h);
          track('hint', { run, mode: s.mode });
        }}
      />
      {(hint || callout) && (
        <div className="hint-box" role="note">
          <MentorSays small>
            <b>{MENTOR.short}:</b> {hint ?? callout}
          </MentorSays>
          <button
            className="x"
            onClick={() => {
              setHint(null);
              setCallout(null);
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
      <main className="board">
        <div className="stage">
          <Canvas s={s} selected={sel} onSelect={select} />
          <NewsApp s={s} />
          <Feed s={s} />
        </div>
        <aside className="side">
          {sel ? (
            <Inspector s={s} comp={sel} run={doRun} />
          ) : (
            <div className="insp empty">
              <div className="empty-art" aria-hidden>
                <span>🖥️</span>
                <span>🗄️</span>
                <span className="tap">👆</span>
              </div>
              <p>Tap a part of your system to see how it is doing and upgrade it.</p>
            </div>
          )}
          <Metrics s={s} />
        </aside>
      </main>

      {toast && <div className="toast">{toast}</div>}
      {coach && (
        <Coach
          founder={s.founder ?? FOUNDERS[0]}
          onReroll={() => {
            act((st) => {
              const i = FOUNDERS.indexOf(st.founder ?? FOUNDERS[0]);
              st.founder = FOUNDERS[(i + 1) % FOUNDERS.length];
            });
            sfx.click();
          }}
          onDone={() => {
            setCoach(false);
            setPaused(false);
            try {
              localStorage.setItem(ONBOARD_KEY, '1');
            } catch {
              /* ignore */
            }
            track('onboarding_done', { run });
          }}
        />
      )}
      {tree && (
        <Research
          s={s}
          onClose={() => setTree(false)}
          onPick={(id) => {
            const err = act((st) => A.research(st, id));
            if (err) setToast(err);
            else {
              track('action', { run, a: `research:${id}`, mode: s.mode, day: s.day });
              sfx.research();
            }
          }}
        />
      )}
      {pm && <Postmortem inc={pm} onClose={() => act(A.resolvePending)} />}
      {pending?.kind === 'milestone' && (
        <Milestone
          s={s}
          index={pending.index}
          onClose={() => act(A.resolvePending)}
          onResearch={() => {
            act(A.resolvePending);
            setTree(true);
          }}
        />
      )}
      {s.over && !pending && (
        <EndRun
          s={s}
          onSurvey={(n) => track('survey', { run, enjoy: n })}
          onAgain={() => {
            track('replay_click', { run });
            onAgain();
          }}
          onJoin={onJoin}
          onHome={onHome}
        />
      )}
    </div>
  );
}
