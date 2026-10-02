import type { TechId } from '../engine/types';

export type Branch = 'capacity' | 'data' | 'reliability';

export interface Tech {
  id: TechId;
  branch: Branch;
  name: string;
  /** Milestones needed before the node is shown. Keeps a first run to a few choices at a time. */
  stage: number;
  requires: TechId[];
  /** What it unlocks in the game. */
  unlocks: string;
  /** The real concept, in one or two plain sentences. */
  concept: string;
  lo: string;
}

export const BRANCHES: { id: Branch; name: string; lo: string }[] = [
  { id: 'capacity', name: 'Capacity', lo: 'LO2 · LO4' },
  { id: 'data', name: 'Data', lo: 'LO1 · LO2 · LO4' },
  { id: 'reliability', name: 'Reliability', lo: 'LO3 · LO4' },
];

export const TECH: Tech[] = [
  {
    id: 'scaleUp',
    branch: 'capacity',
    name: 'Scale up',
    stage: 0,
    requires: [],
    unlocks: 'Large app servers (2,000 req/s)',
    concept: 'Vertical scaling: a bigger machine. Simple, but there is a ceiling and resizing restarts the server.',
    lo: 'LO2',
  },
  {
    id: 'lb',
    branch: 'capacity',
    name: 'Scale out',
    stage: 1,
    requires: [],
    unlocks: 'Load balancer + extra app instances',
    concept: 'Horizontal scaling: many servers behind a load balancer that splits traffic between them.',
    lo: 'LO2',
  },
  {
    id: 'autoscale',
    branch: 'capacity',
    name: 'Autoscaling',
    stage: 2,
    requires: ['lb'],
    unlocks: 'Adds or removes app instances by load',
    concept: 'Autoscaling reacts after a delay (new servers must boot) and cannot fix a database bottleneck.',
    lo: 'LO2',
  },
  {
    id: 'largerDb',
    branch: 'data',
    name: 'Larger database',
    stage: 0,
    requires: [],
    unlocks: 'Database tiers 3 and 4 (2,500 and 6,000 ops/s)',
    concept: 'A bigger database adds headroom for every query, at a high recurring cost.',
    lo: 'LO2',
  },
  {
    id: 'cache',
    branch: 'data',
    name: 'Read cache',
    stage: 0,
    requires: [],
    unlocks: 'A cache in front of the database (60% hit rate once warm)',
    concept: 'A cache answers repeated reads from memory so they never reach the database. It starts cold and does not help writes.',
    lo: 'LO1 · LO2',
  },
  {
    id: 'cacheTune',
    branch: 'data',
    name: 'Cache tuning',
    stage: 1,
    requires: ['cache'],
    unlocks: 'Raise cache hit rate to 80%',
    concept: 'More memory and better keys raise the hit rate, so fewer reads fall through to the database.',
    lo: 'LO2',
  },
  {
    id: 'hc',
    branch: 'reliability',
    name: 'Health checks',
    stage: 1,
    requires: [],
    unlocks: 'Load balancer stops sending traffic to dead instances',
    concept: 'A health check pings each instance. Unhealthy ones are taken out of rotation, but only if a load balancer exists.',
    lo: 'LO3',
  },
  {
    id: 'spare',
    branch: 'reliability',
    name: 'Spare instance',
    stage: 2,
    requires: [],
    unlocks: 'A warm standby instance you can promote in 1 step',
    concept: 'N+1 redundancy: keep one more server than you need so a failure does not cost capacity.',
    lo: 'LO3',
  },
  {
    id: 'failover',
    branch: 'reliability',
    name: 'Automatic failover',
    stage: 2,
    requires: ['hc', 'spare', 'lb'],
    unlocks: 'Failed instances are replaced and restarted automatically',
    concept: 'Failover swaps in healthy capacity without a human. It still fails if the survivors lack capacity.',
    lo: 'LO3 · LO4',
  },
];

export const techById = (id: TechId): Tech => TECH.find((t) => t.id === id)!;
