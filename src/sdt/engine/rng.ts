/** Seeded mulberry32 stored in state, so a seed and an action sequence reproduce a run. */
export function mulberry(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

export function rand(s: { rng: number }): number {
  const [v, next] = mulberry(s.rng);
  s.rng = next;
  return v;
}

export function randInt(s: { rng: number }, min: number, max: number): number {
  return min + Math.floor(rand(s) * (max - min + 1));
}
