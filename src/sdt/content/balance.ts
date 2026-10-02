import type { Size } from '../engine/types';

/**
 * Tunable numbers for the campaign. Week 2 of the proposal tunes the growth target and
 * starting budget, so they live here rather than inside the simulation.
 */
export const BAL = {
  startCash: 1200,
  startRep: 75,
  startRps: 250,
  /** Displayed users per peak request/s. */
  usersPerRps: 200,
  /** Daily organic growth at reputation 75. */
  growth: 0.11,
  /** Revenue per peak request/s per day (average load is ~60% of peak). */
  revenuePerRps: 0.45,
  /** Live steps per in-game day (15-minute steps), used to weight availability. */
  stepsPerDay: 96,
  lastDay: 45,
  maxInstances: 10,
  /** Overload must persist this many steps before an incident is declared. */
  overloadSteps: 3,
  /** Healthy steps in a row needed to recover. */
  recoverSteps: 5,
  /** Recovery thresholds from §7.3 of the proposal. */
  latencyOk: 500,
  errOk: 0.01,
  promo: { cost: 500, days: 2, mult: 1.4, permanent: 0.15 },
  limits: [1, 0.8, 0.6, 0.4],
} as const;

export const SIZES: Record<Size, { cap: number; cost: number; label: string }> = {
  S: { cap: 500, cost: 25, label: 'Small' },
  M: { cap: 1000, cost: 50, label: 'Medium' },
  L: { cap: 2000, cost: 110, label: 'Large' },
};

/** Database tiers: ops/s, daily cost, one-time upgrade cost. Tiers 2+ need "Larger database". */
export const DB_TIERS = [
  { cap: 600, cost: 30, upgrade: 0 },
  { cap: 1200, cost: 70, upgrade: 300 },
  { cap: 2500, cost: 160, upgrade: 600 },
  { cap: 6000, cost: 380, upgrade: 1200 },
] as const;

export const CACHE = { hit: 0.6, tunedHit: 0.8, warmPerStep: 0.25, cost: 40, setup: 250, tuneCost: 40, tuneSetup: 300 };

/** One-time cost, daily cost and activation delay (live steps) of each change. */
export const BUILD = {
  db: { delay: 4 },
  cache: { delay: 2 },
  cacheTune: { delay: 2 },
  lb: { delay: 2, setup: 200, cost: 25 },
  hc: { delay: 1, setup: 100, cost: 5 },
  autoscale: { delay: 1, setup: 150, cost: 0 },
} as const;

export const INSTANCE_DELAY = { boot: 3, resize: 3, restart: 4, promote: 1 };

/** Users needed for each milestone. The last one wins the run. */
export const MILESTONES = [
  { users: 100_000, cash: 1000, title: 'Angel round' },
  { users: 200_000, cash: 2000, title: 'Seed round' },
  { users: 500_000, cash: 4000, title: 'Series A' },
  { users: 1_000_000, cash: 0, title: '1 million users' },
] as const;
