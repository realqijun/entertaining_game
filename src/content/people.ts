import type { Effect } from '../engine/types';

export interface Trait {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  power: number;
  salaryMult: number;
  effect: Effect;
}

export const TRAITS: Trait[] = [
  { id: '10x', name: '10x Engineer', emoji: '🚀', desc: 'Does the work of three engineers. Eats your snacks. Costs double.', power: 3, salaryMult: 2, effect: {} },
  { id: 'rust', name: 'Rustacean', emoji: '🦀', desc: 'Rewrites the hot path in Rust: −7% CPU per request. Mentions it often.', power: 1.2, salaryMult: 1.2, effect: { mods: { cpuPerReq: 0.93 } } },
  { id: 'duck', name: 'Duck Whisperer', emoji: '🦆', desc: 'Debugs by talking to rubber ducks. +25% bug fixing.', power: 1.2, salaryMult: 1.1, effect: { mods: { bugFix: 1.25 } } },
  { id: 'owl', name: 'Night Owl', emoji: '🦉', desc: 'Commits at 3am. 1.8× output, +5% bugs.', power: 1.8, salaryMult: 1.15, effect: { mods: { bugSpawn: 1.05 } } },
  { id: 'oncall', name: 'Pager Hero', emoji: '📟', desc: 'Sleeps with the pager. −20% incident duration.', power: 1.2, salaryMult: 1.15, effect: { mods: { incidentDuration: 0.8 } } },
  { id: 'dba', name: 'Database Wizard', emoji: '🧙', desc: 'Knows every query plan by heart. ×1.2 DB capacity.', power: 1.2, salaryMult: 1.2, effect: { mods: { dbCapacity: 1.2 } } },
  { id: 'growth', name: 'Growth Hacker', emoji: '📣', desc: 'Writes code and tweets about it. +8% growth.', power: 1, salaryMult: 1.1, effect: { mods: { growth: 1.08 } } },
  { id: 'prof', name: 'Ex-Professor', emoji: '👩‍🏫', desc: 'Turns every standup into a lecture. +15% research.', power: 1.2, salaryMult: 1.2, effect: { mods: { researchSpeed: 1.15 } } },
  { id: 'designer', name: 'Design Engineer', emoji: '🎨', desc: 'Makes things beautiful. +3 satisfaction.', power: 1.1, salaryMult: 1.1, effect: { mods: { satBonus: 3 } } },
  { id: 'so', name: 'Stack Overflow Copy-Paster', emoji: '📋', desc: 'Ships fast. Very fast. +15% feature speed, +15% bugs.', power: 1.4, salaryMult: 0.9, effect: { mods: { featureSpeed: 1.15, bugSpawn: 1.15 } } },
  { id: 'kernel', name: 'Kernel Hacker', emoji: '🐧', desc: 'Tunes TCP buffers for fun. +10% server power.', power: 1.2, salaryMult: 1.25, effect: { mods: { serverPower: 1.1 } } },
  { id: 'frugal', name: 'FinOps Guru', emoji: '🧾', desc: 'Finds idle instances in their sleep. −12% server and bandwidth costs.', power: 1, salaryMult: 1.1, effect: { mods: { serverCost: 0.88, bandwidthCost: 0.88 } } },
  { id: 'refactorer', name: 'Clean Code Zealot', emoji: '🧹', desc: 'Leaves every file better than they found it. +30% debt paydown.', power: 1.1, salaryMult: 1.1, effect: { mods: { debtPaydown: 1.3 } } },
];

export const FIRST_NAMES = ['Ada', 'Linus', 'Grace', 'Alan', 'Barbara', 'Ken', 'Margaret', 'Dennis', 'Edsger', 'Donald', 'Radia', 'Guido', 'Frances', 'Tim', 'Shafi', 'Yukihiro', 'Hedy', 'Bjarne', 'Katherine', 'Vint', 'Sophie', 'Anders', 'Jean', 'Rasmus', 'Lynn', 'Satoshi', 'Annie', 'Brendan', 'Mary', 'Leslie'];
export const LAST_NAMES = ['Heap', 'Pointer', 'Stack', 'Lambda', 'Hashmap', 'Bytes', 'Kernel', 'Bloom', 'Mergesort', 'Null', 'Mutex', 'Segfault', 'Bitshift', 'Monad', 'Cache', 'Trie', 'Quicksort', 'Deadlock', 'Malloc', 'Regex', 'Semaphore', 'Btree', 'Daemon', 'Packet'];

export const HANDLES = ['@techbro420', '@devmom', '@cs_student', '@gamer_gurl', '@angryuser', '@hn_commenter', '@nullpointer', '@sysadmin_sam', '@vc_guru', '@early_adopter', '@rust_fan', '@product_pete', '@lurker99', '@data_dani', '@grumpy_greybeard'];

export function getTrait(id: string): Trait {
  return TRAITS.find((t) => t.id === id) ?? TRAITS[0];
}
