import { getCard } from '../content/cards';
import { getFounder } from '../content/founders';
import { getTrait } from '../content/people';
import { getProduct } from '../content/products';
import { getSkill } from '../content/skills';
import { getMutator } from '../content/worlds';
import { ADD_KEYS, type AddKey, type Effect, type GameState, type ModKey, type Mods, type MulKey } from './types';

const MUL_KEYS: MulKey[] = [
  'serverPower', 'cpuPerReq', 'dbCapacity', 'dbPerReq', 'payload', 'serverCost', 'bandwidthCost', 'dbCost', 'salary',
  'hireCost', 'featureSpeed', 'researchSpeed', 'bugSpawn', 'bugFix', 'debtPerFeature', 'debtPaydown', 'incidentChance',
  'incidentDuration', 'growth', 'arpu', 'tam', 'serviceTime', 'traffic', 'errorMult', 'productivity', 'cac',
];

export function emptyMods(): Mods {
  const m = { flags: new Set<string>() } as Mods;
  for (const k of MUL_KEYS) m[k] = 1;
  for (const k of ADD_KEYS) m[k] = 0;
  return m;
}

function isAdd(k: ModKey): k is AddKey {
  return (ADD_KEYS as string[]).includes(k);
}

export function applyEffect(m: Mods, e: Effect | undefined, power = 1): void {
  if (!e) return;
  if (e.mods) {
    for (const [k, v] of Object.entries(e.mods) as [ModKey, number][]) {
      if (isAdd(k)) m[k] += v * power;
      else m[k] *= power === 1 ? v : Math.pow(v, power);
    }
  }
  e.flags?.forEach((f) => m.flags.add(f));
}

/** Aggregate every source of modifiers: product, founder, mutators, skills, perks, star traits and temporary buffs. */
export function computeMods(s: GameState): Mods {
  const m = emptyMods();
  applyEffect(m, getProduct(s.productId).effect);
  applyEffect(m, getFounder(s.founderId).effect);
  for (const id of s.mutators) applyEffect(m, getMutator(id)?.effect);
  const moore = s.mutators.includes('moore');
  for (const id of s.skills) {
    const node = getSkill(id);
    if (!node) continue;
    applyEffect(m, node.effect, moore && node.branch === 'algo' ? 1.25 : 1);
  }
  for (const id of s.perks) applyEffect(m, getCard(id)?.perk);
  for (const st of s.stars) applyEffect(m, getTrait(st.trait).effect);
  for (const b of s.buffs) applyEffect(m, b.effect);

  if (moore) m.serverCost *= Math.pow(1.02, s.day / 30);
  if (m.flags.has('byzantine') && !m.flags.has('consensus')) {
    m.serverPower *= 0.85;
    m.incidentDuration *= 1.3;
  }
  if (m.flags.has('hypecycle')) {
    const wave = Math.sin((s.day / 365) * Math.PI * 2);
    m.growth *= 1 + 0.45 * wave;
  }
  m.cacheHit = Math.max(0, Math.min(0.97, m.cacheHit));
  m.cdnOffload = Math.max(0, Math.min(0.95, m.cdnOffload));
  return m;
}
