import type { Effect } from '../engine/types';

export interface Product {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  twist: string;
  /** Requests each user makes per day. */
  reqPerUser: number;
  /** Peak-to-average traffic ratio. */
  peak: number;
  /** CPU units per request (1 = a plain CRUD request). */
  cpu: number;
  /** Response payload in KB. */
  payloadKB: number;
  /** Database queries per request. */
  dbPerReq: number;
  /** Revenue per user per month at default pricing. */
  arpu: number;
  /** Total addressable market (users) before features expand it. */
  tam: number;
  /** Peak daily logistic growth rate. */
  growth: number;
  /** $ of valuation per user. */
  userValue: number;
  /** Cost to acquire a user through paid marketing. */
  cac: number;
  /** Latency (ms) users love / latency at which they rage-quit. */
  latGood: number;
  latBad: number;
  weights: { latency: number; reliability: number; features: number; bugs: number; price: number };
  featureNames: string[];
  effect: Effect;
  /** Locked until meta unlock (stars). */
  unlockCost: number;
}

export const PRODUCTS: Product[] = [
  {
    id: 'social',
    name: 'Chirper',
    emoji: '🐦',
    tagline: 'A social network for sharing 280-byte thoughts.',
    twist: 'Read-heavy and viral. Caches are extra effective, but hype spikes hit hard.',
    reqPerUser: 400,
    peak: 2.5,
    cpu: 1,
    payloadKB: 40,
    dbPerReq: 4,
    arpu: 1.2,
    tam: 6_000_000,
    growth: 0.0095,
    userValue: 40,
    cac: 3,
    latGood: 200,
    latBad: 1500,
    weights: { latency: 0.25, reliability: 0.25, features: 0.3, bugs: 0.1, price: 0.1 },
    featureNames: ['Hashtags', 'Dark Mode', 'Infinite Scroll', 'Stories', 'Emoji Reactions', 'Edit Button (finally)', 'Algorithmic Feed', 'Spaces', 'Blue Checkmarks', 'Polls', 'Threads', 'Bookmarks', 'DMs', 'Communities', 'Live Video', 'AI Reply Suggestions'],
    effect: { mods: { cacheHit: 0.12, hypeGain: 0.2 } },
    unlockCost: 0,
  },
  {
    id: 'video',
    name: 'Streamly',
    emoji: '🎬',
    tagline: 'Binge-watch everything, buffer nothing.',
    twist: 'Payloads are enormous. Bandwidth bills will eat you alive without a CDN.',
    reqPerUser: 120,
    peak: 3,
    cpu: 1.5,
    payloadKB: 2500,
    dbPerReq: 1,
    arpu: 6,
    tam: 3_000_000,
    growth: 0.0085,
    userValue: 70,
    cac: 12,
    latGood: 300,
    latBad: 2500,
    weights: { latency: 0.3, reliability: 0.3, features: 0.2, bugs: 0.1, price: 0.1 },
    featureNames: ['Autoplay Next', 'Skip Intro', '4K HDR', 'Offline Downloads', 'Profiles', 'Watch Party', 'Recommendations', 'Subtitles in 40 Languages', 'Interactive Episodes', 'Live Sports', 'Spatial Audio', 'Clips'],
    effect: { mods: { bandwidthCost: 1.2 } },
    unlockCost: 0,
  },
  {
    id: 'fintech',
    name: 'Ledgerly',
    emoji: '💳',
    tagline: 'Payments that never double-charge. Probably.',
    twist: 'Huge revenue per user, zero tolerance for downtime. Regulators are watching.',
    reqPerUser: 60,
    peak: 2,
    cpu: 2,
    payloadKB: 10,
    dbPerReq: 6,
    arpu: 6,
    tam: 1_200_000,
    growth: 0.0085,
    userValue: 80,
    cac: 30,
    latGood: 300,
    latBad: 2000,
    weights: { latency: 0.15, reliability: 0.45, features: 0.2, bugs: 0.15, price: 0.05 },
    featureNames: ['Instant Transfers', 'Virtual Cards', 'Split Bills', 'Crypto Wallet', 'Budget Insights', 'Fraud Detection', 'Multi-currency', 'Savings Vaults', 'Buy Now Pay Later', 'Open Banking API', 'Tap to Pay'],
    effect: { mods: { errorMult: 1.6 } },
    unlockCost: 0,
  },
  {
    id: 'game',
    name: 'FragNet',
    emoji: '🎮',
    tagline: 'A multiplayer shooter where every millisecond counts.',
    twist: 'Players notice every millisecond. Evening traffic peaks are brutal.',
    reqPerUser: 1000,
    peak: 4,
    cpu: 0.8,
    payloadKB: 6,
    dbPerReq: 1.5,
    arpu: 4,
    tam: 2_500_000,
    growth: 0.009,
    userValue: 50,
    cac: 8,
    latGood: 60,
    latBad: 350,
    weights: { latency: 0.45, reliability: 0.2, features: 0.2, bugs: 0.1, price: 0.05 },
    featureNames: ['Ranked Mode', 'Battle Pass', 'New Map: Dust3', 'Spectator Mode', 'Clans', 'Cross-play', 'Anti-cheat', 'Season 2', 'Custom Skins', 'Replays', 'Battle Royale Mode', 'Voice Chat'],
    effect: { mods: { serviceTime: 0.6 } },
    unlockCost: 15,
  },
  {
    id: 'ai',
    name: 'PromptForge',
    emoji: '🤖',
    tagline: 'An AI copilot for everything. GPUs not included.',
    twist: 'Every request burns a GPU. Huge prices, huge compute bills, research comes faster.',
    reqPerUser: 40,
    peak: 2.5,
    cpu: 50,
    payloadKB: 20,
    dbPerReq: 2,
    arpu: 6,
    tam: 1_500_000,
    growth: 0.0105,
    userValue: 45,
    cac: 25,
    latGood: 900,
    latBad: 6000,
    weights: { latency: 0.2, reliability: 0.2, features: 0.4, bugs: 0.1, price: 0.1 },
    featureNames: ['Chat UI', 'Longer Context', 'Code Interpreter', 'Image Generation', 'Voice Mode', 'Agents', 'Plugins', 'Fine-tuning', 'Memory', 'Multi-modal Input', 'Reasoning Mode', 'Team Workspaces'],
    effect: { mods: { researchSpeed: 1.3, serverCost: 3 } },
    unlockCost: 30,
  },
  {
    id: 'iot',
    name: 'Thingverse',
    emoji: '📡',
    tagline: 'Every toaster, fridge and lightbulb, phoning home.',
    twist: 'Massive scale, tiny revenue per user. Write-heavy, so caches barely help.',
    reqPerUser: 1000,
    peak: 1.5,
    cpu: 0.3,
    payloadKB: 2,
    dbPerReq: 3,
    arpu: 1.2,
    tam: 15_000_000,
    growth: 0.012,
    userValue: 12,
    cac: 1.2,
    latGood: 500,
    latBad: 5000,
    weights: { latency: 0.1, reliability: 0.4, features: 0.25, bugs: 0.15, price: 0.1 },
    featureNames: ['Firmware OTA', 'Voice Assistant', 'Energy Dashboard', 'Geofencing', 'Matter Support', 'Automations', 'Edge Rules', 'Device Groups', 'Predictive Maintenance', 'Mesh Networking'],
    effect: { mods: { cacheHit: -0.25 } },
    unlockCost: 45,
  },
];

export function getProduct(id: string): Product {
  return PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];
}
