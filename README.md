# O( Big-O Tycoon )

A startup-scaling strategy game for computer science students. Turn a garage project into a unicorn by balancing **engineers, servers, bandwidth and databases** against **user happiness and money**, while climbing a tech tree of real CS.

## How it plays

- **Architecture pipeline**: requests flow through Bandwidth → Compute → Database. Each layer behaves like a queue, so latency explodes as load nears 100%, and past 100% requests get dropped. Over-provision and you burn cash. Under-provision and users rage-tweet.
- **Engineering teams**: Product ships features, SRE fixes bugs and outages, R&D earns research points, and Refactor pays down tech debt. Hiring follows Brooks's Law: output grows sub-linearly and new hires need ramp-up time.
- **Tech tree** (50+ techs across 5 branches): Binary Search → BST → Ternary Search Tree, caching, CDNs, sharding, Raft consensus, chaos engineering, Grover's algorithm… After each one, answer a CS quiz question for a research refund. Rival picks (Monolith vs Microservices, SQL vs NoSQL, Serverless vs Bare Metal) shape your build.
- **Business**: pricing (price elasticity), marketing, VC rounds that dilute your stake, contracts, and quarterly board meetings where you draft 1 of 3 strategy cards.
- **Global expansion**: unlock Europe, Asia-Pacific, Africa… and eventually Low Earth Orbit and a Mars Colony, if your stack can handle it.
- **Score** = valuation × your equity × difficulty and mutator multipliers. IPO early for a bonus.

## Replayability

- **6 products**, each with a different load profile: social (read-heavy, viral), video (bandwidth-bound), fintech (zero downtime), multiplayer game (latency-critical), AI (GPU-bound), IoT (write-heavy, huge scale).
- **5 founders** with different perks.
- **Difficulty as complexity classes**: O(1), O(log n), O(n), O(n²), O(2ⁿ).
- **8 world mutators** that each bend one law of computing: Interplanetary (speed-of-light latency), Cosmic Rays (bit flips), Moore's Law Is Dead, Byzantine Cloud, Zipf's Revenge, Legacy COBOL, Green Mandate, Hype Cycle.
- **Random events and paradigm shifts**, a seeded **Daily Challenge** with a shareable result, a **Codex** of CS concepts you discover by running into them, achievements, and a **Legacy** meta-progression (★ stars unlock content and perks).

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # outputs dist/
```

## Deploy to Vercel

Import the repository in Vercel. It auto-detects Vite (`vercel.json` is included): the build command is `npm run build` and the output directory is `dist`. No environment variables or backend are needed. Progress is saved in the browser's localStorage.
