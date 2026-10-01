# CLAUDE.md

This file guides Claude Code (claude.ai/code) when it works with code in this repository.

## Project overview

**Big-O Tycoon** is a browser strategy game for computer science students. You scale a startup over 5 in-game years: allocate engineers across teams, provision servers, bandwidth and database nodes, research a tech tree of real CS concepts, raise VC rounds, expand into regions, and try to IPO. It is a static single-page app deployed on Vercel, with no backend. All persistence lives in `localStorage`.

## Tech stack

- TypeScript (strict), React 19, Vite 8, three.js (3D scene with bloom post-processing)
- Vitest for tests
- npm (lockfile committed)
- Vercel (`vercel.json`: framework `vite`, output `dist`)

## Commands

- Install dependencies: `npm install`
- Run locally: `npm run dev` (http://localhost:5173)
- Build: `npm run build` (typechecks, then `vite build` into `dist/`)
- Preview the production build: `npm run preview`
- Run tests: `npm test`
- Run a single test: `npx vitest run tests/engine.test.ts -t "research spends RP"`
- Typecheck only: `npm run typecheck`
- Balance report (headless bot over every product × 3 seeds, smart vs. idle): `BALANCE=1 BALANCE_OUT=/tmp/balance.txt npx vitest run tests/balance.report.test.ts`. Optional env vars: `DIFF=on2`, `FOUNDER=indie`.
- Day-by-day trace of one bot run: `TRACE=social BALANCE_OUT=/tmp/trace.txt npx vitest run tests/trace.report.test.ts`

## Architecture

```
src/engine/   Pure, deterministic simulation (no React, no DOM)
src/content/  Game data: products, founders, skills, events, cards, regions, quiz, codex, mutators, difficulties
src/three/    three.js diorama (DataCenter.ts): racks, packets, bugs, fires, golden packets
src/ui/       React components: HUD, dock, drawers, modals, World3D bridge, SVG icon set, WebAudio sfx
src/meta.ts   Cross-run progression (stars, unlocks, achievements, daily challenge, save/load)
src/App.tsx   Screen router (menu / setup / legacy / game)
tests/        Vitest unit tests plus a heuristic bot (tests/bot.ts) used for balance guards
```

- **State** is a single serializable `GameState` (`src/engine/types.ts`). The engine mutates it in place. The UI holds it in a ref (`src/ui/useGame.ts`) and bumps a version counter to re-render. Never put functions, `Set`s or class instances in `GameState`, because it is saved as JSON.
- **Game loop**: `tick(s)` in `src/engine/sim.ts` advances one day. Order: compute modifiers, autoscale, compute metrics, engineering output (features/RP/debt/bugs), incidents, satisfaction, logistic user growth plus marketing, money, buffs and contracts, then periodic triggers (candidates every 30 days, board meeting every 90, random events, funding offers, IPO offer) and the end check (day 1825 or bankruptcy).
- **Modifiers**: every effect source (product, founder, mutators, skills, card perks, star traits, temporary buffs) is an `Effect` of multiplicative (`MulKey`) or additive (`AddKey`) mods plus string flags. `computeMods(s)` in `src/engine/mods.ts` folds them all together. To add a new effect, add the key to `types.ts` (and to `MUL_KEYS` / `ADD_KEYS`), then consume it in `sim.ts`.
- **Metrics** (`computeMetrics`) model three pipelines (bandwidth, compute, DB) as M/M/1 queues: latency = service ÷ (1 − utilization), and load above 100% drops requests. Satisfaction is a product-weighted mix of latency, reliability, features, bugs and price.
- **Decisions that pause the game** go in `s.pending` (event choices, board cards, funding, bridge loan, IPO). The loop does not tick while `pending` is non-empty. Resolve them through `src/engine/actions.ts`.
- **Randomness**: always use `rand(s)` / `pick(s, …)` from `src/engine/rng.ts` (a seeded mulberry32 stored in `s.rng`) inside the engine and content. That keeps runs and the daily challenge deterministic. `Math.random` is only acceptable in UI-only code (e.g. which quiz question to show, visual effects).
- **3D scene**: `World3D.tsx` turns `GameState` into a `SceneState` snapshot each render (`sceneStateOf`). `DataCenter` animates it in its own requestAnimationFrame loop and never touches `GameState`. Clicks on bugs, fires and golden packets come back through `onPick` and are applied with `actions.ts` (`squashBug`, `extinguish`, `catchGolden`). HTML zone tags are positioned each frame from `onAnchors`.
- **Content** is plain data plus small functions. Events and cards are referenced by id from state, so ids must stay stable once shipped (saves depend on them).

## Conventions

- Keep the engine free of UI imports. The UI calls `actions.ts` functions through `act((s) => …)` from `useGame`.
- When changing balance numbers, run the balance report before and after. `tests/engine.test.ts` has guards: a competent bot must reach $1B on every product, and an idle bot must not.
- Player-facing copy is plain and friendly. Each skill, mutator and codex entry should teach a real CS concept accurately.
- Styling lives in `src/styles.css` (CSS variables on `:root`, dark theme). Layouts must work down to 390px wide with no horizontal scroll.
- Keep on-screen copy short: icons and numbers first, with details in `title` tooltips. Sounds are synthesized in `src/ui/sfx.ts`, and icons are inline SVG components in `src/ui/Icons.tsx`, so there are no binary assets apart from `public/og.png`.
- Instanced meshes in the scene must keep `frustumCulled = false`, because they start empty and a stale bounding sphere would hide them.
- Add or update tests alongside engine behaviour changes.
