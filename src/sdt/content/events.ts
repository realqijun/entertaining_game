import { rand, randInt } from '../engine/rng';
import type { GameState, TrafficEvent } from '../engine/types';

/**
 * Traffic and failure schedule for a run. Ids stay stable because saves reference them.
 * The first incident is fixed (day 6, read-heavy spike) so playtests compare like with like;
 * later events vary by seed within bounds.
 */
export function buildSchedule(s: GameState): { events: TrafficEvent[]; failureDays: number[] } {
  const events: TrafficEvent[] = [
    { id: 'viral', name: 'Viral blog post', day: 6, days: 2, mult: 2, read: 0.85, cacheable: 1 },
    {
      id: 'flashSale',
      name: 'Flash sale',
      day: randInt(s, 15, 18),
      days: 2,
      mult: 1.6 + rand(s) * 0.4,
      read: 0.5,
      cacheable: 0.5,
    },
    {
      id: 'keynote',
      name: 'Conference keynote',
      day: randInt(s, 25, 29),
      days: 2,
      mult: 1.8 + rand(s) * 0.4,
      read: 0.85,
      cacheable: 0.9,
    },
  ];
  const failureDays = [randInt(s, 11, 13), randInt(s, 21, 23), randInt(s, 32, 35)];
  return { events, failureDays };
}

export const NORMAL = { read: 0.8, cacheable: 0.9 };

export function eventOn(s: GameState, day: number): TrafficEvent | null {
  return s.events.find((e) => day >= e.day && day < e.day + e.days) ?? null;
}

export function describeEvent(e: TrafficEvent): string {
  const kind = e.read >= 0.7 ? 'read-heavy' : 'write-heavy';
  return `${e.name}: ×${e.mult.toFixed(1)} traffic, ${kind} (${Math.round(e.read * 100)}% reads)`;
}
