import type { GameState } from './types';

/** mulberry32 step: returns [value in [0,1), next state]. Deterministic so daily seeds replay identically. */
export function mulberry(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

export function rand(s: GameState): number {
  const [v, next] = mulberry(s.rng);
  s.rng = next;
  return v;
}

export function randInt(s: GameState, min: number, max: number): number {
  return min + Math.floor(rand(s) * (max - min + 1));
}

export function pick<T>(s: GameState, items: readonly T[]): T {
  return items[Math.floor(rand(s) * items.length)];
}

export function chance(s: GameState, p: number): boolean {
  return rand(s) < p;
}

export function weightedPick<T>(s: GameState, items: readonly T[], weight: (t: T) => number): T | null {
  const total = items.reduce((sum, it) => sum + Math.max(0, weight(it)), 0);
  if (total <= 0) return null;
  let r = rand(s) * total;
  for (const it of items) {
    r -= Math.max(0, weight(it));
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

/** Pick n distinct items by weight. */
export function weightedSample<T>(s: GameState, items: readonly T[], n: number, weight: (t: T) => number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length) {
    const it = weightedPick(s, pool, weight);
    if (!it) break;
    out.push(it);
    pool.splice(pool.indexOf(it), 1);
  }
  return out;
}

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
