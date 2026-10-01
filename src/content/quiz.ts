export interface QuizQuestion {
  tag: string;
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export const QUIZ: QuizQuestion[] = [
  { tag: 'search', q: 'Worst-case comparisons for binary search over 1,048,576 sorted items?', options: ['20', '1,024', '524,288', '1,048,576'], answer: 0, explain: '2²⁰ = 1,048,576, so binary search needs about log₂(n) = 20 comparisons.' },
  { tag: 'search', q: 'Binary search requires the input to be…', options: ['Hashed', 'Sorted', 'Unique', 'A power of two in length'], answer: 1, explain: 'Binary search discards half the range each step, which only works if the data is sorted.' },
  { tag: 'trees', q: 'What is the worst-case lookup in an unbalanced BST with n nodes?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], answer: 2, explain: 'Insert sorted data and the BST becomes a linked list of height n.' },
  { tag: 'trees', q: 'Which traversal of a BST visits keys in sorted order?', options: ['Pre-order', 'In-order', 'Post-order', 'Level-order'], answer: 1, explain: 'In-order visits left, then node, then right, which yields ascending keys.' },
  { tag: 'trees', q: 'How many child pointers does each node of a ternary search tree have?', options: ['2', '3', '26', 'Variable'], answer: 1, explain: 'Less-than, equal and greater-than. The "equal" child advances to the next character.' },
  { tag: 'trees', q: 'Red-black trees guarantee a height of at most…', options: ['log₂ n', '2·log₂(n+1)', '√n', 'n/2'], answer: 1, explain: 'The red-black invariants keep the longest path at most twice the shortest, so height ≤ 2·log₂(n+1).' },
  { tag: 'hashing', q: 'What is the average lookup time in a well-sized hash table?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: 0, explain: 'With a good hash function and a bounded load factor, expected lookup is constant time.' },
  { tag: 'hashing', q: 'Adding 1 node to a 10-node consistent-hash ring moves roughly what share of keys?', options: ['~100%', '~50%', '~9%', '0%'], answer: 2, explain: 'Only about 1/(n+1) of the keys move to the new node.' },
  { tag: 'hashing', q: 'The birthday paradox: about how many people do you need for a 50% chance two share a birthday?', options: ['23', '50', '183', '365'], answer: 0, explain: 'Collisions arrive after about √n items. That is why hash collisions show up sooner than intuition suggests.' },
  { tag: 'sorting', q: 'Which sort has O(n log n) worst case AND sorts in place?', options: ['Quicksort', 'Merge sort', 'Heapsort', 'Bubble sort'], answer: 2, explain: 'Heapsort is in-place with an O(n log n) worst case. Quicksort is O(n²) in the worst case, and merge sort needs O(n) extra space.' },
  { tag: 'sorting', q: 'The lower bound for comparison-based sorting is…', options: ['Ω(n)', 'Ω(n log n)', 'Ω(n²)', 'Ω(log n)'], answer: 1, explain: 'A decision tree with n! leaves has height at least log₂(n!) = Θ(n log n).' },
  { tag: 'dp', q: 'What is the time complexity of naive recursive Fibonacci?', options: ['O(n)', 'O(n log n)', 'O(2ⁿ)', 'O(n²)'], answer: 2, explain: 'Each call branches twice and recomputes the same subproblems. With memoization it drops to O(n).' },
  { tag: 'dp', q: 'Dynamic programming applies when a problem has optimal substructure and…', options: ['Overlapping subproblems', 'No recursion', 'Sorted input', 'A greedy choice'], answer: 0, explain: 'DP caches the results of subproblems that would otherwise be solved repeatedly.' },
  { tag: 'graphs', q: "Dijkstra's algorithm fails with…", options: ['Cycles', 'Negative edge weights', 'Undirected graphs', 'Disconnected graphs'], answer: 1, explain: 'Negative weights break the greedy finalization. Use Bellman-Ford instead.' },
  { tag: 'graphs', q: 'BFS on an unweighted graph finds…', options: ['Shortest paths (in edges)', 'A minimum spanning tree', 'Strongly connected components', 'Topological order'], answer: 0, explain: 'BFS explores in layers, so the first time it reaches a node is along a shortest path.' },
  { tag: 'probabilistic', q: 'A Bloom filter can return…', options: ['False negatives only', 'False positives only', 'Both', 'Neither'], answer: 1, explain: '"Definitely not present" or "probably present". It never misses an inserted key.' },
  { tag: 'complexity', q: 'If P = NP were proven, which would be most immediately threatened?', options: ['Sorting', 'Public-key cryptography', 'Binary search', 'TCP'], answer: 1, explain: 'Much of cryptography relies on problems that are easy to verify but believed hard to solve.' },
  { tag: 'complexity', q: "Grover's algorithm speeds up unstructured search from O(N) to…", options: ['O(1)', 'O(log N)', 'O(√N)', 'O(N/2)'], answer: 2, explain: 'Grover gives a quadratic speedup, which is provably optimal for unstructured search.' },
  { tag: 'infra', q: 'Containers isolate processes primarily using Linux…', options: ['Hypervisors', 'Namespaces & cgroups', 'Kernel modules', 'chroot only'], answer: 1, explain: 'Namespaces isolate what a process can see. Cgroups limit what it can use.' },
  { tag: 'infra', q: 'Which load-balancing strategy keeps a user on the same backend most of the time?', options: ['Random', 'Round-robin', 'Consistent hashing on user ID', 'Least connections'], answer: 2, explain: 'Hashing the user ID gives sticky routing that survives backend changes with minimal reshuffling.' },
  { tag: 'queueing', q: 'At 90% utilization (M/M/1 queue), latency is about how many times the unloaded latency?', options: ['1.1×', '2×', '10×', '90×'], answer: 2, explain: 'Latency ∝ 1/(1−ρ). At ρ = 0.9 that is 10×, which is why you keep headroom.' },
  { tag: 'queueing', q: "Little's Law: L = λ × W. With 100 req/s arriving and 0.2 s in the system, how many are in flight?", options: ['20', '500', '0.002', '100'], answer: 0, explain: 'L = 100 × 0.2 = 20 concurrent requests.' },
  { tag: 'network', q: 'Light in fibre travels roughly how far per millisecond?', options: ['2 km', '200 km', '20,000 km', '300,000 km'], answer: 1, explain: 'About 2/3 the speed of light in vacuum: roughly 200 km/ms. Physics sets a latency floor.' },
  { tag: 'network', q: 'A token bucket rate limiter allows…', options: ['No bursts', 'Bursts up to bucket size', 'Unlimited bursts', 'Exactly 1 req/s'], answer: 1, explain: 'Saved-up tokens allow bursts, while the refill rate caps the long-run average.' },
  { tag: 'db', q: 'Most relational database indexes are implemented as…', options: ['Hash maps', 'B+ trees', 'Linked lists', 'Bloom filters'], answer: 1, explain: 'B+ trees support range queries and stay shallow, with a high fan-out suited to disk pages.' },
  { tag: 'db', q: 'In ACID, the "I" stands for…', options: ['Integrity', 'Isolation', 'Idempotence', 'Indexing'], answer: 1, explain: 'Isolation: concurrent transactions behave as if they ran one after another (to a configurable degree).' },
  { tag: 'db', q: 'Read replicas help scale…', options: ['Writes', 'Reads', 'Both equally', 'Neither'], answer: 1, explain: 'All writes still go through the primary. Replicas only absorb reads, possibly stale ones.' },
  { tag: 'caching', q: 'An LRU cache evicts…', options: ['The newest item', 'The least recently used item', 'The largest item', 'A random item'], answer: 1, explain: 'Least Recently Used: it bets that recently touched data will be touched again (temporal locality).' },
  { tag: 'caching', q: 'With a 90% cache hit rate, how much of the original DB load remains?', options: ['90%', '50%', '10%', '1%'], answer: 2, explain: 'Only misses reach the DB, so 10% remains. Going from 90% to 99% cuts DB load by another 10×.' },
  { tag: 'distributed', q: 'The CAP theorem says that during a network partition you must choose between…', options: ['Cost and Performance', 'Consistency and Availability', 'Caching and Persistence', 'CPU and Power'], answer: 1, explain: 'When partitioned you either refuse requests (keeping C) or serve possibly stale data (keeping A).' },
  { tag: 'distributed', q: 'A 5-node Raft cluster can tolerate how many node failures?', options: ['1', '2', '3', '4'], answer: 1, explain: 'Raft needs a majority quorum: 3 of 5. So 2 nodes can fail.' },
  { tag: 'distributed', q: 'What does a circuit breaker do when it is "open"?', options: ['Retries harder', 'Fails fast without calling the dependency', 'Restarts the server', 'Opens a new connection'], answer: 1, explain: 'It short-circuits calls so the failing service can recover instead of drowning in retries.' },
  { tag: 'sre', q: '99.9% availability allows about how much downtime per year?', options: ['52 seconds', '52 minutes', '8.8 hours', '3.6 days'], answer: 2, explain: '0.1% of 8,760 hours is 8.76 hours. Each extra nine is 10× stricter.' },
  { tag: 'sre', q: 'Which is NOT one of the "four golden signals"?', options: ['Latency', 'Traffic', 'Lines of code', 'Saturation'], answer: 2, explain: 'The four golden signals are latency, traffic, errors and saturation.' },
  { tag: 'brooks', q: 'How many communication paths does a team of 10 have?', options: ['10', '20', '45', '100'], answer: 2, explain: 'n(n−1)/2 = 45. With 20 people it is 190.' },
  { tag: 'architecture', q: "Conway's Law says system design mirrors…", options: ['Hardware topology', "The organization's communication structure", 'The database schema', 'User behaviour'], answer: 1, explain: 'Teams build interfaces where they have boundaries. Your architecture is your org chart.' },
  { tag: 'stats', q: 'You A/B test 20 independent metrics at p < 0.05. Expected false positives?', options: ['0', '1', '5', '20'], answer: 1, explain: '20 × 0.05 = 1. Correct for multiple comparisons, for example with Bonferroni.' },
  { tag: 'general', q: "What does Amdahl's Law limit?", options: ['Disk size', 'Speedup from parallelism', 'Network bandwidth', 'Memory usage'], answer: 1, explain: 'If 10% of a program is serial, the maximum speedup is 10×, no matter how many cores you add.' },
  { tag: 'general', q: 'Which grows fastest?', options: ['n¹⁰⁰', '2ⁿ', 'n!', 'nⁿ'], answer: 3, explain: 'For large n: n¹⁰⁰ < 2ⁿ < n! < nⁿ.' },
  { tag: 'general', q: 'What is the time complexity of finding the max in an unsorted array?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], answer: 2, explain: 'You have to look at every element at least once.' },
  { tag: 'general', q: 'A stack is…', options: ['FIFO', 'LIFO', 'Sorted', 'Random access only'], answer: 1, explain: 'Last In, First Out, like the call stack of a recursive function.' },
];

export function questionsFor(tag: string | undefined): QuizQuestion[] {
  const tagged = QUIZ.filter((q) => q.tag === tag);
  return tagged.length ? tagged : QUIZ.filter((q) => q.tag === 'general');
}
