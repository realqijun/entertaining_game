# CLAUDE.md

This file guides Claude Code (claude.ai/code) when it works with code in this repository.

## Project overview

**99.99% — System Design Tycoon** is a browser strategy game for computing students. You are the technical lead of a growing startup. Grow from 50k to 1M users by designing the system behind it (app instances, load balancer, read cache, database) and recovering from the incidents your design causes. Each incident ends with a postmortem. It is a static single-page app on Vercel with no backend. Saves live in `localStorage`. Playtest analytics can post to a configurable endpoint.

The group's project proposal (MVP scope, learning outcomes LO1–LO4, success targets) is the source of truth for scope. See `docs/MVP_SCOPE.md` and `docs/EVALUATION.md`.

## Tech stack

- TypeScript (strict), React 19, Vite 8. The 2D canvas is inline SVG; there is no canvas or 3D library.
- Vitest for tests
- npm (lockfile committed)
- Vercel (`vercel.json`: framework `vite`, output `dist`)

## Commands

- Install dependencies: `npm install`
- Run locally: `npm run dev` (http://localhost:5173)
- Build: `npm run build` (typechecks, then `vite build` into `dist/`)
- Run tests: `npm test`
- Run only the game's tests: `npx vitest run tests/sdt`
- Run a single test: `npx vitest run tests/sdt/engine.test.ts -t "worked example"`
- Typecheck only: `npm run typecheck`

## Architecture

```
src/main.tsx          Entry point → src/sdt/App.tsx
src/sdt/engine/       Pure, deterministic simulation (no React, no DOM)
  sim.ts              newGame, computeMetrics (the request pipeline), advanceDay, liveStep
  actions.ts          Every player action; returns an error string or null
  postmortem.ts       Incident trace → cause / impact / what helped / prevention
src/sdt/content/      balance.ts (all tunable numbers), tech.ts (9-node tree), events.ts (traffic + failure schedule)
src/sdt/ui/           React: Landing, Game, Canvas (SVG architecture), Inspector, Panels (HUD/metrics/incident bar), Modals, Stats
src/sdt/analytics.ts  Playtest events (localStorage + optional VITE_ANALYTICS_URL), cohort and source detection, sign-ups
src/sdt/report.ts     Success targets, observation thresholds, and the report computed from events
tests/sdt/            Engine and report tests, plus a heuristic bot (bot.ts: smart / reactive / idle) for balance guards
```

`src/engine`, `src/content`, `src/three`, `src/ui`, `src/meta.ts`, `src/App.tsx`, `src/styles.css`, and `tests/*.ts` at the top level hold the previous game (Big-O Tycoon). Nothing imports them any more and they are due for deletion. Do not build on them.

- **State** is one serializable `GameState` (`src/sdt/engine/types.ts`), mutated in place by the engine. The UI keeps it in a ref (`src/sdt/ui/useGame.ts`) and bumps a version to re-render. Never put functions, `Set`s or class instances in it.
- **Two modes.** `day`: `advanceDay` is one management turn. Pending changes complete overnight, traffic grows, the day's peak is evaluated, and events fire. `live`: `liveStep` is one real-time step (15 game minutes). Builds count down in steps, caches warm, a backlog builds and drains, and the incident is declared, tracked and resolved. A day whose peak overloads, or whose instance crashes, switches to `live`.
- **Pipeline model** (`computeMetrics`): admitted traffic → up instances (a load balancer without health checks still sends a share to dead ones; booting instances get none) → cache (hit × warm × cacheable share of reads) → database ops. System capacity = min(app capacity, DB capacity ÷ ops per request). Latency = 40 + 25/(1 − u) ms plus backlog wait. Above capacity, a bounded backlog fills and the overflow fails.
- **Incidents.** An overload is declared after `BAL.overloadSteps` overloaded steps; a failure as soon as traffic reaches a dead instance. Recovery takes `BAL.recoverSteps` steps in a row with latency < 500 ms, errors < 1% and no dead routing. The trace (actions with `helpful` / `why`, auto events, hints, inspections) feeds the postmortem.
- **Decisions that pause the game** go in `s.pending` (postmortem, milestone). The loop does not run while `pending` is non-empty.
- **Randomness:** only `rand` / `randInt` from `src/sdt/engine/rng.ts` inside the engine and content, so a seed and an action sequence reproduce a run. `Math.random` is fine in UI-only code (ids, seeds for new runs).
- **Content ids** (tech ids, event ids) are referenced from saves, so keep them stable.

## Conventions

- Keep the engine free of UI imports. UI calls `actions.ts` through `act((s) => …)` from `useGame`. Track gameplay decisions with `track('action', …)` in `Game.tsx`.
- **First-run calibration matters** (professor feedback): do not add always-visible actions. New options should appear progressively (tech `stage`, ghost nodes, inspector sections gated on research or milestones).
- When changing numbers in `content/balance.ts` or `events.ts`, run `npx vitest run tests/sdt`. Guards: smart and reactive bots must reach 1M users on seeds 1–10 by day 45, an idle bot must not, and the first incident must stay the day-6 database overload.
- Player-facing copy is plain and short, and each tech/postmortem line should teach a real system-design concept accurately (simplified, not production advice).
- Styling lives in `src/sdt/styles.css` (CSS variables on `:root`, dark theme). Layouts must work down to 390px wide with no horizontal scroll. The canvas switches to a vertical layout at ≤ 640px.
- Sounds are synthesized in `src/sdt/ui/sfx.ts`. Apart from `public/og.png` and the favicon there are no binary assets.
- Add or update tests alongside engine or report changes.
