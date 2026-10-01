export type TeamId = 'product' | 'sre' | 'rnd' | 'refactor';
export const TEAMS: TeamId[] = ['product', 'sre', 'rnd', 'refactor'];

/** Multiplicative modifiers start at 1 and are multiplied together. */
export type MulKey =
  | 'serverPower'
  | 'cpuPerReq'
  | 'dbCapacity'
  | 'dbPerReq'
  | 'payload'
  | 'serverCost'
  | 'bandwidthCost'
  | 'dbCost'
  | 'salary'
  | 'hireCost'
  | 'featureSpeed'
  | 'researchSpeed'
  | 'bugSpawn'
  | 'bugFix'
  | 'debtPerFeature'
  | 'debtPaydown'
  | 'incidentChance'
  | 'incidentDuration'
  | 'growth'
  | 'arpu'
  | 'tam'
  | 'serviceTime'
  | 'traffic'
  | 'errorMult'
  | 'productivity'
  | 'cac';

/** Additive modifiers start at 0 and are summed. */
export type AddKey = 'cacheHit' | 'cdnOffload' | 'brooks' | 'latencyFloor' | 'satBonus' | 'hypeGain';

export type ModKey = MulKey | AddKey;

export const ADD_KEYS: AddKey[] = ['cacheHit', 'cdnOffload', 'brooks', 'latencyFloor', 'satBonus', 'hypeGain'];

export type Mods = Record<MulKey, number> & Record<AddKey, number> & { flags: Set<string> };

export interface Effect {
  mods?: Partial<Record<ModKey, number>>;
  flags?: string[];
}

export type BranchId = 'algo' | 'infra' | 'data' | 'rel' | 'culture';

export interface SkillNode {
  id: string;
  name: string;
  branch: BranchId;
  tier: number;
  cost: number;
  requires: string[];
  excludes?: string[];
  effect: Effect;
  desc: string;
  lesson: string;
  quizTag?: string;
}

export interface Buff {
  id: string;
  name: string;
  emoji: string;
  daysLeft: number;
  effect: Effect;
  good: boolean;
}

export type ContractKind = 'uptime' | 'users' | 'sat' | 'latency';

export interface Contract {
  id: string;
  name: string;
  kind: ContractKind;
  target: number;
  daysLeft: number;
  duration: number;
  reward: number;
  penalty: number;
  track: { days: number; upSum: number; latSum: number; satMin: number };
}

export interface Star {
  id: string;
  name: string;
  emoji: string;
  trait: string;
  team: TeamId;
  power: number;
  salary: number;
  signing: number;
}

export interface Onboarding {
  team: TeamId;
  days: number;
}

export type Pending =
  | { kind: 'event'; eventId: string; data?: Record<string, number> }
  | { kind: 'board'; cards: string[] }
  | { kind: 'funding'; round: number; cash: number; dilution: number }
  | { kind: 'bridge'; cash: number; dilution: number }
  | { kind: 'ipo' }
  | { kind: 'eureka'; nodeId: string };

export interface LogEntry {
  day: number;
  text: string;
  tone: 'good' | 'bad' | 'info' | 'warn';
}

export interface HistoryPoint {
  day: number;
  users: number;
  cash: number;
  sat: number;
  latency: number;
  revenue: number;
  valuation: number;
}

export interface Metrics {
  rpsPeak: number;
  cpuDemand: number;
  cpuCap: number;
  bwDemand: number;
  bwCap: number;
  dbDemand: number;
  dbCap: number;
  util: { cpu: number; bw: number; db: number };
  latency: number;
  latParts: { cpu: number; bw: number; db: number; floor: number };
  dropRate: number;
  errorRate: number;
  downtime: number;
  satTarget: number;
  satParts: { latency: number; reliability: number; features: number; bugs: number; price: number };
  revenueDay: number;
  costDay: number;
  costs: { salary: number; servers: number; bandwidth: number; db: number; marketing: number };
  growthDay: number;
  tam: number;
  valuation: number;
  effective: Record<TeamId, number>;
  uptime30: number;
  debtDrag: number;
  expectedFeatures: number;
  featureCost: number;
}

export interface GameOver {
  reason: 'time' | 'ipo' | 'bankrupt' | 'acquired';
  valuation: number;
  equity: number;
  score: number;
  stars: number;
  title: string;
}

export interface Tweet {
  day: number;
  handle: string;
  text: string;
  mood: 'happy' | 'angry' | 'meh';
}

export interface RunStats {
  peakUsers: number;
  totalRevenue: number;
  incidents: number;
  featuresShipped: number;
  bugsFixed: number;
  quizCorrect: number;
  quizTotal: number;
  maxDownHours: number;
  rounds: string[];
}

export interface GameState {
  version: number;
  seed: number;
  rng: number;
  day: number;
  productId: string;
  founderId: string;
  difficultyId: string;
  mutators: string[];
  daily: string | null;
  companyName: string;

  cash: number;
  users: number;
  sat: number;
  hype: number;
  equity: number;

  teams: Record<TeamId, number>;
  stars: Star[];
  onboarding: Onboarding[];
  candidates: Star[];

  servers: number;
  bandwidth: number;
  dbNodes: number;
  autoscale: boolean;

  monetization: number;
  marketing: number;

  featurePts: number;
  featureLevel: number;
  features: string[];

  rp: number;
  skills: string[];
  perks: string[];
  regions: string[];

  debt: number;
  bugs: number;
  outageHours: number;
  outageName: string;

  buffs: Buff[];
  contracts: Contract[];
  fundingRound: number;
  pending: Pending[];
  usedEvents: string[];

  history: HistoryPoint[];
  log: LogEntry[];
  tweets: Tweet[];
  uptimeWindow: number[];
  usersWindow: number[];
  metrics: Metrics;
  stats: RunStats;
  codex: string[];

  negativeCashDays: number;
  lastBridgeDay: number;
  ipoOffered: boolean;
  over: GameOver | null;
}

export interface RunConfig {
  productId: string;
  founderId: string;
  difficultyId: string;
  mutators: string[];
  seed: number;
  companyName: string;
  daily?: string | null;
  legacy?: string[];
}
