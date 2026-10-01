import { addBuff, log, makeStar, shipFeature } from '../engine/helpers';
import { rand } from '../engine/rng';
import type { Contract, Effect, GameState } from '../engine/types';
import { SKILLS, skillStatus } from './skills';

export interface Card {
  id: string;
  name: string;
  emoji: string;
  rarity: 'common' | 'rare' | 'legendary';
  desc: (s: GameState) => string;
  /** Permanent effect added to perks when chosen. */
  perk?: Effect;
  apply?: (s: GameState) => void;
  weight?: (s: GameState) => number;
}

function monthlyBurn(s: GameState): number {
  return s.metrics.costDay * 30;
}

function contract(s: GameState, c: Omit<Contract, 'track' | 'daysLeft'>): void {
  s.contracts.push({ ...c, daysLeft: c.duration, track: { days: 0, upSum: 0, latSum: 0, satMin: 100 } });
}

function scaleReward(s: GameState, base: number): number {
  return Math.round(Math.max(base, s.metrics.revenueDay * 30 * 1.5) / 1000) * 1000;
}

export const CARDS: Card[] = [
  {
    id: 'cloud-credits', name: 'Cloud Credits', emoji: '☁️', rarity: 'common',
    desc: (s) => `A cloud provider wants your logo on their slide. +$${fmt(credits(s))} in credits.`,
    apply: (s) => { s.cash += credits(s); },
  },
  {
    id: 'rockstar', name: 'Rockstar Referral', emoji: '🌟', rarity: 'common',
    desc: () => 'Your board member knows someone. Hire a star engineer with no signing bonus.',
    apply: (s) => {
      const st = makeStar(s, 0);
      st.signing = 0;
      s.stars.push(st);
      s.onboarding.push({ team: st.team, days: 10 });
      log(s, `🌟 ${st.name} joined the ${st.team} team!`, 'good');
    },
  },
  {
    id: 'growth-sprint', name: 'Growth Sprint', emoji: '📈', rarity: 'common',
    desc: () => '+50% growth for the next 60 days.',
    apply: (s) => addBuff(s, 'growth-sprint', 'Growth Sprint', '📈', 60, { mods: { growth: 1.5 } }, true),
  },
  {
    id: 'conference', name: 'Conference Keynote', emoji: '🎤', rarity: 'common',
    desc: (s) => `Your CTO gives a talk on your architecture. +${Math.round(rpGift(s))} research points and some hype.`,
    apply: (s) => { s.rp += rpGift(s); s.hype += 0.15; },
  },
  {
    id: 'refactor-sprint', name: 'Refactor Quarter', emoji: '🧹', rarity: 'common',
    desc: () => 'Feature freeze. Pay down 60% of your tech debt right now.',
    apply: (s) => { s.debt *= 0.4; },
  },
  {
    id: 'bug-bash', name: 'Bug Bash Weekend', emoji: '🐛', rarity: 'common',
    desc: (s) => `Everyone squashes bugs. Fixes all ${Math.round(s.bugs)} open bugs.`,
    apply: (s) => { s.stats.bugsFixed += Math.round(s.bugs); s.bugs = 0; },
  },
  {
    id: 'hackathon-weekend', name: 'Ship-It Weekend', emoji: '🍕', rarity: 'common',
    desc: () => 'Ship a feature right now. +25 tech debt.',
    apply: (s) => { shipFeature(s, 25); },
  },
  {
    id: 'enterprise-sla', name: 'Enterprise SLA Contract', emoji: '🏦', rarity: 'rare',
    desc: (s) => `A bank wants 99.5% uptime for 90 days. Success: +$${fmt(scaleReward(s, 300_000))}. Failure: −$${fmt(scaleReward(s, 300_000) / 2)}.`,
    apply: (s) => {
      const r = scaleReward(s, 300_000);
      contract(s, { id: 'sla', name: 'Enterprise SLA (99.5% uptime)', kind: 'uptime', target: 0.995, duration: 90, reward: r, penalty: r / 2 });
    },
  },
  {
    id: 'user-target', name: 'Aggressive Board Target', emoji: '🎯', rarity: 'rare',
    desc: (s) => `Grow users to ${fmtN(s.users * 1.6 + 2000)} within 120 days. Success: +$${fmt(scaleReward(s, 400_000))}. Failure: −10 satisfaction (morale).`,
    apply: (s) => {
      const r = scaleReward(s, 400_000);
      contract(s, { id: 'users', name: `Reach ${fmtN(s.users * 1.6 + 2000)} users`, kind: 'users', target: Math.round(s.users * 1.6 + 2000), duration: 120, reward: r, penalty: 0 });
    },
  },
  {
    id: 'latency-deal', name: 'Gaming Partnership', emoji: '🕹️', rarity: 'rare',
    desc: (s) => `Keep average latency under ${latTarget(s)}ms for 60 days. Success: +$${fmt(scaleReward(s, 250_000))} and +20% growth for 90 days.`,
    apply: (s) => {
      const r = scaleReward(s, 250_000);
      contract(s, { id: 'latency', name: `Avg latency < ${latTarget(s)}ms`, kind: 'latency', target: latTarget(s), duration: 60, reward: r, penalty: 0 });
    },
  },
  {
    id: 'open-source', name: 'Open-Source Your Framework', emoji: '🐙', rarity: 'rare',
    desc: () => 'Permanent: −25% recruiting costs, +5% growth. GitHub stars go brrr.',
    perk: { mods: { hireCost: 0.75, growth: 1.05 } },
    weight: (s) => (s.perks.includes('open-source') ? 0 : 1),
  },
  {
    id: 'cto', name: 'Hire a Seasoned CTO', emoji: '🧓', rarity: 'rare',
    desc: () => 'Permanent: +12% productivity on every team. They have seen things.',
    perk: { mods: { productivity: 1.12 } },
    weight: (s) => (s.perks.includes('cto') ? 0 : 1),
  },
  {
    id: 'pivot-ai', name: 'Pivot to AI', emoji: '✨', rarity: 'rare',
    desc: () => 'Permanent: +15% revenue per user, +30% hype now. Also +40 tech debt from bolting an LLM onto everything.',
    perk: { mods: { arpu: 1.15 } },
    apply: (s) => { s.hype += 0.3; s.debt += 40; },
    weight: (s) => (s.perks.includes('pivot-ai') || s.productId === 'ai' ? 0 : 1),
  },
  {
    id: 'ads', name: 'Sell Ads', emoji: '📺', rarity: 'common',
    desc: () => 'Permanent: +20% revenue per user, −8% growth. If it\'s free, you are the product.',
    perk: { mods: { arpu: 1.2, growth: 0.92, satBonus: -2 } },
    weight: (s) => (s.perks.includes('ads') ? 0 : 1),
  },
  {
    id: 'free-tier', name: 'Generous Free Tier', emoji: '🎁', rarity: 'common',
    desc: () => 'Permanent: +20% growth, −10% revenue per user.',
    perk: { mods: { growth: 1.2, arpu: 0.9 } },
    weight: (s) => (s.perks.includes('free-tier') ? 0 : 1),
  },
  {
    id: 'cost-cut', name: 'Cost-Cutting Memo', emoji: '✂️', rarity: 'common',
    desc: () => 'Permanent: −10% salaries. Morale dips: −5% productivity.',
    perk: { mods: { salary: 0.9, productivity: 0.95 } },
    weight: (s) => (s.perks.includes('cost-cut') ? 0 : 1),
  },
  {
    id: 'grant', name: 'Research Grant', emoji: '🏛️', rarity: 'common',
    desc: (s) => `The National Science Foundation likes your algorithms. +$${fmt(Math.max(150_000, monthlyBurn(s)))}.`,
    apply: (s) => { s.cash += Math.max(150_000, monthlyBurn(s)); },
  },
  {
    id: 'university', name: 'University Partnership', emoji: '🎓', rarity: 'rare',
    desc: () => 'Permanent: +25% research speed. Interns everywhere.',
    perk: { mods: { researchSpeed: 1.25, bugSpawn: 1.05 } },
    weight: (s) => (s.perks.includes('university') ? 0 : 1),
  },
  {
    id: 'eureka', name: 'Eureka Moment', emoji: '💡', rarity: 'legendary',
    desc: () => 'An engineer wakes up at 4am with the answer. Unlock a random available tech for free.',
    apply: (s) => {
      const avail = SKILLS.filter((n) => skillStatus(s.skills, n) === 'available');
      if (!avail.length) { s.rp += 300; return; }
      const node = avail[Math.floor(rand(s) * avail.length)];
      s.skills.push(node.id);
      log(s, `💡 Eureka! Unlocked ${node.name} for free.`, 'good');
    },
  },
  {
    id: 'viral', name: 'Viral Launch Video', emoji: '🎥', rarity: 'rare',
    desc: () => '+80% hype and a traffic spike: ×2.5 traffic for 5 days. Hope you have headroom.',
    apply: (s) => {
      s.hype += 0.8;
      addBuff(s, 'viral', 'Viral Video Traffic', '🎥', 5, { mods: { traffic: 2.5 } }, false);
    },
  },
  {
    id: 'acquihire', name: 'Acqui-hire a Startup', emoji: '🤝', rarity: 'legendary',
    desc: (s) => `Absorb a failing startup: +4 engineers (already onboarded), +1 feature, −$${fmt(acquiCost(s))}.`,
    apply: (s) => {
      s.cash -= acquiCost(s);
      s.teams.product += 2;
      s.teams.rnd += 2;
      shipFeature(s, 8);
    },
  },
  {
    id: 'shift-adapt', name: 'Paradigm Pioneer', emoji: '🌀', rarity: 'legendary',
    desc: () => 'You adapted to the paradigm shift. +25% addressable market.',
    perk: { mods: { tam: 1.25 } },
    weight: () => 0,
  },
  {
    id: 'shift-ignore', name: 'Disrupted', emoji: '🦕', rarity: 'common',
    desc: () => 'You ignored the paradigm shift. −30% addressable market.',
    perk: { mods: { tam: 0.7 } },
    weight: () => 0,
  },
  {
    id: 'vendored', name: 'Vendored Dependencies', emoji: '📦', rarity: 'common',
    desc: () => 'All dependencies are checked into the repo. −10% bugs.',
    perk: { mods: { bugSpawn: 0.9 } },
    weight: () => 0,
  },
  {
    id: 'patent', name: 'Patent Your Algorithm', emoji: '📜', rarity: 'rare',
    desc: () => 'Permanent: licensing income adds +10% revenue. The open-source community frowns (−2 satisfaction).',
    perk: { mods: { arpu: 1.1, satBonus: -2 } },
    weight: (s) => (s.perks.includes('patent') || s.skills.length < 4 ? 0 : 1),
  },
];

function credits(s: GameState): number {
  return Math.round(Math.max(80_000, (s.metrics.costs.servers + s.metrics.costs.bandwidth + s.metrics.costs.db) * 30 * 4) / 1000) * 1000;
}
function rpGift(s: GameState): number {
  return 60 + s.skills.length * 25;
}
function acquiCost(s: GameState): number {
  return Math.round(Math.max(200_000, s.cash * 0.1) / 1000) * 1000;
}
function latTarget(s: GameState): number {
  const base = s.metrics.latency || 300;
  return Math.max(40, Math.round((base * 0.8) / 10) * 10);
}

export function fmt(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(0)}k`;
  return `${Math.round(n)}`;
}
export function fmtN(n: number): string {
  return fmt(n);
}

export function getCard(id: string): Card | undefined {
  return CARDS.find((c) => c.id === id);
}
