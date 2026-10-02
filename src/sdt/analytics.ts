/**
 * Playtest analytics. Every event is kept in localStorage (so a facilitator laptop can export
 * its sessions) and, when VITE_ANALYTICS_URL is set, batched to that endpoint so organic
 * (public beta) players are counted too. Players get a random id; the only personal data is an
 * email address that someone chooses to leave on the sign-up form.
 */

export type Cohort = 'facilitated' | 'organic';

export interface Ev {
  t: number;
  pid: string;
  sid: string;
  cohort: Cohort;
  src: string;
  name: string;
  p?: Record<string, string | number | boolean | null>;
}

const EVENTS_KEY = 'sdt-events-v1';
const PID_KEY = 'sdt-pid';
const RUNS_KEY = 'sdt-runs';
const FAC_KEY = 'sdt-facilitated';
const SRC_KEY = 'sdt-src';
const SIGNUPS_KEY = 'sdt-signups';
const MAX_EVENTS = 5000;

const ENDPOINT: string | undefined = import.meta.env.VITE_ANALYTICS_URL;
const SIGNUP_ENDPOINT: string | undefined = import.meta.env.VITE_SIGNUP_URL;

function get(store: Storage, k: string): string | null {
  try {
    return store.getItem(k);
  } catch {
    return null;
  }
}
function set(store: Storage, k: string, v: string | null) {
  try {
    if (v === null) store.removeItem(k);
    else store.setItem(k, v);
  } catch {
    /* storage unavailable (private mode, blocked) */
  }
}

const newId = () => Math.random().toString(36).slice(2, 10);

let sid = newId();
let queue: Ev[] = [];
let timer: number | undefined;

export function playerId(): string {
  let id = get(localStorage, PID_KEY);
  if (!id) {
    id = newId();
    set(localStorage, PID_KEY, id);
  }
  return id;
}

/** A facilitator opens the game with ?fac=1. It lasts for this browser tab only. */
export function isFacilitated(): boolean {
  return get(sessionStorage, FAC_KEY) === '1';
}

export function setFacilitated(on: boolean) {
  set(sessionStorage, FAC_KEY, on ? '1' : null);
  track('facilitator', { present: on });
}

export function source(): string {
  return get(sessionStorage, SRC_KEY) ?? 'direct';
}

/** Read ?fac, ?ref and utm_source once per tab, then start a session. */
export function initAnalytics() {
  const q = new URLSearchParams(location.search);
  if (q.get('fac') === '1') set(sessionStorage, FAC_KEY, '1');
  if (q.get('fac') === '0') set(sessionStorage, FAC_KEY, null);
  if (!get(sessionStorage, SRC_KEY)) {
    let src = q.get('ref') ?? q.get('utm_source');
    if (!src && document.referrer) {
      try {
        const host = new URL(document.referrer).host;
        if (host !== location.host) src = host;
      } catch {
        /* bad referrer */
      }
    }
    set(sessionStorage, SRC_KEY, src ?? 'direct');
  }
  sid = newId();
  track('session_start', { path: location.hash || '#/' });
  addEventListener('pagehide', flush);
}

export function track(name: string, p?: Ev['p']) {
  const ev: Ev = { t: Date.now(), pid: playerId(), sid, cohort: isFacilitated() ? 'facilitated' : 'organic', src: source(), name, p };
  const all = events();
  all.push(ev);
  if (all.length > MAX_EVENTS) all.splice(0, all.length - MAX_EVENTS);
  set(localStorage, EVENTS_KEY, JSON.stringify(all));
  if (ENDPOINT) {
    queue.push(ev);
    window.clearTimeout(timer);
    timer = window.setTimeout(flush, 3000);
  }
}

function flush() {
  if (!ENDPOINT || !queue.length) return;
  const body = JSON.stringify(queue);
  queue = [];
  try {
    if (!navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'text/plain' }))) {
      void fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {});
    }
  } catch {
    /* offline */
  }
}

export function events(): Ev[] {
  try {
    return JSON.parse(get(localStorage, EVENTS_KEY) ?? '[]') as Ev[];
  } catch {
    return [];
  }
}

export function clearEvents() {
  set(localStorage, EVENTS_KEY, null);
}

/** Count of runs this player has started on this device (1-based after the call). */
export function nextRunIndex(): number {
  const n = Number(get(localStorage, RUNS_KEY) ?? '0') + 1;
  set(localStorage, RUNS_KEY, String(n));
  return n;
}

export function runCount(): number {
  return Number(get(localStorage, RUNS_KEY) ?? '0');
}

/** On a shared playtest laptop: forget the last participant so the next one counts separately. */
export function newParticipant() {
  set(localStorage, PID_KEY, null);
  set(localStorage, RUNS_KEY, null);
  set(localStorage, 'sdt-save-v1', null);
  set(localStorage, 'sdt-onboarded', null);
  track('participant_new');
}

/** Landing-page sign-up. Posted to VITE_SIGNUP_URL when configured; always kept locally too. */
export async function signup(email: string, where: string): Promise<boolean> {
  const entry = { email, where, t: Date.now() };
  try {
    const list = JSON.parse(get(localStorage, SIGNUPS_KEY) ?? '[]') as unknown[];
    list.push(entry);
    set(localStorage, SIGNUPS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  track('signup', { where });
  if (!SIGNUP_ENDPOINT) return true;
  try {
    const r = await fetch(SIGNUP_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entry) });
    return r.ok;
  } catch {
    return false;
  }
}

export const toJsonl = (evs: Ev[]) => evs.map((e) => JSON.stringify(e)).join('\n');

export function fromJsonl(text: string): Ev[] {
  const t = text.trim();
  if (!t) return [];
  if (t.startsWith('[')) return JSON.parse(t) as Ev[];
  return t
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Ev);
}
