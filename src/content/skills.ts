import type { BranchId, SkillNode } from '../engine/types';

export interface Branch {
  id: BranchId;
  name: string;
  emoji: string;
  color: string;
  desc: string;
}

export const BRANCHES: Branch[] = [
  { id: 'algo', name: 'Algorithms', emoji: '🧮', color: '#a78bfa', desc: 'Less CPU per request. Effects stack as you climb.' },
  { id: 'infra', name: 'Infrastructure', emoji: '🏗️', color: '#38bdf8', desc: 'Cheaper, faster, more automated servers.' },
  { id: 'data', name: 'Data', emoji: '🗄️', color: '#34d399', desc: 'Databases, caches and moving bytes around.' },
  { id: 'rel', name: 'Reliability', emoji: '🛡️', color: '#fbbf24', desc: 'Fewer outages, fewer bugs, faster recovery.' },
  { id: 'culture', name: 'Engineering Culture', emoji: '🍕', color: '#f472b6', desc: 'Make the humans more effective.' },
];

export const SKILLS: SkillNode[] = [
  // ───────────── Algorithms ─────────────
  {
    id: 'binary-search', name: 'Binary Search', branch: 'algo', tier: 1, cost: 25, requires: [],
    effect: { mods: { cpuPerReq: 0.85 } },
    desc: 'Replace linear scans with binary search. −15% CPU per request.',
    lesson: 'Binary search halves the search space each step: O(n) becomes O(log n). Finding one item among 1,000,000 takes about 20 comparisons instead of up to a million.',
    quizTag: 'search',
  },
  {
    id: 'bst', name: 'Binary Search Tree', branch: 'algo', tier: 2, cost: 60, requires: ['binary-search'],
    effect: { mods: { cpuPerReq: 0.85, serviceTime: 0.92 } },
    desc: 'Dynamic sorted data with O(log n) average insert and lookup. −15% CPU, −8% service time.',
    lesson: 'A BST keeps smaller keys on the left and larger keys on the right. Inserted in sorted order, it degenerates into a linked list, so lookups become O(n) again.',
    quizTag: 'trees',
  },
  {
    id: 'ternary', name: 'Ternary Search Tree', branch: 'algo', tier: 3, cost: 140, requires: ['bst'],
    effect: { mods: { cpuPerReq: 0.85, growth: 1.05 } },
    desc: 'Upgrade the binary tree to a ternary search tree for string keys. Prefix search powers lightning autocomplete. −15% CPU, +5% growth.',
    lesson: 'A ternary search tree stores one character per node with less/equal/greater children. It is as space-efficient as a BST and as fast at prefix search as a trie.',
    quizTag: 'trees',
  },
  {
    id: 'rbtree', name: 'Self-Balancing Trees', branch: 'algo', tier: 3, cost: 140, requires: ['bst'],
    effect: { mods: { cpuPerReq: 0.85, serviceTime: 0.85 }, flags: ['balanced'] },
    desc: 'Red-black and AVL trees guarantee O(log n) worst case. −15% CPU, −15% latency, immune to "Degenerate Tree" incidents.',
    lesson: 'Self-balancing trees rotate nodes on insert and delete so the height stays O(log n), even for adversarial input.',
    quizTag: 'trees',
  },
  {
    id: 'hashing', name: 'Hash Tables Everywhere', branch: 'algo', tier: 2, cost: 60, requires: ['binary-search'],
    effect: { mods: { cpuPerReq: 0.85 } },
    desc: 'O(1) average lookups for everything keyed. −15% CPU.',
    lesson: 'Hash tables give O(1) average lookups, but collisions and resizing can spike the worst case to O(n). A good hash function and load factor matter.',
    quizTag: 'hashing',
  },
  {
    id: 'sorting', name: 'O(n log n) Sorting', branch: 'algo', tier: 2, cost: 70, requires: ['binary-search'],
    effect: { mods: { cpuPerReq: 0.88, serviceTime: 0.9 } },
    desc: 'Rip out the bubble sort someone committed in 2019. −12% CPU, −10% latency.',
    lesson: 'Comparison sorts cannot beat O(n log n). Bubble sort is O(n²): sorting 1M items takes about 10¹² operations instead of 2×10⁷.',
    quizTag: 'sorting',
  },
  {
    id: 'memo', name: 'Dynamic Programming', branch: 'algo', tier: 3, cost: 160, requires: ['hashing'],
    effect: { mods: { cpuPerReq: 0.85 } },
    desc: 'Memoize overlapping subproblems. −15% CPU.',
    lesson: 'DP trades memory for time: naive Fibonacci is O(2ⁿ), memoized it is O(n). The key is overlapping subproblems plus optimal substructure.',
    quizTag: 'dp',
  },
  {
    id: 'graph', name: 'Graph Algorithms', branch: 'algo', tier: 3, cost: 170, requires: ['sorting'],
    effect: { mods: { cpuPerReq: 0.88, growth: 1.08 } },
    desc: 'Dijkstra for routing, PageRank for feeds, BFS for "people you may know". −12% CPU, +8% growth.',
    lesson: "Dijkstra's algorithm finds shortest paths with non-negative weights in O((V+E) log V) using a priority queue.",
    quizTag: 'graphs',
  },
  {
    id: 'bloom', name: 'Bloom Filters', branch: 'algo', tier: 4, cost: 320, requires: ['memo'],
    effect: { mods: { dbPerReq: 0.75 } },
    desc: 'Skip database lookups for keys that definitely don\'t exist. −25% DB queries.',
    lesson: 'A Bloom filter can return false positives but never false negatives. A few bits per element give about a 1% error rate.',
    quizTag: 'probabilistic',
  },
  {
    id: 'approx', name: 'Approximation Algorithms', branch: 'algo', tier: 4, cost: 340, requires: ['graph'],
    effect: { mods: { cpuPerReq: 0.8, satBonus: -2 } },
    desc: 'Good enough is good enough. −20% CPU, but nerds on forums notice (−2 satisfaction).',
    lesson: 'For NP-hard problems, approximation algorithms give provable bounds. Christofides\' algorithm is within 1.5× of the optimal TSP tour.',
    quizTag: 'complexity',
  },
  {
    id: 'simd', name: 'SIMD & Vectorization', branch: 'algo', tier: 4, cost: 360, requires: ['memo', 'graph'],
    effect: { mods: { cpuPerReq: 0.85, serverPower: 1.1 } },
    desc: 'Process 8 values per instruction. −15% CPU, +10% server power.',
    lesson: 'SIMD (Single Instruction, Multiple Data) runs one operation over a vector of values at once. It is the secret behind fast JSON parsers and ML kernels.',
  },
  {
    id: 'grover', name: "Grover's Search (Quantum)", branch: 'algo', tier: 5, cost: 900, requires: ['bloom', 'simd'],
    effect: { mods: { cpuPerReq: 0.6 }, flags: ['quantum'] },
    desc: 'Rent qubits. Unstructured search in O(√n). −40% CPU. Pure flex.',
    lesson: "Grover's algorithm searches an unsorted database of N items in O(√N) quantum queries, a quadratic speedup over classical search.",
    quizTag: 'complexity',
  },

  // ───────────── Infrastructure ─────────────
  {
    id: 'loadbalancer', name: 'Load Balancer', branch: 'infra', tier: 1, cost: 25, requires: [],
    effect: { mods: { serverPower: 1.15, incidentChance: 0.92 } },
    desc: 'Spread requests evenly across servers. +15% server power.',
    lesson: 'Round-robin, least-connections and consistent hashing are common load-balancing strategies. Without one, a single hot server melts while the others idle.',
    quizTag: 'infra',
  },
  {
    id: 'virtualization', name: 'Virtualization', branch: 'infra', tier: 2, cost: 55, requires: ['loadbalancer'],
    effect: { mods: { serverCost: 0.8 } },
    desc: 'Pack many VMs on each box. −20% server cost.',
    lesson: 'A hypervisor multiplexes physical hardware between isolated virtual machines. It is the foundation of cloud computing.',
  },
  {
    id: 'containers', name: 'Containers (Docker)', branch: 'infra', tier: 2, cost: 65, requires: ['loadbalancer'],
    effect: { mods: { serverPower: 1.1, featureSpeed: 1.05 } },
    desc: '"Works on my machine", now for everyone. +10% server power, +5% feature speed.',
    lesson: 'Containers share the host kernel and isolate processes with namespaces and cgroups. They are lighter than VMs and start in milliseconds.',
    quizTag: 'infra',
  },
  {
    id: 'autoscale', name: 'Autoscaling', branch: 'infra', tier: 3, cost: 150, requires: ['virtualization'],
    effect: { mods: { serverCost: 0.85 }, flags: ['autoscale'] },
    desc: 'Servers and bandwidth follow demand automatically, targeting 65% utilization. Pay for what you use (−15% server cost).',
    lesson: 'Autoscalers watch metrics like CPU or queue depth and add or remove instances. Keeping utilization around 60–70% leaves headroom for spikes.',
    quizTag: 'queueing',
  },
  {
    id: 'k8s', name: 'Kubernetes', branch: 'infra', tier: 3, cost: 170, requires: ['containers'],
    effect: { mods: { serverPower: 1.15, incidentDuration: 0.8, debtPerFeature: 1.1 } },
    desc: 'Orchestrate everything. +15% server power, −20% incident duration, but +10% debt per feature (YAML).',
    lesson: 'Kubernetes reconciles desired state with actual state: you declare 5 replicas and it keeps 5 running, rescheduling them when nodes die.',
    quizTag: 'infra',
  },
  {
    id: 'serverless', name: 'Serverless', branch: 'infra', tier: 4, cost: 330, requires: ['autoscale'], excludes: ['baremetal'],
    effect: { mods: { serverCost: 0.65, serviceTime: 1.1, featureSpeed: 1.1 } },
    desc: 'No servers to manage (there are still servers). −35% server cost, +10% feature speed, +10% cold-start latency.',
    lesson: 'Functions-as-a-Service bill per invocation and scale to zero. The trade-off is cold starts and vendor lock-in.',
    quizTag: 'infra',
  },
  {
    id: 'baremetal', name: 'Bare-Metal Tuning', branch: 'infra', tier: 4, cost: 330, requires: ['autoscale'], excludes: ['serverless'],
    effect: { mods: { serverPower: 1.35, serviceTime: 0.85, featureSpeed: 0.95 } },
    desc: 'Own your hardware and tune the kernel. +35% server power, −15% latency, −5% feature speed.',
    lesson: 'Skipping virtualization removes the hypervisor tax and noisy neighbours. You trade elasticity for raw performance.',
  },
  {
    id: 'edge', name: 'Edge Computing', branch: 'infra', tier: 4, cost: 350, requires: ['k8s'],
    effect: { mods: { serviceTime: 0.75 }, flags: ['edge'] },
    desc: 'Run code in 300 cities, close to users. −25% latency, and slashes the speed-of-light floor by 85%.',
    lesson: 'Light in fibre covers about 200 km per ms. A round trip from Sydney to Virginia is about 160 ms before your code even runs.',
    quizTag: 'network',
  },
  {
    id: 'waf', name: 'Rate Limiting & WAF', branch: 'infra', tier: 2, cost: 60, requires: ['loadbalancer'],
    effect: { flags: ['ddosShield'] },
    desc: 'Token buckets and a web application firewall. Shrugs off DDoS attacks.',
    lesson: 'A token bucket refills at a fixed rate and each request spends a token. That allows bursts while capping the average rate.',
    quizTag: 'network',
  },
  {
    id: 'raft', name: 'Consensus (Raft)', branch: 'infra', tier: 3, cost: 180, requires: ['containers'],
    effect: { mods: { incidentChance: 0.85 }, flags: ['consensus'] },
    desc: 'Replicated state machines with leader election. −15% incidents, cancels the Byzantine Cloud penalty.',
    lesson: 'Raft elects a leader that replicates a log to followers. An entry is committed once a majority (a quorum) acknowledges it, so 5 nodes tolerate 2 failures.',
    quizTag: 'distributed',
  },
  {
    id: 'planet', name: 'Planet-Scale Fabric', branch: 'infra', tier: 5, cost: 900, requires: ['edge'],
    effect: { mods: { serverPower: 1.5, serverCost: 0.85, bandwidthCost: 0.8 } },
    desc: 'Your own global backbone. +50% server power, cheaper everything.',
    lesson: 'Hyperscalers lay their own undersea cables. Owning the network becomes cheaper than renting it at enough scale.',
  },

  // ───────────── Data ─────────────
  {
    id: 'indexing', name: 'Database Indexing', branch: 'data', tier: 1, cost: 25, requires: [],
    effect: { mods: { dbCapacity: 1.8 } },
    desc: 'Add B-tree indexes on hot columns. ×1.8 DB capacity.',
    lesson: 'An index is usually a B+ tree. It turns a full table scan (O(n)) into an O(log n) lookup, at the cost of slower writes and extra storage.',
    quizTag: 'db',
  },
  {
    id: 'cache', name: 'Caching Layer (Redis)', branch: 'data', tier: 2, cost: 60, requires: ['indexing'],
    effect: { mods: { cacheHit: 0.45 }, flags: ['cache'] },
    desc: 'Keep hot data in memory. 45% of DB queries never reach the database.',
    lesson: 'There are only two hard things in computer science: cache invalidation and naming things. LRU eviction drops the least recently used entry first.',
    quizTag: 'caching',
  },
  {
    id: 'cdn', name: 'Content Delivery Network', branch: 'data', tier: 2, cost: 70, requires: ['indexing'],
    effect: { mods: { cdnOffload: 0.6 }, flags: ['cdn'] },
    desc: 'Serve static and media bytes from the edge. −60% bandwidth demand, halves any speed-of-light floor.',
    lesson: 'CDNs cache content in points of presence near users. They cut both origin bandwidth and round-trip latency.',
    quizTag: 'network',
  },
  {
    id: 'compression', name: 'Compression (Brotli)', branch: 'data', tier: 2, cost: 50, requires: ['indexing'],
    effect: { mods: { payload: 0.7 } },
    desc: 'Squeeze every response. −30% payload size.',
    lesson: 'Compression trades CPU for bytes. Text compresses 70–90%, while already-compressed media like JPEG or H.264 barely shrinks.',
  },
  {
    id: 'replicas', name: 'Read Replicas', branch: 'data', tier: 3, cost: 150, requires: ['cache'],
    effect: { mods: { dbCapacity: 1.5 } },
    desc: 'Fan reads out to followers. ×1.5 DB capacity.',
    lesson: 'Replicas scale reads but not writes. Replication lag means a replica can briefly return stale data: eventual consistency.',
    quizTag: 'db',
  },
  {
    id: 'sql', name: 'SQL (ACID)', branch: 'data', tier: 3, cost: 160, requires: ['cache'], excludes: ['nosql'],
    effect: { mods: { bugSpawn: 0.8, dbCapacity: 1.15, errorMult: 0.85 } },
    desc: 'Transactions, constraints and joins. −20% bugs, −15% errors, ×1.15 DB capacity.',
    lesson: 'ACID means Atomicity, Consistency, Isolation and Durability. A transfer either fully happens or not at all.',
    quizTag: 'db',
  },
  {
    id: 'nosql', name: 'NoSQL (BASE)', branch: 'data', tier: 3, cost: 160, requires: ['cache'], excludes: ['sql'],
    effect: { mods: { dbCapacity: 1.8, bugSpawn: 1.1 }, flags: ['eventual'] },
    desc: 'Schemaless, horizontally scalable. ×1.8 DB capacity, but +10% bugs and occasional consistency incidents.',
    lesson: 'BASE means Basically Available, Soft state, Eventually consistent. Under the CAP theorem, when the network partitions you choose availability over consistency.',
    quizTag: 'distributed',
  },
  {
    id: 'sharding', name: 'Sharding', branch: 'data', tier: 4, cost: 330, requires: ['replicas'],
    effect: { mods: { dbCapacity: 1.8, debtPerFeature: 1.1 } },
    desc: 'Split data across many databases by key. ×1.8 DB capacity, +10% debt per feature.',
    lesson: 'Sharding partitions data horizontally. Cross-shard joins and transactions get hard, and choosing the shard key is the most important decision.',
    quizTag: 'distributed',
  },
  {
    id: 'consistent-hash', name: 'Consistent Hashing', branch: 'data', tier: 4, cost: 300, requires: ['replicas'],
    effect: { mods: { cacheHit: 0.15, dbCapacity: 1.2 } },
    desc: 'Add or remove nodes without reshuffling everything. +15% cache hit rate, ×1.2 DB capacity.',
    lesson: 'With consistent hashing, adding a node moves only about 1/n of the keys. Naive modulo hashing moves almost all of them.',
    quizTag: 'hashing',
  },
  {
    id: 'columnar', name: 'Columnar Analytics', branch: 'data', tier: 4, cost: 310, requires: ['compression'],
    effect: { mods: { growth: 1.1, arpu: 1.08 } },
    desc: 'Finally understand your users. +10% growth, +8% revenue per user.',
    lesson: 'Column stores read only the columns a query needs and compress them well. They are great for OLAP and poor for OLTP point writes.',
  },
  {
    id: 'spanner', name: 'Globally Consistent DB', branch: 'data', tier: 5, cost: 900, requires: ['sharding'],
    effect: { mods: { dbCapacity: 1.6, incidentChance: 0.75, errorMult: 0.8 } },
    desc: 'Atomic clocks plus Paxos give you consistency at planet scale. ×1.6 DB capacity, −25% incidents.',
    lesson: 'Google Spanner uses TrueTime, GPS and atomic clocks with bounded uncertainty, to give externally consistent transactions worldwide.',
    quizTag: 'distributed',
  },

  // ───────────── Reliability ─────────────
  {
    id: 'monitoring', name: 'Monitoring & Alerts', branch: 'rel', tier: 1, cost: 25, requires: [],
    effect: { mods: { incidentDuration: 0.6 } },
    desc: 'Dashboards and pagers. −40% incident duration.',
    lesson: "You can't fix what you can't see. Track the four golden signals: latency, traffic, errors and saturation.",
    quizTag: 'sre',
  },
  {
    id: 'tests', name: 'Automated Tests', branch: 'rel', tier: 2, cost: 55, requires: ['monitoring'],
    effect: { mods: { bugSpawn: 0.7 } },
    desc: 'Unit and integration tests. −30% bugs.',
    lesson: 'The test pyramid: many fast unit tests, fewer integration tests, a handful of end-to-end tests.',
    quizTag: 'sre',
  },
  {
    id: 'cicd', name: 'CI/CD Pipeline', branch: 'rel', tier: 2, cost: 65, requires: ['monitoring'],
    effect: { mods: { featureSpeed: 1.15, bugSpawn: 0.9 } },
    desc: 'Every merge is tested and deployed automatically. +15% feature speed, −10% bugs.',
    lesson: 'Small, frequent deploys are safer than big-bang releases: when something breaks, the diff to inspect is small.',
  },
  {
    id: 'backups', name: 'Backups (Tested!)', branch: 'rel', tier: 2, cost: 45, requires: ['monitoring'],
    effect: { flags: ['backups'] },
    desc: 'Nightly snapshots plus actual restore drills. Immune to data-loss disasters.',
    lesson: 'A backup you have never restored is a hope, not a backup. The 3-2-1 rule: 3 copies, on 2 kinds of media, 1 offsite.',
    quizTag: 'sre',
  },
  {
    id: 'circuit', name: 'Circuit Breakers', branch: 'rel', tier: 3, cost: 150, requires: ['tests'],
    effect: { mods: { errorMult: 0.7 } },
    desc: 'Fail fast instead of cascading. −30% user-visible errors.',
    lesson: 'A circuit breaker stops calling a failing dependency for a while. That prevents retry storms from turning one sick service into a full outage.',
    quizTag: 'distributed',
  },
  {
    id: 'codereview', name: 'Code Review', branch: 'rel', tier: 3, cost: 140, requires: ['cicd'],
    effect: { mods: { debtPerFeature: 0.7, bugSpawn: 0.85, featureSpeed: 0.95 } },
    desc: 'A second pair of eyes. −30% debt per feature, −15% bugs, −5% feature speed.',
    lesson: 'Reviews catch defects, but their bigger value is spreading knowledge, so the bus factor stays above 1.',
  },
  {
    id: 'chaos', name: 'Chaos Engineering', branch: 'rel', tier: 4, cost: 320, requires: ['circuit'],
    effect: { mods: { incidentChance: 0.5 } },
    desc: 'Break things on purpose, on a Tuesday, while everyone is watching. −50% incidents.',
    lesson: "Netflix's Chaos Monkey randomly kills production instances so engineers are forced to build resilient systems.",
    quizTag: 'sre',
  },
  {
    id: 'multiregion', name: 'Multi-Region Failover', branch: 'rel', tier: 4, cost: 360, requires: ['circuit'],
    effect: { mods: { incidentDuration: 0.6 }, flags: ['multiregion'] },
    desc: 'Run in 3 regions with automatic failover. Immune to cloud region outages, −40% incident duration.',
    lesson: 'Active-active multi-region needs data replication and careful handling of conflicts and failover. It costs a lot, but survives disasters.',
    quizTag: 'distributed',
  },
  {
    id: 'tla', name: 'Formal Verification (TLA+)', branch: 'rel', tier: 4, cost: 340, requires: ['codereview'],
    effect: { mods: { bugSpawn: 0.55 } },
    desc: 'Mathematically prove your protocols are correct. −45% bugs.',
    lesson: 'AWS used TLA+ to find subtle bugs in DynamoDB and S3 that needed sequences of 35+ steps to trigger. No test would have found them.',
  },
  {
    id: 'fivenines', name: 'Five Nines', branch: 'rel', tier: 5, cost: 900, requires: ['chaos', 'multiregion'],
    effect: { mods: { incidentChance: 0.35, incidentDuration: 0.5, errorMult: 0.6 } },
    desc: '99.999% uptime is about 5 minutes of downtime a year. −65% incidents, −50% duration.',
    lesson: 'Each extra nine cuts allowed downtime by 10×: 99.9% allows 8.8 hours a year, 99.99% allows 53 minutes, 99.999% allows 5.3 minutes.',
    quizTag: 'sre',
  },

  // ───────────── Culture ─────────────
  {
    id: 'agile', name: 'Agile Standups', branch: 'culture', tier: 1, cost: 25, requires: [],
    effect: { mods: { featureSpeed: 1.1 } },
    desc: 'Fifteen minutes. Standing. Mostly. +10% feature speed.',
    lesson: 'Short iterations with feedback loops beat big up-front plans when requirements are uncertain.',
  },
  {
    id: 'monolith', name: 'Monolith First', branch: 'culture', tier: 2, cost: 50, requires: ['agile'], excludes: ['microservices'],
    effect: { mods: { featureSpeed: 1.15, debtPerFeature: 0.85, brooks: -0.05 } },
    desc: 'One repo, one deploy. +15% feature speed, −15% debt, but large teams scale worse.',
    lesson: 'Martin Fowler: almost every successful microservice story started as a monolith that got too big. Don\'t distribute what you don\'t understand yet.',
    quizTag: 'architecture',
  },
  {
    id: 'microservices', name: 'Microservices', branch: 'culture', tier: 2, cost: 50, requires: ['agile'], excludes: ['monolith'],
    effect: { mods: { brooks: 0.1, incidentChance: 1.15, serverPower: 0.92 } },
    desc: 'Teams own services independently. Big teams scale much better, but there are more moving parts (+15% incidents, −8% server power).',
    lesson: "Conway's Law: systems mirror the communication structure of the organizations that build them.",
    quizTag: 'architecture',
  },
  {
    id: 'rubberduck', name: 'Rubber Duck Debugging', branch: 'culture', tier: 1, cost: 20, requires: [],
    effect: { mods: { bugFix: 1.3 } },
    desc: 'Explain the bug to a duck. The duck knows. +30% bug fixing.',
    lesson: 'Explaining code line by line out loud forces you to check every assumption. That is usually where the bug is hiding.',
  },
  {
    id: 'pairing', name: 'Pair Programming', branch: 'culture', tier: 2, cost: 60, requires: ['rubberduck'],
    effect: { mods: { bugSpawn: 0.8, featureSpeed: 0.97, debtPerFeature: 0.9 } },
    desc: 'Two engineers, one keyboard. −20% bugs, −10% debt.',
    lesson: 'Studies show pairing costs about 15% more developer time but produces about 15% fewer defects, and it spreads knowledge fast.',
  },
  {
    id: 'twopizza', name: 'Two-Pizza Teams', branch: 'culture', tier: 3, cost: 150, requires: ['agile'],
    effect: { mods: { brooks: 0.07 } },
    desc: 'No team larger than two pizzas can feed. Large teams scale better.',
    lesson: "Brooks's Law: adding people to a late project makes it later. Communication paths grow as n(n−1)/2.",
    quizTag: 'brooks',
  },
  {
    id: 'hackathon', name: 'Hackathons', branch: 'culture', tier: 2, cost: 55, requires: ['rubberduck'],
    effect: { mods: { researchSpeed: 1.2 } },
    desc: '48 hours, unlimited pizza. +20% research speed.',
    lesson: 'Gmail and many internal tools began as side projects. Slack time is where innovation hides.',
  },
  {
    id: 'abtest', name: 'A/B Testing', branch: 'culture', tier: 3, cost: 150, requires: ['hackathon'],
    effect: { mods: { growth: 1.15 } },
    desc: 'Ship two versions and let the data decide. +15% growth.',
    lesson: 'Statistical significance matters: with p < 0.05 and 20 metrics, you expect about one false positive by pure chance.',
    quizTag: 'stats',
  },
  {
    id: 'opensource', name: 'Open Source Our Stack', branch: 'culture', tier: 3, cost: 140, requires: ['pairing'],
    effect: { mods: { hireCost: 0.6, hypeGain: 0.3, salary: 0.95 } },
    desc: 'Release your internal tools. −40% recruiting cost, more hype, −5% salaries (people want to work here).',
    lesson: "Open-sourcing infrastructure (React, Kubernetes, Kafka) builds a hiring brand and lets the community harden your code.",
  },
  {
    id: 'remote', name: 'Remote-First', branch: 'culture', tier: 3, cost: 140, requires: ['twopizza'],
    effect: { mods: { salary: 0.85, productivity: 0.97 } },
    desc: 'Hire anywhere. −15% salaries, −3% productivity (async is hard).',
    lesson: 'Distributed teams depend on written communication: design docs, ADRs and good async habits.',
  },
  {
    id: 'devrel', name: 'Developer Relations', branch: 'culture', tier: 4, cost: 300, requires: ['opensource'],
    effect: { mods: { growth: 1.12, cac: 0.7 } },
    desc: 'Conference talks and great docs. +12% growth, −30% marketing cost per user.',
    lesson: 'Good docs are a growth engine: developers adopt the tools they can learn in 5 minutes.',
  },
  {
    id: 'flow', name: 'Deep Work Culture', branch: 'culture', tier: 4, cost: 320, requires: ['remote', 'abtest'],
    effect: { mods: { productivity: 1.2 } },
    desc: 'No-meeting Wednesdays. +20% productivity for every team.',
    lesson: 'Context switching is expensive: getting back into flow after an interruption takes about 23 minutes.',
  },
  {
    id: 'agi', name: 'AI Pair Programmer', branch: 'culture', tier: 5, cost: 900, requires: ['flow'],
    effect: { mods: { productivity: 1.5, bugSpawn: 1.1 } },
    desc: 'Every engineer gets a tireless AI assistant. +50% productivity (+10% bugs from hallucinations).',
    lesson: 'AI coding assistants speed up boilerplate, but you still need humans who understand the system to review the output.',
  },
];

export function getSkill(id: string): SkillNode | undefined {
  return SKILLS.find((s) => s.id === id);
}

export type SkillStatus = 'owned' | 'available' | 'locked' | 'excluded';

export function skillStatus(owned: string[], node: SkillNode): SkillStatus {
  if (owned.includes(node.id)) return 'owned';
  if (node.excludes?.some((x) => owned.includes(x))) return 'excluded';
  if (node.requires.every((r) => owned.includes(r))) return 'available';
  return 'locked';
}
