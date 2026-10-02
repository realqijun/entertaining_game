# 99.99% — System Design Tycoon

An entertainment-first 2D software-company tycoon. You are the technical lead of a growing startup: design how its app servers, load balancer, cache and database work together, survive the incidents your own decisions cause, and read the postmortem to see why. Grow from 50k to **1 million users** in about 12 minutes.

## How it plays

- **Day turns.** Traffic grows every day. Watch utilisation and alerts, then invest: resize or add app servers, upgrade the database, add a read cache, run a promotion. Changes cost cash and land overnight.
- **Incidents in live steps.** When demand exceeds capacity for 3 steps, or an instance crashes, the game switches to real-time steps. Find the limiting component, act (upgrades take a few steps, caches start cold, traffic limiting gives fast relief at a cost), then hold latency < 500 ms and errors < 1% for 5 steps.
- **Postmortems.** Every incident ends with the cause (with real numbers), a load chart, what helped, what did not and why, and what to build before next time.
- **Tech tree.** 9 unlocks over Capacity, Data and Reliability (scale up/out, autoscaling, larger DB, read cache, cache tuning, health checks, spare instance, failover). It is revealed a few nodes at a time, so a first run is not overwhelming.
- **Same event, different solution.** Read-heavy spikes reward caching, write-heavy flash sales need database capacity, and crashes reward health checks and redundancy.

Learning outcomes LO1–LO4 from the proposal map to the tree branches and are named in each postmortem.

## Pages

| URL | What |
| --- | --- |
| `/` | Landing page: pitch, live preview, **Play the beta**, playtest sign-up |
| `/#/play` | The game (resumes a saved run if there is one) |
| `/#/stats` | Facilitator dashboard: primary and secondary targets, observation tallies, export/import |
| `/?fac=1#/play` | A facilitated session (counts towards the recruited cohort) |
| `/?seed=123#/play` | A pinned seed for evaluation sessions |
| `/?ref=telegram` | Attribute organic visitors to a channel |

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests, incl. balance guards with a heuristic bot
npm run build      # typecheck + build into dist/
```

## Deploy

Vercel auto-detects Vite (`vercel.json` included). Optional environment variables:

- `VITE_ANALYTICS_URL`: an endpoint that accepts a POSTed JSON array of playtest events (needed to count organic beta players).
- `VITE_SIGNUP_URL`: an endpoint that receives `{ email, where, t }` from the sign-up forms.

Without them the game is fully playable, and events and sign-ups stay in the browser.

## Docs

- [`docs/MVP_SCOPE.md`](docs/MVP_SCOPE.md): how the build maps to the proposal's MVP, and what was trimmed for a 10–15 minute first run.
- [`docs/EVALUATION.md`](docs/EVALUATION.md): primary and secondary (organic) targets, observation thresholds, facilitator protocol, suggested proposal wording.
