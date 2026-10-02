# Evaluation: targets, thresholds and how they are measured

This updates §2 ("Success targets and validation plan") of the proposal with the professor's feedback. The four primary targets are unchanged. We add **secondary organic targets** and **observation thresholds** for next week's user sessions. All numbers are constants in `src/sdt/report.ts` and appear live on the facilitator dashboard (`/#/stats`).

## 1. Primary targets: recruited, facilitated cohort (unchanged)

| # | Target | How the build measures it |
| --- | --- | --- |
| 1 | Independent completion ≥ 70% | `run_start` → first `incident_resolved` within 15 min of wall-clock time, with no "Facilitator helped" tally in between. In-game hints are allowed and logged (`hint`). |
| 2 | Median enjoyment ≥ 4/5 | The end-of-run screen asks "How enjoyable was this play session?" (1–5) **before** showing any results or tips (`survey`). |
| 3 | Voluntary replay ≥ 30% | A second `run_start` followed by at least one gameplay `action` in that run. |
| 4 | Paired learning results | Paper / form-based, as in the proposal. The game supplies the shared vocabulary (bottleneck, headroom, cache hit rate, health checks). |

## 2. Secondary targets: organic interest (new)

The professor's point: the four targets above measure the recruited cohort, but a landing page, public beta and analytics also tell us whether the game attracts people **on its own**.

| Target | Goal | Definition |
| --- | --- | --- |
| Landing-page sign-ups by **PR1 (11 Oct)** | **≥ 30** | Distinct players who submit the email form on the landing page (`signup`, `where: landing`) by 11 Oct 23:59 SGT. Conversion vs. `landing_view` is shown alongside. |
| Unprompted beta players by **PR2 (26 Oct)** | **≥ 20** | Distinct organic players (never in a facilitated session) who start a run **and make at least one gameplay decision**, by 26 Oct. Bounces do not count. |
| Second run without a facilitator | **≥ 25%** of unprompted beta players | Of those players, the share who start run 2 and make a decision in it. Facilitated sessions are excluded by definition. |

Source attribution: each session records `?ref=` / `utm_source` / the referrer host, so the dashboard shows which channel the organic players came from. Use links like `…/?ref=telegram`, `…/?ref=tiktok` and `…/?ref=cs3216`.

**Why these numbers.** PR1 gives about one week of landing-page promotion in NUS Computing / CS3216 / Telegram channels. 30 sign-ups is a modest bar that still shows pull beyond the 10 people we test with directly. 20 unprompted players by PR2 is the size of the evaluation cohort. 25% sits just under the 30% facilitated replay target, because nobody is in the room nudging.

## 3. Observation thresholds for next week (~5 users)

Go / no-go signals for the current design. Each is "at least N of the group":

| Signal | Threshold (of 5) | Logged as |
| --- | --- | --- |
| Asks to play again **or** to join a future test, unprompted | **≥ 1** | Tally "Asked to play again" / "Asked to join future tests", or the in-game "Want to test the next version?" form |
| Resolves the first incident without facilitator help | **≥ 3** | Automatic (see primary target 1) |
| Names the bottleneck and why their fix worked (post-play question) | **≥ 3** | Tally "Explained bottleneck + fix" |
| Starts a second run on their own | **≥ 2** | Automatic |
| Median enjoyment | **≥ 4** | Automatic |

Also tally "Stuck > 30 s" (no idea what to do next). More than 2 per session on average means the first run is still too dense, and we trim further before week 3.

**If a threshold fails:** asks / replay low → work on fun and pacing (spike drama, shorter days). Resolves / explains low → work on clarity (hint timing, red-box salience, postmortem wording). Do not add features until both pass.

## 4. Facilitator protocol

1. Open `/#/stats` on the test laptop and press **New participant**. This clears the previous tester's id, run count and save.
2. Open the game in a tab as `/?fac=1&seed=20261006#/play`. `fac=1` marks the session as facilitated for that tab only. A fixed `seed` gives every tester the same build and first incident (the first incident is fixed for all seeds anyway).
3. Do not explain. Record help with the **Facilitator helped** button. Tally observations as they happen.
4. When the end-of-run enjoyment question appears, step back and let them answer before you discuss anything.
5. After the session, **Export .jsonl**. Import every laptop's export into one dashboard to see the whole cohort.

## 5. Collecting organic data

Organic players are on their own devices, so their events must reach a server:

- Set `VITE_ANALYTICS_URL` in Vercel to any endpoint that accepts a POSTed JSON array of events (for example a Google Apps Script web app that appends rows to a Sheet, or a tiny Supabase function). Events are sent with `navigator.sendBeacon`, batched every 3 s and on page hide.
- Set `VITE_SIGNUP_URL` to receive `{ email, where, t }` from both sign-up forms.
- Download what the endpoint collected as JSON lines and use **Import…** on the dashboard to compute the secondary targets.

Without these variables, everything still works locally (events and sign-ups stay in that browser), which is enough for facilitated sessions.

## Suggested wording for the proposal

> **Secondary targets: organic interest.** Our primary targets measure a recruited, facilitated cohort. Because we also run a landing page and a public beta with analytics, we track three organic indicators: (5) at least 30 landing-page sign-ups by PR1 (11 Oct); (6) at least 20 unprompted beta players (organic players who start a run and make a decision) by PR2 (26 Oct); and (7) at least 25% of those players starting a second run with no facilitator present. Organic players are identified by the absence of a facilitated-session flag, and traffic sources are attributed through referral links.
>
> **Observation thresholds (week 2).** With about five observed users, we treat the current design as promising if at least one user asks to play again or join a future test unprompted, at least three resolve the first incident without help and can explain why their fix worked, at least two start a second run on their own, and median enjoyment is at least 4. Otherwise we revise the first run before adding scope.
>
> **First-run calibration.** The first run uses progressive disclosure: three tech-tree options at the start and three more at each of the first two milestones. Engineer allocation, technical debt and deployment timing are deferred, and the first incident offers about three sensible responses.
