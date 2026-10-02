import { describe, expect, it } from 'vitest';
import type { Ev } from '../../src/sdt/analytics';
import { buildReport, median } from '../../src/sdt/report';

let t = Date.parse('2026-10-08T10:00:00+08:00');
const ev = (pid: string, name: string, p?: Ev['p'], cohort: Ev['cohort'] = 'organic', dt = 1000): Ev => ({ t: (t += dt), pid, sid: 's', cohort, src: 'telegram', name, p });

describe('playtest report', () => {
  it('counts landing sign-ups before the PR1 deadline', () => {
    const r = buildReport([ev('a', 'landing_view'), ev('a', 'signup', { where: 'landing' }), ev('b', 'landing_view'), ev('c', 'signup', { where: 'endrun' })]);
    expect(r.landing).toMatchObject({ visitors: 2, signups: 1, byDeadline: 1, conversion: 0.5 });
  });

  it('only counts organic players who made a decision, and their unfacilitated second runs', () => {
    const r = buildReport([
      ev('a', 'run_start', { run: 1 }),
      ev('a', 'action', { run: 1 }),
      ev('a', 'run_end', { run: 1 }),
      ev('a', 'run_start', { run: 2 }),
      ev('a', 'action', { run: 2 }),
      ev('b', 'run_start', { run: 1 }), // bounced without deciding anything
      ev('c', 'run_start', { run: 1 }),
      ev('c', 'action', { run: 1 }),
      ev('c', 'run_start', { run: 2 }), // second run, but no decision
      ev('f', 'run_start', { run: 1 }, 'facilitated'),
      ev('f', 'action', { run: 1 }, 'facilitated'),
      ev('f', 'run_start', { run: 2 }, 'facilitated'),
      ev('f', 'action', { run: 2 }, 'facilitated'),
    ]);
    expect(r.organic.unprompted).toBe(2);
    expect(r.organic.secondRun).toBe(1);
    expect(r.organic.secondRunShare).toBe(0.5);
  });

  it('scores facilitated completion, enjoyment and replay', () => {
    const r = buildReport([
      ev('x', 'run_start', { run: 1 }, 'facilitated'),
      ev('x', 'action', { run: 1 }, 'facilitated'),
      ev('x', 'incident_resolved', { run: 1 }, 'facilitated'),
      ev('x', 'survey', { run: 1, enjoy: 5 }, 'facilitated'),
      ev('x', 'obs', { kind: 'ask_again' }, 'facilitated'),
      ev('y', 'run_start', { run: 1 }, 'facilitated'),
      ev('y', 'obs', { kind: 'help' }, 'facilitated'),
      ev('y', 'incident_resolved', { run: 1 }, 'facilitated'),
      ev('y', 'survey', { run: 1, enjoy: 3 }, 'facilitated'),
      ev('z', 'run_start', { run: 1 }, 'facilitated'),
      ev('z', 'incident_resolved', { run: 1 }, 'facilitated', 16 * 60 * 1000), // too slow
      ev('z', 'survey', { run: 1, enjoy: 4 }, 'facilitated'),
    ]);
    const f = r.facilitated;
    expect(f.players).toBe(3);
    expect(f.completed).toBe(1);
    expect(f.enjoyment).toBe(4);
    expect(f.enjoyDist).toEqual([0, 0, 1, 1, 1]);
    expect(f.asked).toBe(1);
  });

  it('median handles even and empty lists', () => {
    expect(median([])).toBeNull();
    expect(median([1, 4, 3, 2])).toBe(2.5);
  });
});
