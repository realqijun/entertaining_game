export interface Region {
  id: string;
  name: string;
  emoji: string;
  tam: number;
  cost: number;
  requires: string[];
  why: string;
}

/** Late-game expansion: each region raises your addressable market, but only if your stack can serve it. */
export const REGIONS: Region[] = [
  { id: 'latam', name: 'Latin America', emoji: '🌎', tam: 0.15, cost: 750_000, requires: ['compression'], why: 'Mobile-first users on metered data need small payloads.' },
  { id: 'eu', name: 'Europe', emoji: '🇪🇺', tam: 0.25, cost: 1_500_000, requires: ['backups', 'codereview'], why: 'Data-protection law needs tested backups and an auditable change process.' },
  { id: 'apac', name: 'Asia-Pacific', emoji: '🌏', tam: 0.35, cost: 4_000_000, requires: ['cdn', 'replicas'], why: 'Light takes 100+ms across the Pacific, so you need a CDN and local read replicas.' },
  { id: 'africa', name: 'Africa', emoji: '🌍', tam: 0.2, cost: 2_500_000, requires: ['edge', 'compression'], why: 'The fastest-growing internet population, served best from the edge.' },
  { id: 'orbit', name: 'Low Earth Orbit', emoji: '🛰️', tam: 0.08, cost: 15_000_000, requires: ['multiregion', 'raft'], why: 'Space stations need consensus that survives satellites dropping in and out.' },
  { id: 'mars', name: 'Mars Colony', emoji: '🪐', tam: 0.12, cost: 40_000_000, requires: ['edge', 'multiregion', 'spanner'], why: 'A 20-minute light delay needs a fully autonomous, globally consistent replica on another planet.' },
];

export function getRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

export function regionTamMult(ids: string[]): number {
  return 1 + ids.reduce((a, id) => a + (getRegion(id)?.tam ?? 0), 0);
}
