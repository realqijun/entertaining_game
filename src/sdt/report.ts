import type { Ev } from './analytics';

/**
 * Success targets. Primary targets measure the recruited, facilitated cohort (proposal §2).
 * Secondary targets measure organic interest, following the professor's feedback: landing-page
 * sign-ups by PR1, unprompted beta players by PR2, and unfacilitated second runs.
 */
export const TARGETS = {
  primary: {
    completion: { goal: 0.7, label: 'Resolve first incident in ≤15 min without help' },
    enjoyment: { goal: 4, label: 'Median enjoyment (1–5)' },
    replay: { goal: 0.3, label: 'Voluntary replay' },
  },
  secondary: {
    signups: { goal: 30, by: '2026-10-11', label: 'Landing-page sign-ups by PR1' },
    unprompted: { goal: 20, by: '2026-10-26', label: 'Unprompted beta players by PR2' },
    secondRun: { goal: 0.25, label: 'Beta players who start a 2nd run, no facilitator' },
  },
} as const;

/** Thresholds for the week-2 observation sessions (~5 users). Each is "at least N of the group". */
export const OBSERVATION = [
  { id: 'ask', label: 'Asks to play again or join a future test, unprompted', min: 1 },
  { id: 'resolved', label: 'Resolves the first incident without facilitator help', min: 3 },
  { id: 'explained', label: 'Names the bottleneck and why their fix worked', min: 3 },
  { id: 'replayed', label: 'Starts a second run on their own', min: 2 },
] as const;

/** Tally buttons on the facilitator dashboard. */
export const OBS_KINDS = [
  { id: 'ask_again', label: 'Asked to play again' },
  { id: 'ask_join', label: 'Asked to join future tests' },
  { id: 'explained', label: 'Explained bottleneck + fix' },
  { id: 'help', label: 'Facilitator helped' },
  { id: 'stuck', label: 'Stuck > 30 s' },
] as const;

export const FIRST_INCIDENT_LIMIT_MS = 15 * 60 * 1000;

interface Player {
  pid: string;
  cohort: Ev['cohort'];
  src: string;
  /** run index → did the player make a gameplay decision in it */
  runs: Map<number, { start: number; decided: boolean; firstResolved: number | null; ended: boolean }>;
  help: number[];
  obs: Set<string>;
  enjoy: number[];
  joined: boolean;
}

function players(evs: Ev[]): Map<string, Player> {
  const out = new Map<string, Player>();
  const sorted = [...evs].sort((a, b) => a.t - b.t);
  for (const e of sorted) {
    let p = out.get(e.pid);
    if (!p) {
      p = { pid: e.pid, cohort: e.cohort, src: e.src, runs: new Map(), help: [], obs: new Set(), enjoy: [], joined: false };
      out.set(e.pid, p);
    }
    // Anyone seen in a facilitated session counts in the facilitated cohort.
    if (e.cohort === 'facilitated') p.cohort = 'facilitated';
    const run = typeof e.p?.run === 'number' ? e.p.run : null;
    if (e.name === 'run_start' && run !== null) p.runs.set(run, { start: e.t, decided: false, firstResolved: null, ended: false });
    const r = run !== null ? p.runs.get(run) : undefined;
    if (e.name === 'action' && r) r.decided = true;
    if (e.name === 'incident_resolved' && r && r.firstResolved === null) r.firstResolved = e.t;
    if (e.name === 'run_end' && r) r.ended = true;
    if (e.name === 'obs' && typeof e.p?.kind === 'string') {
      p.obs.add(e.p.kind);
      if (e.p.kind === 'help') p.help.push(e.t);
    }
    if (e.name === 'survey' && typeof e.p?.enjoy === 'number') p.enjoy.push(e.p.enjoy);
    if (e.name === 'join_tests') p.joined = true;
  }
  return out;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export interface Report {
  landing: { visitors: number; signups: number; byDeadline: number; conversion: number | null };
  organic: { unprompted: number; byDeadline: number; secondRun: number; secondRunShare: number | null; sources: Record<string, number> };
  facilitated: {
    players: number;
    completed: number;
    completion: number | null;
    enjoyment: number | null;
    enjoyDist: number[];
    replayed: number;
    replay: number | null;
    obs: Record<string, number>;
    asked: number;
    explained: number;
  };
}

const endOfDay = (iso: string) => new Date(`${iso}T23:59:59+08:00`).getTime();

export function buildReport(evs: Ev[]): Report {
  const ps = [...players(evs).values()];
  const landingViews = new Set(evs.filter((e) => e.name === 'landing_view').map((e) => e.pid));
  const signupEvs = evs.filter((e) => e.name === 'signup' && e.p?.where === 'landing');
  const signupPids = new Set(signupEvs.map((e) => e.pid));
  const signupsByPr1 = new Set(signupEvs.filter((e) => e.t <= endOfDay(TARGETS.secondary.signups.by)).map((e) => e.pid));

  const organic = ps.filter((p) => p.cohort === 'organic' && [...p.runs.values()].some((r) => r.decided));
  const pr2 = endOfDay(TARGETS.secondary.unprompted.by);
  const organicByPr2 = organic.filter((p) => [...p.runs.values()].some((r) => r.decided && r.start <= pr2));
  const secondRun = organic.filter((p) => [...p.runs.entries()].some(([i, r]) => i >= 2 && r.decided));
  const sources: Record<string, number> = {};
  for (const p of organic) sources[p.src] = (sources[p.src] ?? 0) + 1;

  const fac = ps.filter((p) => p.cohort === 'facilitated' && p.runs.size > 0);
  const completed = fac.filter((p) => {
    const first = p.runs.get(Math.min(...p.runs.keys()));
    if (!first || first.firstResolved === null) return false;
    if (first.firstResolved - first.start > FIRST_INCIDENT_LIMIT_MS) return false;
    return !p.help.some((t) => t >= first.start && t <= first.firstResolved!);
  });
  const replayed = fac.filter((p) => p.runs.size >= 2 && [...p.runs.entries()].some(([i, r]) => i > Math.min(...p.runs.keys()) && r.decided));
  const enjoys = fac.map((p) => p.enjoy[0]).filter((x): x is number => typeof x === 'number');
  const enjoyDist = [1, 2, 3, 4, 5].map((v) => enjoys.filter((x) => x === v).length);
  const obs: Record<string, number> = {};
  for (const p of fac) for (const k of p.obs) obs[k] = (obs[k] ?? 0) + 1;
  const asked = fac.filter((p) => p.obs.has('ask_again') || p.obs.has('ask_join') || p.joined).length;

  return {
    landing: {
      visitors: landingViews.size,
      signups: signupPids.size,
      byDeadline: signupsByPr1.size,
      conversion: landingViews.size ? signupPids.size / landingViews.size : null,
    },
    organic: {
      unprompted: organic.length,
      byDeadline: organicByPr2.length,
      secondRun: secondRun.length,
      secondRunShare: organic.length ? secondRun.length / organic.length : null,
      sources,
    },
    facilitated: {
      players: fac.length,
      completed: completed.length,
      completion: fac.length ? completed.length / fac.length : null,
      enjoyment: median(enjoys),
      enjoyDist,
      replayed: replayed.length,
      replay: fac.length ? replayed.length / fac.length : null,
      obs,
      asked,
      explained: obs.explained ?? 0,
    },
  };
}
