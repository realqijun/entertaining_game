import { useEffect, useRef, useState } from 'react';
import { initAnalytics, nextRunIndex, runCount, signup, track } from './analytics';
import { newGame } from './engine/sim';
import type { GameState } from './engine/types';
import { Game } from './ui/Game';
import { Landing } from './ui/Landing';
import { Stats } from './ui/Stats';
import { loadSave, writeSave } from './ui/useGame';

type Route = 'landing' | 'play' | 'stats';
const routeOf = (h: string): Route => (h.startsWith('#/play') ? 'play' : h.startsWith('#/stats') ? 'stats' : 'landing');

/** ?seed=123 pins the run seed (evaluation sessions use one recorded build and seed). */
function seedFromUrl(): number {
  const q = Number(new URLSearchParams(location.search).get('seed'));
  return Number.isFinite(q) && q > 0 ? q : Math.floor(Math.random() * 2 ** 31);
}

initAnalytics();

export default function App() {
  const [route, setRoute] = useState<Route>(() => routeOf(location.hash));
  const [game, setGame] = useState<{ s: GameState; run: number; key: number } | null>(null);

  useEffect(() => {
    const on = () => setRoute(routeOf(location.hash));
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    if (route === 'landing') track('landing_view');
    if (route === 'stats') track('stats_view');
  }, [route]);

  const go = (r: Route) => {
    location.hash = r === 'landing' ? '/' : `/${r}`;
    setRoute(r);
  };

  const start = (via: string) => {
    const run = nextRunIndex();
    const s = newGame(seedFromUrl());
    writeSave(s);
    track('run_start', { run, seed: s.seed, via });
    setGame({ s, run, key: Date.now() });
    go('play');
  };

  const resume = () => {
    const s = loadSave();
    if (!s) return start('resume-missing');
    track('run_resume', { run: runCount(), day: s.day });
    setGame({ s, run: runCount(), key: Date.now() });
    go('play');
  };

  // Deep link straight into #/play: resume a save or start fresh (once, even under StrictMode).
  const booting = useRef(false);
  useEffect(() => {
    if (route !== 'play' || game || booting.current) return;
    booting.current = true;
    if (loadSave()) resume();
    else start('direct');
  });
  useEffect(() => {
    if (game) booting.current = false;
  }, [game]);

  if (route === 'stats') return <Stats onBack={() => go('landing')} />;

  if (route === 'play') {
    if (!game) return null;
    return (
      <Game
        key={game.key}
        initial={game.s}
        run={game.run}
        onAgain={() => start('replay')}
        onHome={() => {
          setGame(null);
          go('landing');
        }}
        onJoin={(email) => {
          track('join_tests', { run: game.run });
          return signup(email, 'endrun');
        }}
      />
    );
  }

  return (
    <Landing
      hasSave={!!loadSave()}
      onPlay={() => {
        track('cta_play');
        start('landing');
      }}
      onContinue={resume}
      onSignup={(email) => signup(email, 'landing')}
    />
  );
}
