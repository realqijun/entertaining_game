# MVP scope: what is built, and what was trimmed

This maps the build to §3.1 ("Defined MVP scope") and §7 ("High-Level Design") of the proposal. It also records how we cut the first run's decisions after the professor's feedback:

> I feel like there are too many actions for a 10–15 minute first run… For the MVP, I would trim some and ensure the game is fun.

## Built (proposal → game)

| Proposal | In the game |
| --- | --- |
| One company, 10–15 min run, fixed milestone sequence | 50k → 100k → 200k → 500k → **1M users**. A run lasts ~25–30 in-game days (bots: day 23 when planning ahead, day 28 when only reacting). Hard stop at day 45. |
| Win: final growth target while solvent with no active incident | `checkEnd` in `src/sdt/engine/sim.ts`. Losing: cash < 0, reputation 0, or day 45. |
| Opening system: one app instance + one database | One Medium instance (1,000 req/s) and a 600 ops/s database. |
| App instances, one DB, optional read cache, optional load balancer | All four components, drawn on a 2D canvas (`Canvas.tsx`). It lays out left to right on desktop and top to bottom on phones. |
| Metrics, history and alerts from the start | Traffic, latency and error tiles with sparklines, utilisation bars, alert list, and a per-component inspector. |
| Incident family 1: capacity overload (app / DB variants) | Declared after **3 consecutive overloaded steps**. The variant is whichever component limits throughput. |
| Incident family 2: temporary app-instance failure | Seeded crashes on bounded days. Without a load balancer the only instance is down. A load balancer without health checks keeps routing to the dead instance. Health checks route around it. |
| Recovery: latency < 500 ms and errors < 1% for 5 steps | `BAL.latencyOk`, `BAL.errOk`, `BAL.recoverSteps`. The incident bar shows what is still blocking recovery. |
| Day turns, incidents in short real-time steps | Day mode auto-advances (pause / +1 day / fast-forward). Live mode runs 15-minute game steps about once a second. |
| Actions: promotions, add/resize servers, route traffic, upgrade DB, add/tune cache, add redundancy, traffic limiting, restart | All present (see "first-run budget" for when each appears). |
| §7.4 worked example | The first incident on every seed is a viral read-heavy spike on day 6. The 600 ops/s DB gets ~880 ops/s; cache, upgrade or limit each fixes it. A unit test checks the 900 × (1 − 0.8 × 0.6) = 468 arithmetic. |
| 9-unlock skill tree, three branches (§7.5) | `src/sdt/content/tech.ts`: Scale up / Scale out → Autoscaling; Larger DB / Read cache → Cache tuning; Health checks + Spare → Failover (needs LB). |
| Postmortems | Built from the incident trace: cause with real numbers, load chart, impact, what helped, what did not (and why), prevention, linked learning outcome. |
| Seeded, reproducible runs | `?seed=123` pins a run. The same seed and actions give the same run (unit-tested). |
| Run reset / save | Auto-save to localStorage, continue from the landing page, play again from the end screen. |
| Landing page + CTA, playtest analytics | Landing page at `/` with "Play the beta" and an email sign-up. Analytics and a facilitator dashboard at `/#/stats` (see `EVALUATION.md`). |

## Trimmed for the first run (professor feedback)

A new player should learn one idea at a time while the clock runs. We kept the depth but changed **when** options appear.

**Cut from the MVP entirely:**

- Engineer allocation and engineering time. Every change costs cash and an activation delay instead.
- Technical debt and scheduled maintenance.
- Deployment timing and testing. Failures come from seeded crashes only.
- Database failover, queues, multi-region (already out of scope in the proposal).

**Progressive disclosure:**

- The tech tree reveals itself in **stages**: 3 nodes at the start, 3 more after the first milestone, the last 3 after the second. Hidden nodes show as `???`.
- The canvas only shows a load balancer or cache once it is researched (as a dashed "+ add" ghost), so the opening diagram is three boxes.
- The inspector only lists actions that are possible now. A locked option is at most one muted line ("🔒 Research Scale out to add instances"). Most of these appear only after the first milestone.
- Only one research point at the start. A first-time player makes at most one tree choice before the first incident.
- Onboarding is 4 short cards. In-incident help is a 3-step hint ladder: where to look → what the numbers mean → the options.

**First-run decision budget (to the end of the first incident, ~3 min):**

| Moment | Decisions available |
| --- | --- |
| Days 1–5 | Spend 1 research point (Scale up / Larger DB / Read cache), upgrade the DB, resize the app server, run a promotion |
| Forecast on day 5 | The same, now with a reason ("Viral blog post tomorrow, read-heavy") |
| Incident on day 6 | Upgrade the DB, add the cache (if researched), limit traffic, or a wrong move (resize the app server) |

That is about 5 distinct actions before the first postmortem, against dozens in the previous build.

## Stack note

The proposal names Next.js + PostgreSQL. The MVP stays a static Vite + React + TypeScript app on Vercel: the simulation runs in the browser, and saves live in localStorage. The only server-side needs are analytics and sign-ups, which post to a configurable endpoint (`VITE_ANALYTICS_URL`, `VITE_SIGNUP_URL`). The Postgres backend (accounts, saved runs, leaderboards) stays a week 3–4 item, as in §4.
