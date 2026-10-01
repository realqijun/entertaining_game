import { useEffect, useRef, useState, type MutableRefObject, type ReactElement } from 'react';
import * as A from '../engine/actions';
import { BASE } from '../engine/helpers';
import { computeMods } from '../engine/mods';
import { capacityPerServer } from '../engine/sim';
import type { GameState } from '../engine/types';
import { DataCenter, type SceneState, type Zone } from '../three/DataCenter';
import { money, num } from './format';
import { Antenna, Database, Server } from './Icons';
import { sfx } from './sfx';

type Act = <T>(fn: (s: GameState) => T) => T;
export type PopFn = (zone: Zone | { x: number; y: number }, text: string, tone?: 'good' | 'bad' | 'gold' | 'info') => void;

interface Pop { id: number; x: number; y: number; text: string; tone: string }

export function sceneStateOf(s: GameState, speed: number): SceneState {
  const m = s.metrics;
  const mods = computeMods(s);
  return {
    users: s.users,
    servers: s.servers,
    bandwidth: s.bandwidth,
    dbNodes: s.dbNodes,
    util: m.util,
    rps: m.rpsPeak,
    latency: m.latency,
    cacheHit: mods.flags.has('cache') ? mods.cacheHit : 0,
    cdn: mods.cdnOffload,
    down: m.downtime > 0 || s.outageHours > 0,
    bugs: s.bugs,
    outageHours: s.outageHours,
    teams: { product: s.teams.product, sre: s.teams.sre, rnd: s.teams.rnd, refactor: s.teams.refactor },
    regions: s.regions,
    flags: { cache: mods.flags.has('cache'), cdn: mods.flags.has('cdn'), edge: mods.flags.has('edge'), autoscale: mods.flags.has('autoscale') && s.autoscale },
    running: speed > 0 && !s.pending.length && !s.over,
    speed,
  };
}

/** The interactive 3D world plus HTML overlays pinned to its zones. */
export function World3D({ s, speed, act, popRef, sceneRef }: { s: GameState; speed: number; act: Act; popRef: MutableRefObject<PopFn | null>; sceneRef?: MutableRefObject<DataCenter | null> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dc = useRef<DataCenter | null>(null);
  const tags = useRef<Partial<Record<Zone, HTMLDivElement | null>>>({});
  const [pops, setPops] = useState<Pop[]>([]);
  const popId = useRef(0);
  const latest = useRef({ s, speed, act });
  latest.current = { s, speed, act };

  const pop: PopFn = (zone, text, tone = 'info') => {
    const p = typeof zone === 'string' ? dc.current?.zoneScreen(zone) : zone;
    if (!p) return;
    const id = ++popId.current;
    setPops((list) => [...list.slice(-12), { id, x: p.x + (Math.random() - 0.5) * 30, y: p.y, text, tone }]);
    window.setTimeout(() => setPops((list) => list.filter((x) => x.id !== id)), 1600);
  };
  popRef.current = pop;

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const scene = new DataCenter(c);
    dc.current = scene;
    if (sceneRef) sceneRef.current = scene;
    scene.onAnchors = (pos) => {
      for (const z of Object.keys(pos) as Zone[]) {
        const el = tags.current[z];
        const x = Math.max(70, Math.min(window.innerWidth - 70, pos[z].x));
        if (el) el.style.transform = `translate(${x}px, ${pos[z].y}px) translate(-50%, -100%)`;
      }
    };
    scene.onPick = (kind, at) => {
      const { act: doAct } = latest.current;
      if (kind === 'bug') {
        const n = doAct((st) => A.squashBug(st));
        sfx.squash();
        pop(at, `🐛 −${Math.max(1, Math.round(n))}`, 'good');
      } else if (kind === 'fire') {
        const h = doAct((st) => A.extinguish(st));
        sfx.splash();
        pop(at, `🧯 −${Math.round(h)}h`, 'good');
      } else {
        const r = doAct((st) => A.catchGolden(st));
        sfx.coin();
        pop(at, r.kind === 'cash' ? `+${money(r.amount)}` : r.kind === 'rp' ? `+${r.amount} RP` : '🔥 HYPE!', 'gold');
      }
    };
    return () => {
      scene.dispose();
      dc.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dc.current?.setState(sceneStateOf(s, speed));
    dc.current?.setPaused(speed === 0);
  });

  // Golden packets drift by every so often while the game runs.
  useEffect(() => {
    if (speed === 0) return;
    const id = window.setInterval(() => {
      if (Math.random() < 0.3) dc.current?.spawnGolden();
    }, 6000);
    return () => window.clearInterval(id);
  }, [speed]);

  const m = s.metrics;
  const mods = computeMods(s);
  const auto = mods.flags.has('autoscale') && s.autoscale;
  const fit = (demand: number, per: number) => Math.max(1, Math.ceil(demand / (per * 0.65)));
  const zones: { z: Zone; kind: A.Infra; icon: ReactElement; util: number; count: number; ideal: number; unit: number; auto: boolean; label: string }[] = [
    { z: 'bw', kind: 'bandwidth', icon: <Antenna size={18} />, util: m.util.bw, count: s.bandwidth, ideal: fit(m.bwDemand, BASE.bandwidthMbps), unit: (m.costs.bandwidth * 30) / Math.max(1, s.bandwidth), auto, label: 'Bandwidth' },
    { z: 'cpu', kind: 'servers', icon: <Server size={18} />, util: m.util.cpu, count: s.servers, ideal: fit(m.cpuDemand, capacityPerServer(mods)), unit: (m.costs.servers * 30) / Math.max(1, s.servers), auto, label: 'Servers' },
    { z: 'db', kind: 'dbNodes', icon: <Database size={18} />, util: m.util.db, count: s.dbNodes, ideal: fit(m.dbDemand, BASE.dbQps * mods.dbCapacity), unit: (m.costs.db * 30) / Math.max(1, s.dbNodes), auto: false, label: 'Database' },
  ];
  const set = (kind: A.Infra, v: number, up: boolean) => {
    act((st) => A.setInfra(st, kind, v));
    if (up) sfx.buy(); else sfx.sell();
  };
  const tweet = s.tweets[0] && s.day - s.tweets[0].day < 4 ? s.tweets[0] : null;

  return (
    <div className="world">
      <canvas ref={canvas} className="world-canvas" />
      {zones.map((zn) => {
        const hot = zn.util > 1 ? 'over' : zn.util > 0.85 ? 'hot' : '';
        const step = Math.max(1, Math.round(zn.count * 0.15));
        return (
          <div key={zn.z} ref={(el) => { tags.current[zn.z] = el; }} className={`ztag ${hot}`}>
            <div className="ztag-head" title={`${zn.label}: ${money(zn.unit)}/mo each`}>
              {zn.icon}
              <b>{num(zn.count, 2)}</b>
              <span className="ztag-load">{Math.round(Math.min(zn.util, 9.99) * 100)}%</span>
            </div>
            <div className="ztag-bar"><i style={{ width: `${Math.min(100, zn.util * 100)}%` }} /></div>
            {zn.auto ? (
              <div className="ztag-auto">AUTO</div>
            ) : (
              <div className="ztag-btns">
                <button disabled={zn.count <= 1} onClick={() => set(zn.kind, zn.count - step, false)} aria-label={`Remove ${zn.label}`}>−</button>
                <button className={zn.ideal !== zn.count ? 'fit' : ''} disabled={zn.ideal === zn.count} onClick={() => set(zn.kind, zn.ideal, zn.ideal > zn.count)} title="Right-size to ~65% load">⚖</button>
                <button onClick={() => set(zn.kind, zn.count + step, true)} aria-label={`Add ${zn.label}`}>+</button>
              </div>
            )}
          </div>
        );
      })}
      <div ref={(el) => { tags.current.users = el; }} className="ztag users-tag">
        {tweet ? <div className={`bubble ${tweet.mood}`} key={tweet.day + tweet.text}>{tweet.text.replace(/@\S+\s?/, '')}</div> : <div className="bubble-spacer" />}
      </div>
      <div ref={(el) => { tags.current.office = el; }} className="ztag office-tag" />
      {pops.map((p) => (
        <div key={p.id} className={`pop ${p.tone}`} style={{ left: p.x, top: p.y }}>{p.text}</div>
      ))}
    </div>
  );
}
