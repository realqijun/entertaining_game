import { addBuff, log, totalEngineers, unlockCodex } from '../engine/helpers';
import { rand } from '../engine/rng';
import { endGame } from '../engine/score';
import type { GameState, Mods } from '../engine/types';
import { fmt } from './cards';

export interface EventChoice {
  label: string;
  hint?: (s: GameState) => string;
  disabled?: (s: GameState) => boolean;
  apply: (s: GameState) => string;
}

export interface GameEvent {
  id: string;
  title: string;
  emoji: string;
  tone: 'good' | 'bad' | 'neutral';
  text: (s: GameState, mods: Mods) => string;
  weight: (s: GameState, mods: Mods) => number;
  /** Events without choices resolve immediately with this. */
  auto?: (s: GameState, mods: Mods) => string;
  choices?: EventChoice[];
  once?: boolean;
  codex?: string;
}

const burn = (s: GameState) => Math.max(20_000, s.metrics.costDay * 30);

export const EVENTS: GameEvent[] = [
  {
    id: 'hn', title: 'Front Page of Hacker News!', emoji: '🔶', tone: 'good',
    text: () => 'Someone posted your launch to Hacker News and it hit #1. Traffic will be ×4 for 3 days. The comments are… mixed.',
    weight: (s) => (s.users > 200 ? 1 : 0),
    auto: (s, m) => {
      addBuff(s, 'hn', 'Hacker News Hug of Death', '🔶', 3, { mods: { traffic: 4 } }, false);
      s.hype += 0.5 * (1 + m.hypeGain);
      return 'Brace for the hug of death. Check your capacity!';
    },
  },
  {
    id: 'celebrity', title: 'Celebrity Signs Up', emoji: '⭐', tone: 'good',
    text: () => 'A pop star with 80M followers just started using your product. Their fans are coming. Every one of them is reading the same few keys.',
    weight: (s) => (s.users > 2000 ? (s.mutators.includes('zipf') ? 3 : 1) : 0),
    codex: 'hotkey',
    auto: (s, m) => {
      const mult = m.flags.has('cache') ? 2.2 : 3.5;
      addBuff(s, 'celebrity', 'Celebrity Hot Key', '⭐', 4, { mods: { traffic: mult } }, false);
      s.hype += 0.6 * (1 + m.hypeGain);
      return m.flags.has('cache') ? 'Your cache soaks up most of the hot-key reads (×2.2 traffic).' : 'No cache layer… every fan hits the database (×3.5 traffic).';
    },
  },
  {
    id: 'ddos', title: 'DDoS Attack!', emoji: '🌊', tone: 'bad',
    text: () => 'A botnet of 300,000 smart fridges is flooding your servers with junk requests.',
    weight: (s) => (s.users > 1000 ? 1 : 0),
    codex: 'ddos',
    choices: [
      {
        label: 'Ride it out',
        hint: (s) => (s.skills.includes('waf') ? 'Your WAF filters it.' : '×5 traffic for 2 days.'),
        apply: (s) => {
          if (s.skills.includes('waf')) return '🛡️ The rate limiter shrugged it off. The fridges are sad.';
          addBuff(s, 'ddos', 'DDoS Flood', '🌊', 2, { mods: { traffic: 5 } }, false);
          return 'Junk traffic floods in. Watch those gauges.';
        },
      },
      {
        label: 'Pay for emergency scrubbing',
        hint: (s) => `−$${fmt(scrub(s))}, no impact.`,
        disabled: (s) => s.cash < scrub(s),
        apply: (s) => { s.cash -= scrub(s); return 'A scrubbing service absorbs the attack. Expensive, but painless.'; },
      },
    ],
  },
  {
    id: 'droptable', title: 'Intern Ran DROP TABLE', emoji: '💀', tone: 'bad',
    text: () => 'The new intern ran a "cleanup script" against production. The users table is… gone.',
    weight: (s) => (s.users > 500 ? 0.8 : 0),
    auto: (s, m) => {
      if (m.flags.has('backups')) {
        s.outageHours += 3;
        return '🛟 You restored from last night\'s backup. 3 hours of downtime, and the intern has learned a lesson.';
      }
      const lost = Math.round(s.users * 0.12);
      s.users -= lost;
      s.sat = Math.max(0, s.sat - 20);
      s.outageHours += 12;
      return `No tested backups. ${fmt(lost)} users lost forever. Satisfaction −20. Research "Backups" next time.`;
    },
  },
  {
    id: 'region', title: 'Cloud Region Outage', emoji: '⛈️', tone: 'bad',
    text: () => 'us-east-1 is down. Again. Half the internet is offline.',
    weight: (s) => (s.users > 3000 ? 0.9 : 0),
    auto: (s, m) => {
      if (m.flags.has('multiregion')) return '🌍 Traffic failed over to your other regions. Users noticed nothing. Smug tweets ensue.';
      const hours = 6 + rand(s) * 10;
      s.outageHours += hours;
      s.outageName = 'Cloud region outage';
      return `You're down for ~${Math.round(hours)} hours. At least everyone else is too.`;
    },
  },
  {
    id: 'leftpad', title: 'Dependency Unpublished', emoji: '📦', tone: 'bad',
    text: () => 'A developer unpublished an 11-line package that your entire build depends on. CI is red everywhere.',
    weight: () => 0.7,
    choices: [
      {
        label: 'Rewrite it ourselves',
        hint: () => 'Feature progress lost, +5 tech debt.',
        apply: (s) => { s.featurePts = 0; s.debt += 5; return 'You wrote padStart() from scratch. Again.'; },
      },
      {
        label: 'Vendor all dependencies',
        hint: () => '+15 tech debt, but never again (−10% bugs, permanently).',
        apply: (s) => { s.debt += 15; s.perks.push('vendored'); return 'All dependencies are now checked into the repo. 4GB node_modules, but safe.'; },
      },
    ],
  },
  {
    id: 'poach', title: 'Big Tech Is Poaching', emoji: '🎣', tone: 'bad',
    text: (s) => `A trillion-dollar company offered one of your engineers 3× their salary. With ${totalEngineers(s)} engineers, someone's tempted.`,
    weight: (s) => (totalEngineers(s) >= 4 ? 0.9 : 0),
    choices: [
      {
        label: 'Counter-offer',
        hint: (s) => `−$${fmt(retention(s))} retention bonus.`,
        disabled: (s) => s.cash < retention(s),
        apply: (s) => { s.cash -= retention(s); return 'They stay. For now.'; },
      },
      {
        label: 'Let them go',
        hint: (s) => (s.stars.length ? 'You might lose a star engineer.' : 'Lose one engineer.'),
        apply: (s) => {
          if (s.stars.length && rand(s) < 0.5) {
            const st = s.stars.splice(Math.floor(rand(s) * s.stars.length), 1)[0];
            return `${st.name} (${st.emoji}) left for big tech. Their farewell Slack message was 2,000 words.`;
          }
          const order = ['rnd', 'product', 'sre', 'refactor'] as const;
          for (const t of order) if (s.teams[t] > 0) { s.teams[t] -= 1; return `An engineer from ${t} left. Their code remains. Nobody understands it.`; }
          return 'Nobody actually left. Phew.';
        },
      },
    ],
  },
  {
    id: 'heartbleed', title: 'Critical Vulnerability', emoji: '🩸', tone: 'bad',
    text: () => 'A CVE with a logo and a website just dropped for a library you use. Exploits are already circulating.',
    weight: (s) => (s.day > 120 ? 0.7 : 0),
    choices: [
      {
        label: 'All hands: patch now',
        hint: () => 'Lose 50% of current research and feature progress.',
        apply: (s) => { s.rp *= 0.5; s.featurePts *= 0.5; return 'Patched within hours. The security blog post writes itself.'; },
      },
      {
        label: 'Patch next sprint',
        hint: () => '50% chance of a breach (−15 satisfaction, −8% users).',
        apply: (s) => {
          if (rand(s) < 0.5) { s.sat -= 15; s.users *= 0.92; s.hype = Math.max(0, s.hype - 0.3); return '😱 Breached. Your company is now the example in a security lecture.'; }
          return 'Got lucky. Nobody targeted you. This time.';
        },
      },
    ],
  },
  {
    id: 'gdpr', title: 'New Privacy Regulation', emoji: '⚖️', tone: 'bad',
    text: () => 'Regulators passed a new data-privacy law. Compliance means consent banners, data export and deletion pipelines.',
    weight: (s) => (s.users > 5000 ? (s.productId === 'fintech' ? 2 : 0.6) : 0),
    choices: [
      {
        label: 'Build compliance properly',
        hint: () => 'Lose 60% of feature progress, +5 satisfaction (trust).',
        apply: (s) => { s.featurePts *= 0.4; s.sat += 5; return 'Privacy by design. Users appreciate it.'; },
      },
      {
        label: 'Slap on a cookie banner',
        hint: (s) => `40% chance of a $${fmt(fine(s))} fine.`,
        apply: (s) => {
          if (rand(s) < 0.4) { s.cash -= fine(s); return `💸 Fined $${fmt(fine(s))}. The regulator was not amused by "Accept All".`; }
          return 'Nobody checked. Users clicked "Accept" without reading, as is tradition.';
        },
      },
    ],
  },
  {
    id: 'dns', title: "It's Always DNS", emoji: '🌐', tone: 'bad',
    text: () => 'Someone changed a DNS record with a 48-hour TTL. To the wrong IP.',
    weight: () => 0.6,
    auto: (s, m) => {
      const h = (4 + rand(s) * 6) * m.incidentDuration;
      s.outageHours += h;
      s.outageName = "DNS (it's always DNS)";
      return `~${Math.round(h)} hours of partial outage while caches expire around the world.`;
    },
  },
  {
    id: 'cert', title: 'TLS Certificate Expired', emoji: '🔒', tone: 'bad',
    text: () => 'The certificate expired at midnight. Everyone who set up the renewal cron job left last year.',
    weight: (s) => (s.skills.includes('monitoring') ? 0.2 : 0.7),
    auto: (s) => {
      s.outageHours += 3;
      s.sat -= 3;
      return 'Browsers show a scary red warning for 3 hours. Lesson: automate renewal (Let\'s Encrypt!) and monitor expiry.';
    },
  },
  {
    id: 'degenerate', title: 'Degenerate Tree', emoji: '🌴', tone: 'bad',
    text: () => 'A batch import inserted 10M rows in sorted order into your unbalanced BST. It is now a 10-million-node linked list.',
    weight: (s, m) => (s.skills.includes('bst') && !m.flags.has('balanced') ? 1.2 : 0),
    auto: (s) => {
      addBuff(s, 'degenerate', 'O(n) Lookups', '🌴', 10, { mods: { cpuPerReq: 2 } }, false);
      return 'CPU per request ×2 for 10 days. Self-balancing trees would have prevented this.';
    },
  },
  {
    id: 'eventual', title: 'Split-Brain Inconsistency', emoji: '🧠', tone: 'bad',
    text: () => 'A network partition healed and two replicas disagree. Some users see their posts, others don\'t. Customer support is melting.',
    weight: (_s, m) => (m.flags.has('eventual') ? 1.4 : 0),
    codex: 'cap',
    auto: (s) => { s.bugs += 10; s.sat -= 4; return '+10 bugs, −4 satisfaction. Welcome to eventual consistency.'; },
  },
  {
    id: 'leak', title: 'Memory Leak', emoji: '🚰', tone: 'bad',
    text: () => 'Servers slowly fill up and crash every few hours. Somebody forgot to remove an event listener.',
    weight: (s) => (s.debt > 40 ? 1 : 0.3),
    choices: [
      {
        label: 'Restart them nightly',
        hint: () => '−20% server power for 30 days. +10 debt.',
        apply: (s) => { addBuff(s, 'leak', 'Memory Leak', '🚰', 30, { mods: { serverPower: 0.8 } }, false); s.debt += 10; return 'Cron job: `0 3 * * * reboot`. Classic.'; },
      },
      {
        label: 'Hunt it down',
        hint: () => 'Lose all current research progress.',
        apply: (s) => { s.rp = 0; return 'Found it with a heap snapshot. It was a closure capturing the entire DOM.'; },
      },
    ],
  },
  {
    id: 'stackoverflow', title: 'Stack Overflow Is Down', emoji: '🥲', tone: 'bad',
    text: () => 'Stack Overflow is down for the day. Your engineers stare at blank screens, unsure how to center a div.',
    weight: () => 0.4,
    once: true,
    auto: (s) => { addBuff(s, 'so-down', 'Stack Overflow Down', '🥲', 2, { mods: { productivity: 0.3 } }, false); return 'Productivity −70% for 2 days.'; },
  },
  {
    id: 'acquisition', title: 'Acquisition Offer', emoji: '💼', tone: 'neutral',
    text: (s) => `A big tech giant offers to buy your company for $${fmt(acqOffer(s))} (${(acqMult(s)).toFixed(1)}× valuation). Your ${Math.round(s.equity * 100)}% would be worth $${fmt(acqOffer(s) * s.equity)}.`,
    weight: (s) => (s.day > 400 && s.metrics.valuation > 20_000_000 ? 0.35 : 0),
    choices: [
      {
        label: 'Sell! 💰',
        hint: () => 'Ends the run with this exit as your score.',
        apply: (s) => { endGame(s, 'acquired', acqOffer(s)); return 'Deal signed. Time to buy a boat.'; },
      },
      {
        label: 'Decline. We\'re building something bigger.',
        hint: () => '+10% hype from the press.',
        apply: (s) => { s.hype += 0.1; return 'You turned down a fortune. TechCrunch calls you "bold" or "insane".'; },
      },
    ],
  },
  {
    id: 'unicorn-intern', title: 'Prodigy Intern', emoji: '🦄', tone: 'good',
    text: () => 'A 17-year-old intern optimized your hot path during lunch. Nobody knows how.',
    weight: () => 0.5,
    auto: (s) => { addBuff(s, 'prodigy', 'Prodigy Optimization', '🦄', 60, { mods: { cpuPerReq: 0.85 } }, true); return '−15% CPU per request for 60 days.'; },
  },
  {
    id: 'rubber-duck', title: 'Rubber Duck Shipment', emoji: '🦆', tone: 'good',
    text: () => 'A pallet of 500 rubber ducks was mistakenly delivered to your office.',
    weight: () => 0.4,
    once: true,
    auto: (s) => { const fixed = Math.round(s.bugs * 0.6); s.bugs -= fixed; s.stats.bugsFixed += fixed; return `Each engineer explains their bug to a duck. ${fixed} bugs fixed.`; },
  },
  {
    id: 'tech-talk', title: 'Your Blog Post Went Viral', emoji: '📝', tone: 'good',
    text: () => '"How We Scaled to Millions Using Boring Technology" is trending. Recruiters and users are noticing.',
    weight: (s) => (s.skills.length >= 3 ? 0.7 : 0),
    auto: (s, m) => { s.hype += 0.35 * (1 + m.hypeGain); s.rp += 40; return '+hype, +40 research points.'; },
  },
  {
    id: 'competitor', title: 'Competitor Launches', emoji: '🥊', tone: 'bad',
    text: () => 'A well-funded competitor just launched with a slick demo and a $100M marketing budget.',
    weight: (s) => (s.users > 5000 ? 0.8 : 0),
    choices: [
      {
        label: 'Match their marketing',
        hint: (s) => `−$${fmt(burn(s))}. Growth unaffected.`,
        disabled: (s) => s.cash < burn(s),
        apply: (s) => { s.cash -= burn(s); return 'Billboards on the 101. Your mom saw one.'; },
      },
      {
        label: 'Out-ship them',
        hint: () => '−25% growth for 60 days, +15% feature speed for 60 days.',
        apply: (s) => {
          addBuff(s, 'competitor', 'Competitor Pressure', '🥊', 60, { mods: { growth: 0.75 } }, false);
          addBuff(s, 'outship', 'War Mode', '⚔️', 60, { mods: { featureSpeed: 1.15 } }, true);
          return 'Heads down. Ship, ship, ship.';
        },
      },
    ],
  },
  {
    id: 'cosmic-flip', title: 'Bit Flip!', emoji: '☢️', tone: 'bad',
    text: () => 'A cosmic ray flipped a bit in a balance field. One user briefly had $4,294,967,296.',
    weight: (s) => (s.mutators.includes('cosmic') ? 2 : 0.05),
    auto: (s) => { s.bugs += 6; s.sat -= 2; return '+6 bugs. ECC memory, checksums and verification exist for a reason.'; },
  },
  {
    id: 'mars-window', title: 'Mars Opposition', emoji: '🔴', tone: 'neutral',
    text: () => 'Earth and Mars are at their closest. Martian users flood in while the latency is lower.',
    weight: (s) => (s.mutators.includes('mars') ? 1.2 : 0),
    auto: (s) => { addBuff(s, 'opposition', 'Mars Opposition', '🔴', 20, { mods: { latencyFloor: -200, growth: 1.3 } }, true); return '−200ms latency floor and +30% growth for 20 days.'; },
  },
  {
    id: 'friday-deploy', title: 'Friday 5pm Deploy', emoji: '📅', tone: 'bad',
    text: () => 'Someone merged to main at 4:59pm on a Friday and left for the weekend.',
    weight: (s) => (s.skills.includes('cicd') ? 0.3 : 0.8),
    auto: (s, m) => {
      const h = (8 + rand(s) * 20) * m.incidentDuration;
      s.outageHours += h;
      s.outageName = 'Friday deploy';
      return `Nobody noticed until Monday. ${Math.round(h)} hours of degraded service.`;
    },
  },
  {
    id: 'investor-dinner', title: 'Investor Wants to "Help"', emoji: '🍷', tone: 'neutral',
    text: () => 'Your lead investor read a blog post about blockchain and has Thoughts.',
    weight: (s) => (s.fundingRound > 0 ? 0.6 : 0),
    choices: [
      {
        label: 'Add blockchain',
        hint: () => '+40% hype, +30 tech debt, −3 satisfaction.',
        apply: (s) => { s.hype += 0.4; s.debt += 30; s.sat -= 3; return 'You now have an NFT feature nobody uses. The investor is thrilled.'; },
      },
      {
        label: 'Politely ignore',
        hint: () => 'Nothing happens. Probably.',
        apply: () => 'You nod, smile, and ship what users actually asked for.',
      },
    ],
  },
  {
    id: 'thundering', title: 'Thundering Herd', emoji: '🐃', tone: 'bad',
    text: () => 'Your service came back up and every client retried at the same instant. Down again.',
    weight: (s) => (s.users > 20_000 && s.stats.incidents > 1 ? 0.6 : 0),
    codex: 'thundering-herd',
    auto: (s, m) => {
      if (m.errorMult < 0.75) return '⚡ Circuit breakers and exponential backoff with jitter spread the retries out. No impact.';
      addBuff(s, 'herd', 'Retry Storm', '🐃', 2, { mods: { traffic: 3 } }, false);
      return 'Retry storm: ×3 traffic for 2 days. Jittered backoff and circuit breakers prevent this.';
    },
  },
  {
    id: 'platform-shift', title: 'Paradigm Shift!', emoji: '🌀', tone: 'neutral',
    text: (s) => `${SHIFTS[s.seed % SHIFTS.length]} Every analyst says companies that don't adapt will be disrupted.`,
    weight: (s) => (s.day > 700 && s.users > 50_000 ? 2.5 : 0),
    once: true,
    choices: [
      {
        label: 'Go all-in on the new paradigm',
        hint: (s) => `−$${fmt(shiftCost(s))}, lose all current research points. +25% addressable market, big hype.`,
        disabled: (s) => s.cash < shiftCost(s),
        apply: (s) => { s.cash -= shiftCost(s); s.rp = 0; s.perks.push('shift-adapt'); s.hype += 0.6; return 'You reinvented the company. The old guard laughs, the new users pour in.'; },
      },
      {
        label: 'Run a small skunkworks team',
        hint: () => 'Lose 40% of research and feature progress. TAM unchanged.',
        apply: (s) => { s.rp *= 0.6; s.featurePts *= 0.6; return 'A small team keeps you in the game. Not a leader, not left behind.'; },
      },
      {
        label: "It's a fad",
        hint: () => '−30% addressable market permanently.',
        apply: (s) => { s.perks.push('shift-ignore'); return 'History will judge this decision. Harshly.'; },
      },
    ],
  },
  {
    id: 'press', title: 'Glowing Press Coverage', emoji: '📰', tone: 'good',
    text: (s) => `A major outlet named ${s.companyName} one of "10 Startups to Watch".`,
    weight: (s) => (s.sat > 70 ? 0.7 : 0.1),
    auto: (s, m) => { s.hype += 0.4 * (1 + m.hypeGain); return '+40% hype.'; },
  },
];

const SHIFTS = [
  'Everyone now browses through AR glasses instead of phones.',
  'Natural-language AI agents are replacing apps. Users just ask a bot.',
  'A new decentralized protocol lets users own their data and switch providers instantly.',
  'Quantum-safe cryptography is mandatory. Every handshake has to be rewritten.',
];
function shiftCost(s: GameState): number {
  return Math.round(Math.max(1_000_000, s.metrics.revenueDay * 120) / 100_000) * 100_000;
}
function scrub(s: GameState): number {
  return Math.round(Math.max(40_000, burn(s) * 0.5) / 1000) * 1000;
}
function retention(s: GameState): number {
  return Math.round(Math.max(30_000, s.metrics.costs.salary * 30 * 0.12) / 1000) * 1000;
}
function fine(s: GameState): number {
  return Math.round(Math.max(100_000, s.metrics.revenueDay * 365 * 0.04) / 1000) * 1000;
}
function acqMult(s: GameState): number {
  return 1.2 + ((s.day * 7) % 10) / 20;
}
function acqOffer(s: GameState): number {
  return s.metrics.valuation * acqMult(s);
}

export function getEvent(id: string): GameEvent | undefined {
  return EVENTS.find((e) => e.id === id);
}

export function resolveEventChoice(s: GameState, ev: GameEvent, choiceIndex: number): string {
  const choice = ev.choices?.[choiceIndex];
  if (!choice) return '';
  const msg = choice.apply(s);
  if (ev.codex) unlockCodex(s, ev.codex);
  log(s, `${ev.emoji} ${ev.title}: ${msg}`, ev.tone === 'good' ? 'good' : ev.tone === 'bad' ? 'warn' : 'info');
  return msg;
}
