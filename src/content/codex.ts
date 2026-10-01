export interface CodexEntry {
  id: string;
  title: string;
  emoji: string;
  hint: string;
  body: string;
}

/** Real CS concepts the simulation actually models. Entries unlock when you run into them in-game. */
export const CODEX: CodexEntry[] = [
  {
    id: 'queueing', title: 'Queueing Theory', emoji: '📉',
    hint: 'Push a resource above 85% utilization.',
    body: 'Each of your three pipelines (bandwidth, compute, database) acts like an M/M/1 queue. Latency = service time ÷ (1 − utilization). At 50% load, latency doubles. At 90%, it is 10×. At 99%, it is 100×. That hockey stick is why you never run hot and why autoscalers aim for about 65%.',
  },
  {
    id: 'bottleneck', title: 'The Bottleneck', emoji: '🍾',
    hint: 'Overload one layer while the others are idle.',
    body: 'Throughput is limited by the slowest stage of a pipeline (the Theory of Constraints). Adding servers does nothing if the database is the choke point. Find the red gauge first.',
  },
  {
    id: 'brooks', title: "Brooks's Law", emoji: '👥',
    hint: 'Hire several engineers at once.',
    body: "\"Adding manpower to a late software project makes it later.\" New hires need onboarding (they are slow for about 20 days) and communication paths grow as n(n−1)/2. In this game, team output grows like n^0.8: double the team, get about 1.74× the work. Two-Pizza Teams and Microservices raise that exponent.",
  },
  {
    id: 'debt', title: 'Technical Debt', emoji: '💸',
    hint: 'Let tech debt pass 60.',
    body: 'Shipping fast borrows against the future. Debt slows every team (drag = 1 ÷ (1 + debt/150)) and spawns bugs and incidents. Like financial debt, it is not always bad, but the interest compounds.',
  },
  {
    id: 'logistic', title: 'Logistic Growth', emoji: '🦠',
    hint: 'Reach 50% of your total addressable market.',
    body: 'User growth follows dU/dt = r·U·(1 − U/TAM): exponential at first, then flattening as you saturate the market. New features expand your TAM, which raises the ceiling.',
  },
  {
    id: 'nines', title: 'The Nines', emoji: '9️⃣',
    hint: 'Suffer an outage.',
    body: 'Availability is counted in nines: 99% allows 3.65 days of downtime a year, 99.9% allows 8.76 hours, 99.99% allows 52.6 minutes, 99.999% allows 5.26 minutes. Each nine is roughly 10× harder and more expensive.',
  },
  {
    id: 'caching', title: 'Caching & Locality', emoji: '⚡',
    hint: 'Research a caching layer.',
    body: 'Real traffic is skewed (Zipf distribution): a small set of hot keys gets most requests. A cache in front of the DB absorbs those. At a 90% hit rate the DB sees only 10% of reads, and at 99% only 1%. The last few percent of hit rate matter enormously.',
  },
  {
    id: 'cap', title: 'CAP Theorem', emoji: '🔺',
    hint: 'Choose between SQL and NoSQL.',
    body: 'A distributed data store can provide at most two of Consistency, Availability and Partition tolerance. Since partitions happen anyway, the real choice during one is: refuse requests (CP) or serve possibly stale data (AP).',
  },
  {
    id: 'ddos', title: 'DDoS & Rate Limiting', emoji: '🌊',
    hint: 'Get hit by a DDoS.',
    body: 'A distributed denial of service floods you with junk traffic from thousands of machines. Defences include rate limiting (token buckets), WAFs, anycast and absorbing it with a CDN.',
  },
  {
    id: 'unit-economics', title: 'Unit Economics', emoji: '🧾',
    hint: 'Reach positive monthly profit.',
    body: 'Revenue per user minus cost to serve per user. If each user costs more in servers than they pay, growth makes things worse. Efficient algorithms improve unit economics directly: halving CPU per request halves the server bill.',
  },
  {
    id: 'dilution', title: 'Equity Dilution', emoji: '🥧',
    hint: 'Accept a funding round.',
    body: 'When you raise money, new shares are issued and your percentage shrinks. 20% of a $100M company beats 100% of a dead one, but every round shrinks your slice of the final score.',
  },
  {
    id: 'speed-of-light', title: 'Speed of Light', emoji: '🔦',
    hint: 'Play on the Interplanetary mutator.',
    body: 'Signals in fibre travel at about 200,000 km/s. Earth to Mars is 3 to 22 light-minutes. No algorithm beats physics. Only moving computation closer to users (edge, CDN, local-first) helps.',
  },
  {
    id: 'thundering-herd', title: 'Thundering Herd', emoji: '🐃',
    hint: 'Recover from an outage at high traffic.',
    body: 'When a service recovers, every waiting client retries at once and knocks it over again. The fixes are exponential backoff with jitter, and circuit breakers.',
  },
  {
    id: 'hotkey', title: 'The Hot Key Problem', emoji: '🔥',
    hint: 'Face a celebrity traffic spike.',
    body: 'When one celebrity posts, millions read the same key, and a single shard melts. Solutions include request coalescing, replicating hot keys and local caches.',
  },
  {
    id: 'byzantine', title: 'Byzantine Fault Tolerance', emoji: '🏛️',
    hint: 'Play on Byzantine Cloud.',
    body: 'Tolerating f arbitrarily faulty (even lying) nodes requires 3f+1 nodes. That is why blockchains and aerospace systems use BFT protocols such as PBFT.',
  },
  {
    id: 'moore', title: "Moore's Law", emoji: '🔬',
    hint: "Play on Moore's Law Is Dead.",
    body: 'Transistor counts doubled roughly every two years for decades, so software could get sloppier and still run faster. That free lunch is ending, and efficiency is back.',
  },
  {
    id: 'amdahl', title: "Amdahl's Law", emoji: '🧮',
    hint: 'Own 3 or more Algorithms nodes.',
    body: "Speedup = 1 ÷ ((1 − p) + p/s). If you only optimize part of the system, the unoptimized part dominates. That is why a 10× faster algorithm doesn't give a 10× faster app when the DB is the bottleneck.",
  },
  {
    id: 'pricing', title: 'Price Elasticity', emoji: '🏷️',
    hint: 'Push monetization above 80%.',
    body: 'Higher prices increase revenue per user but reduce growth and satisfaction. The revenue-maximizing price depends on how elastic demand is, which differs a lot between products.',
  },
];

export function getCodex(id: string): CodexEntry | undefined {
  return CODEX.find((c) => c.id === id);
}
