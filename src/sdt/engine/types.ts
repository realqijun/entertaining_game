/** Everything in GameState must stay JSON-serializable: it is saved to localStorage as-is. */

export type Mode = 'day' | 'live';
export type Size = 'S' | 'M' | 'L';
export type Component = 'users' | 'lb' | 'app' | 'cache' | 'db';
export type InstanceStatus = 'up' | 'down' | 'booting' | 'resizing';
export type TechId = 'scaleUp' | 'lb' | 'autoscale' | 'largerDb' | 'cache' | 'cacheTune' | 'hc' | 'spare' | 'failover';
export type Bottleneck = 'app' | 'db';
export type IncidentVariant = 'app' | 'db' | 'instance';

export interface Instance {
  id: number;
  size: Size;
  status: InstanceStatus;
  /** Steps until a booting/resizing instance is up. */
  timer: number;
  /** Size after a resize completes. */
  target?: Size;
  /** Added by autoscaling (and removable by it). */
  auto?: boolean;
}

export type BuildKind = 'db' | 'cache' | 'cacheTune' | 'lb' | 'hc' | 'autoscale';

/** A change that has been paid for and activates after `left` steps (or overnight). */
export interface Build {
  kind: BuildKind;
  label: string;
  left: number;
}

/** A parameterised traffic event: same family, different numbers per seed. */
export interface TrafficEvent {
  id: string;
  name: string;
  day: number;
  days: number;
  mult: number;
  /** Share of requests that are reads. */
  read: number;
  /** Share of reads the cache can serve. */
  cacheable: number;
}

export interface Workload {
  demand: number;
  read: number;
  cacheable: number;
  /** Name of the event or promotion that shaped this workload, if any. */
  cause: string | null;
}

export interface Metrics {
  demand: number;
  admitted: number;
  rejected: number;
  served: number;
  failed: number;
  latency: number;
  errRate: number;
  appCap: number;
  appLoad: number;
  appUtil: number;
  dbCap: number;
  dbOps: number;
  dbUtil: number;
  cacheHit: number;
  read: number;
  /** Fraction of admitted requests sent to instances that are down. */
  downShare: number;
  bottleneck: Bottleneck;
  overloaded: boolean;
  healthy: boolean;
}

export interface Point {
  t: number;
  latency: number;
  errRate: number;
  appUtil: number;
  dbUtil: number;
  demand: number;
}

export type AlertLevel = 'warn' | 'crit';
export interface Alert {
  level: AlertLevel;
  comp: Component;
  text: string;
}

export interface LogEntry {
  day: number;
  tone: 'info' | 'good' | 'warn' | 'bad';
  text: string;
}

export type TraceKind = 'alert' | 'action' | 'ready' | 'inspect' | 'hint' | 'auto';
export interface TraceEntry {
  step: number;
  kind: TraceKind;
  text: string;
  /** For player actions: did it address the incident's limiting component? */
  helpful?: boolean;
  why?: string;
}

export interface Incident {
  id: number;
  kind: 'overload' | 'failure';
  variant: IncidentVariant;
  day: number;
  trigger: string;
  startStep: number;
  endStep: number | null;
  trace: TraceEntry[];
  series: Point[];
  peakAppUtil: number;
  peakDbUtil: number;
  peakErr: number;
  peakLatency: number;
  failed: number;
  rejected: number;
  repLost: number;
  hints: number;
  workload: Workload;
  /** Capacity snapshot at the start, used to explain the cause. */
  start: { appCap: number; dbCap: number; dbOps: number; cacheHit: number };
}

export type Pending =
  | { kind: 'postmortem'; incidentId: number }
  | { kind: 'milestone'; index: number };

export type EndReason = 'win' | 'bankrupt' | 'reputation' | 'timeout';

export interface GameState {
  version: 1;
  seed: number;
  /** Story only: the player's dinosaur founder name. */
  founder?: string;
  rng: number;
  mode: Mode;
  day: number;
  /** Step counter inside the current live (real-time) episode. */
  step: number;
  cash: number;
  rep: number;
  /** Baseline peak requests/s before spikes and promotions. */
  baseRps: number;
  promoDays: number;
  promos: number;
  /** Share of demand admitted (traffic limiting). 1 = no limit. */
  limit: number;
  instances: Instance[];
  nextInstanceId: number;
  standby: Instance | null;
  dbTier: number;
  cache: { on: boolean; tuned: boolean; warm: number };
  lb: boolean;
  hc: boolean;
  autoscale: boolean;
  tech: TechId[];
  rp: number;
  /** How many milestones are reached; also how much of the tech tree is revealed. */
  milestone: number;
  builds: Build[];
  backlog: number;
  workload: Workload;
  metrics: Metrics;
  dayHist: Point[];
  liveHist: Point[];
  alerts: Alert[];
  log: LogEntry[];
  events: TrafficEvent[];
  failureDays: number[];
  incident: Incident | null;
  /** Trace of the current live episode before an incident is declared. */
  liveTrace: TraceEntry[];
  incidents: Incident[];
  nextIncidentId: number;
  overSteps: number;
  healthySteps: number;
  pending: Pending[];
  over: { reason: EndReason; day: number } | null;
  /** Weighted request totals for the availability score. */
  avail: { total: number; failed: number };
  stats: { actions: number; hints: number; inspects: number; promos: number; lostRevenue: number };
}
