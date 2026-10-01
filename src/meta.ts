import { FOUNDERS } from './content/founders';
import { PRODUCTS } from './content/products';
import { DIFFICULTIES, MUTATORS } from './content/worlds';
import { hashString, mulberry } from './engine/rng';
import type { GameState, RunConfig } from './engine/types';

export interface RunRecord {
  date: string;
  company: string;
  productId: string;
  founderId: string;
  difficultyId: string;
  mutators: string[];
  score: number;
  reason: string;
  title: string;
  daily: string | null;
}

export interface Meta {
  stars: number;
  totalStars: number;
  unlocked: string[];
  legacy: string[];
  codex: string[];
  achievements: string[];
  runs: number;
  best: RunRecord[];
  dailies: Record<string, number>;
  productsPlayed: string[];
  tutorialDone: boolean;
}

const META_KEY = 'bigo-tycoon-meta-v1';
const SAVE_KEY = 'bigo-tycoon-save-v1';

export function defaultMeta(): Meta {
  return { stars: 0, totalStars: 0, unlocked: [], legacy: [], codex: [], achievements: [], runs: 0, best: [], dailies: {}, productsPlayed: [], tutorialDone: false };
}

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return { ...defaultMeta(), ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return defaultMeta();
}

export function saveMeta(m: Meta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* storage unavailable */
  }
}

export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return s.version === 1 && !s.over ? s : null;
  } catch {
    return null;
  }
}

export function writeSave(s: GameState | null): void {
  try {
    if (!s || s.over) localStorage.removeItem(SAVE_KEY);
    else localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

export function isUnlocked(meta: Meta, id: string, cost: number): boolean {
  return cost === 0 || meta.unlocked.includes(id);
}

export interface LegacyPerk {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  cost: number;
}

export const LEGACY_PERKS: LegacyPerk[] = [
  { id: 'head-start', name: 'Side Project', emoji: '🌱', desc: 'Start every run with 40 research points.', cost: 8 },
  { id: 'seed-cash', name: 'Friends & Family Round', emoji: '👪', desc: 'Start every run with +$75k.', cost: 12 },
  { id: 'cofounder', name: 'Technical Co-founder', emoji: '🤝', desc: 'Start every run with +1 engineer.', cost: 18 },
  { id: 'mentor', name: 'Startup Mentor', emoji: '🧓', desc: 'Start every run with the "Seasoned CTO" perk (+12% productivity).', cost: 30 },
];

export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  check: (s: GameState, meta: Meta) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'hello', name: 'Hello, World', emoji: '👋', desc: 'Finish your first run.', check: () => true },
  { id: 'ramen', name: 'Ramen Profitable', emoji: '🍜', desc: 'Reach positive monthly profit.', check: (s) => s.codex.includes('unit-economics') },
  { id: 'unicorn', name: 'Unicorn', emoji: '🦄', desc: 'Reach a $1B valuation.', check: (s) => s.ipoOffered },
  { id: 'ipo', name: 'Ring the Bell', emoji: '🔔', desc: 'Take your company public.', check: (s) => s.over?.reason === 'ipo' },
  { id: 'speedrun', name: 'Speedrunner', emoji: '⚡', desc: 'IPO before the end of year 2.', check: (s) => s.over?.reason === 'ipo' && s.day <= 730 },
  { id: 'scholar', name: 'Scholar', emoji: '🎓', desc: 'Answer 10 quiz questions correctly in one run.', check: (s) => s.stats.quizCorrect >= 10 },
  { id: 'completionist', name: 'Full Stack', emoji: '🌳', desc: 'Research 40 technologies in one run.', check: (s) => s.skills.length >= 40 },
  { id: 'interplanetary', name: 'Interplanetary', emoji: '🪐', desc: 'Launch the Mars Colony region.', check: (s) => s.regions.includes('mars') },
  { id: 'global', name: 'Going Global', emoji: '🌐', desc: 'Launch in 4 regions in one run.', check: (s) => s.regions.length >= 4 },
  { id: 'debtfree', name: 'Debt Free', emoji: '🧹', desc: 'Finish a run with under 5 tech debt.', check: (s) => s.debt < 5 && s.over?.reason !== 'bankrupt' },
  { id: 'bootstrapped', name: 'Bootstrapped', emoji: '🏕️', desc: 'Score $100M+ as the Indie Hacker.', check: (s) => s.founderId === 'indie' && (s.over?.score ?? 0) >= 1e8 },
  { id: 'exponential', name: 'NP-Hard Mode', emoji: '🔥', desc: 'Finish a run on O(2ⁿ) without going bankrupt.', check: (s) => s.difficultyId === 'o2n' && s.over?.reason !== 'bankrupt' },
  { id: 'weird', name: 'Weird World', emoji: '🌀', desc: 'Finish a run with 3+ mutators active.', check: (s) => s.mutators.length >= 3 && s.over?.reason !== 'bankrupt' },
  { id: 'polyglot', name: 'Polyglot', emoji: '🗺️', desc: 'Play all 6 products.', check: (_s, m) => m.productsPlayed.length >= PRODUCTS.length },
  { id: 'survivor', name: 'Phoenix', emoji: '🐦‍🔥', desc: 'Take a bridge round and still score $50M+.', check: (s) => s.stats.rounds.includes('Bridge round') && (s.over?.score ?? 0) >= 5e7 },
  { id: 'nines', name: 'Five Nines', emoji: '9️⃣', desc: 'End a run with 100% 30-day uptime and 1M+ users.', check: (s) => s.metrics.uptime30 >= 0.99999 && s.users >= 1e6 },
];

export interface RunResult {
  starsEarned: number;
  newAchievements: Achievement[];
  newCodex: number;
}

/** Fold a finished run into the persistent meta profile. */
export function recordRun(meta: Meta, s: GameState): RunResult {
  if (!s.over) return { starsEarned: 0, newAchievements: [], newCodex: 0 };
  meta.runs += 1;
  if (!meta.productsPlayed.includes(s.productId)) meta.productsPlayed.push(s.productId);
  const before = meta.codex.length;
  for (const c of s.codex) if (!meta.codex.includes(c)) meta.codex.push(c);
  const newAchievements = ACHIEVEMENTS.filter((a) => !meta.achievements.includes(a.id) && a.check(s, meta));
  for (const a of newAchievements) meta.achievements.push(a.id);
  const starsEarned = s.over.stars + newAchievements.length * 3;
  meta.stars += starsEarned;
  meta.totalStars += starsEarned;
  const rec: RunRecord = {
    date: new Date().toISOString().slice(0, 10),
    company: s.companyName,
    productId: s.productId,
    founderId: s.founderId,
    difficultyId: s.difficultyId,
    mutators: s.mutators,
    score: s.over.score,
    reason: s.over.reason,
    title: s.over.title,
    daily: s.daily,
  };
  meta.best = [...meta.best, rec].sort((a, b) => b.score - a.score).slice(0, 10);
  if (s.daily) meta.dailies[s.daily] = Math.max(meta.dailies[s.daily] ?? 0, s.over.score);
  return { starsEarned, newAchievements, newCodex: meta.codex.length - before };
}

const ADJ = ['Lazy', 'Quantum', 'Async', 'Recursive', 'Atomic', 'Null', 'Infinite', 'Binary', 'Fuzzy', 'Greedy', 'Mutable', 'Sharded', 'Stateless', 'Pure', 'Volatile', 'Hyper', 'Cosmic', 'Byzantine'];
const NOUN = ['Llama', 'Pointer', 'Penguin', 'Kernel', 'Panda', 'Lambda', 'Otter', 'Octopus', 'Badger', 'Monad', 'Walrus', 'Ferret', 'Heap', 'Daemon', 'Gopher', 'Capybara', 'Tortoise', 'Hamster'];
const SUFFIX = ['Labs', 'Inc.', 'Systems', '.io', 'AI', 'Technologies', 'HQ', 'Works', '& Co.'];

export function randomCompanyName(seed = Math.floor(Math.random() * 1e9)): string {
  let r = seed;
  const next = () => {
    const [v, n] = mulberry(r);
    r = n;
    return v;
  };
  const pickA = <T,>(arr: T[]) => arr[Math.floor(next() * arr.length)];
  return `${pickA(ADJ)} ${pickA(NOUN)} ${pickA(SUFFIX)}`;
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Everyone gets the same daily run: same product, founder, world rules, events and company name. */
export function dailyConfig(key: string): RunConfig {
  const seed = hashString(`bigo-daily-${key}`);
  let r = seed;
  const next = () => {
    const [v, n] = mulberry(r);
    r = n;
    return v;
  };
  const product = PRODUCTS[Math.floor(next() * PRODUCTS.length)];
  const founder = FOUNDERS[Math.floor(next() * FOUNDERS.length)];
  const mutatorCount = 1 + Math.floor(next() * 2);
  const pool = [...MUTATORS];
  const mutators: string[] = [];
  for (let i = 0; i < mutatorCount; i++) mutators.push(pool.splice(Math.floor(next() * pool.length), 1)[0].id);
  return {
    productId: product.id,
    founderId: founder.id,
    difficultyId: DIFFICULTIES[1].id,
    mutators,
    seed,
    companyName: randomCompanyName(seed),
    daily: key,
  };
}

export function dailyNumber(key: string): number {
  const start = Date.UTC(2026, 0, 1);
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - start) / 86_400_000) + 1;
}
