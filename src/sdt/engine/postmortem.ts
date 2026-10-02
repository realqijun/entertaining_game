import { BAL } from '../content/balance';
import type { Incident } from './types';

export interface Postmortem {
  title: string;
  cause: string;
  impact: string[];
  worked: string[];
  didNot: string[];
  prevent: string;
  concept: string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const n = (v: number) => Math.round(v).toLocaleString();

/** Turn an incident's trace into a blameless postmortem: cause, recovery and prevention. */
export function postmortem(inc: Incident): Postmortem {
  const w = inc.workload;
  const steps = (inc.endStep ?? inc.startStep) - inc.startStep;
  let title: string;
  let cause: string;
  let prevent: string;
  let concept: string;

  if (inc.variant === 'db') {
    title = 'Database overload';
    const hit = inc.start.cacheHit > 0 ? ` after a ${pct(inc.start.cacheHit)} cache hit rate` : ' with no cache in front';
    cause = `${inc.trigger}. With ${pct(w.read)} reads${hit}, the database received ${n(inc.start.dbOps)} ops/s against a capacity of ${n(inc.start.dbCap)} (${pct(inc.peakDbUtil)}). Work queued up, latency rose and requests timed out.`;
    prevent =
      w.read >= 0.7
        ? 'Read-heavy spikes are what caches are for. Add or tune a read cache before the next promotion, or keep database headroom above 30%.'
        : 'This spike was write-heavy, so a cache helps less. Database capacity is the reliable lever for writes.';
    concept = 'LO1: the slowest dependency limits the whole system. More app servers would not have helped.';
  } else if (inc.variant === 'app') {
    title = 'App server overload';
    cause = `${inc.trigger}. The app servers could handle ${n(inc.start.appCap)} req/s and ran at ${pct(inc.peakAppUtil)}. The database still had headroom.`;
    prevent = 'Scale up for a quick bigger box, or scale out behind a load balancer so you can keep adding instances. Autoscaling adds them for you, after a boot delay.';
    concept = 'LO2: vertical vs. horizontal scaling. Both add app capacity; only scaling out has no single-machine ceiling.';
  } else {
    title = 'App instance failure';
    cause = `${inc.trigger}. ${inc.peakErr >= 0.99 ? 'It was the only instance serving traffic, so every request failed.' : `Traffic kept arriving at the dead instance, so ${pct(inc.peakErr)} of requests failed.`}`;
    prevent = 'Health checks take a dead instance out of rotation (with a load balancer). A spare instance and automatic failover replace it without you.';
    concept = 'LO3: redundancy only helps if traffic is routed away from the failure and the survivors have enough capacity.';
  }

  const actions = inc.trace.filter((t) => t.kind === 'action');
  const worked = actions.filter((a) => a.helpful).map((a) => `Step ${a.step - inc.startStep >= 0 ? a.step - inc.startStep : 0}: ${a.text}${a.why ? `. ${a.why}` : ''}`);
  const didNot = actions.filter((a) => a.helpful === false).map((a) => `${a.text}. ${a.why ?? ''}`.trim());
  const autos = inc.trace.filter((t) => t.kind === 'auto').map((a) => a.text);
  worked.push(...autos);

  const impact = [
    `Recovered in ${steps} steps (${steps * 15} min of game time).`,
    `Peak latency ${n(inc.peakLatency)} ms, peak errors ${pct(inc.peakErr)}.`,
    `About $${n((inc.failed + inc.rejected) * (BAL.revenuePerRps / 12))} in lost sales and refunds${inc.rejected > 0 ? ', partly from traffic you chose to reject' : ''}.`,
    `Reputation −${inc.repLost.toFixed(1)}. Recovery needed latency < ${BAL.latencyOk} ms and errors < ${BAL.errOk * 100}% for ${BAL.recoverSteps} steps.`,
  ];
  if (inc.hints) impact.push(`${inc.hints} hint${inc.hints > 1 ? 's' : ''} used.`);

  return { title, cause, impact, worked, didNot, prevent, concept };
}
