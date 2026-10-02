import { useCallback, useEffect, useRef, useState } from 'react';
import { advanceDay, liveStep } from '../engine/sim';
import type { GameState } from '../engine/types';

export const SAVE_KEY = 'sdt-save-v1';

/** Real milliseconds per day turn and per live step, at normal and fast speed. */
const DAY_MS = [2600, 1200];
const STEP_MS = [1100, 550];

export function writeSave(s: GameState | null) {
  try {
    if (s && !s.over) localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const s = raw ? (JSON.parse(raw) as GameState) : null;
    return s?.version === 1 && !s.over ? s : null;
  } catch {
    return null;
  }
}

export function useGame(initial: GameState, startPaused: boolean) {
  const ref = useRef(initial);
  const [, setVersion] = useState(0);
  const [paused, setPaused] = useState(startPaused);
  const [fast, setFast] = useState(false);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  if (import.meta.env.DEV) (window as unknown as { __sdt: typeof ref }).__sdt = ref;

  useEffect(() => {
    let last = performance.now();
    let acc = 0;
    const id = window.setInterval(() => {
      const now = performance.now();
      const s = ref.current;
      const live = s.mode === 'live';
      // Live incidents keep running unless the player pauses; day turns respect auto-play.
      if (paused || s.over || s.pending.length) {
        last = now;
        acc = 0;
        return;
      }
      acc += now - last;
      last = now;
      const period = (live ? STEP_MS : DAY_MS)[fast ? 1 : 0];
      if (acc < period) return;
      acc = 0;
      if (live) liveStep(s);
      else advanceDay(s);
      writeSave(s);
      bump();
    }, 50);
    return () => window.clearInterval(id);
  }, [paused, fast, bump]);

  const act = useCallback(
    <T,>(fn: (s: GameState) => T): T => {
      const r = fn(ref.current);
      writeSave(ref.current);
      bump();
      return r;
    },
    [bump],
  );

  return { s: ref.current, paused, setPaused, fast, setFast, act };
}
