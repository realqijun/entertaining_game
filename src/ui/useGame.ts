import { useCallback, useEffect, useRef, useState } from 'react';
import { tick } from '../engine/sim';
import type { GameState } from '../engine/types';
import { writeSave } from '../meta';

/** Days simulated per real second at each speed setting. */
export const SPEEDS = [0, 1, 3, 8];

export function useGame(initial: GameState) {
  const ref = useRef(initial);
  const [version, setVersion] = useState(0);
  const [speed, setSpeed] = useState(1);
  const lastSave = useRef(initial.day);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  if (import.meta.env.DEV) (window as unknown as { __bigo: typeof ref }).__bigo = ref;

  useEffect(() => {
    ref.current = initial;
    lastSave.current = initial.day;
    bump();
  }, [initial, bump]);

  useEffect(() => {
    const dps = SPEEDS[speed];
    if (!dps) return;
    let acc = 0;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      acc += ((now - last) / 1000) * dps;
      last = now;
      const s = ref.current;
      let n = Math.floor(acc);
      acc -= n;
      let changed = false;
      while (n-- > 0 && !s.over && !s.pending.length) {
        tick(s);
        changed = true;
      }
      if (changed) {
        if (s.day - lastSave.current >= 10 || s.over) {
          lastSave.current = s.day;
          writeSave(s);
        }
        bump();
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [speed, bump]);

  const act = useCallback(
    <T,>(fn: (s: GameState) => T): T => {
      const r = fn(ref.current);
      bump();
      return r;
    },
    [bump],
  );

  return { s: ref.current, version, speed, setSpeed, act };
}
