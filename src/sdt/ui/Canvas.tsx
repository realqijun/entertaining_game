import { useEffect, useState, type ReactNode } from 'react';
import { DB_TIERS } from '../content/balance';
import type { Component, GameState, Instance } from '../engine/types';
import { CacheArt, Crowd, DbArt, LbArt, ServerBox, moodFor } from './Art';
import { ms, num, pct, utilTone } from './format';

/** 2D architecture view: users → (load balancer) → app instances → (cache) → database, drawn as little characters. */

interface P {
  x: number;
  y: number;
}
interface Layout {
  w: number;
  h: number;
  vertical: boolean;
  users: P;
  lb: P;
  app: P;
  cache: P;
  db: P;
}

/** Wide screens read left to right; phones read top to bottom so nothing hides off-screen. */
const WIDE: Layout = { w: 760, h: 320, vertical: false, users: { x: 66, y: 150 }, lb: { x: 205, y: 150 }, app: { x: 378, y: 150 }, cache: { x: 548, y: 150 }, db: { x: 690, y: 150 } };
const TALL: Layout = { w: 360, h: 680, vertical: true, users: { x: 150, y: 56 }, lb: { x: 150, y: 170 }, app: { x: 180, y: 330 }, cache: { x: 150, y: 500 }, db: { x: 150, y: 612 } };
/** Half-size of each drawing, used for wire end points. */
const ART = { x: 34, y: 30 };

export function useNarrow(): boolean {
  const q = '(max-width: 640px)';
  const [narrow, setNarrow] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    const mq = matchMedia(q);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

interface Props {
  s: GameState;
  selected: Component | null;
  onSelect?: (c: Component) => void;
  compact?: boolean;
}

/** A wire with glowing request dots travelling along it. More traffic → more, faster dots; failures show as red dots. */
function Flow({ a, b, v, rps, tone, err = 0, dead }: { a: P; b: P; v: boolean; rps: number; tone: string; err?: number; dead?: boolean }) {
  const lg = Math.log10(Math.max(rps, 1));
  const w = Math.max(2, Math.min(7, lg * 1.6));
  const dur = Math.max(0.9, 3 - lg * 0.55);
  const d = v
    ? `M${a.x},${a.y} C${a.x},${(a.y + b.y) / 2} ${b.x},${(a.y + b.y) / 2} ${b.x},${b.y}`
    : `M${a.x},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}`;
  const dots = rps > 0 ? Math.max(1, Math.min(6, Math.round(lg * 1.6))) : 0;
  const bad = dead ? dots : Math.round(dots * Math.min(1, err * 3));
  return (
    <g className={`flow tone-${tone}${dead ? ' dead' : ''}`}>
      <path d={d} className="flow-bed" strokeWidth={w + 6} />
      <path d={d} className="flow-core" strokeWidth={Math.max(1.5, w / 2)} />
      {Array.from({ length: dots }, (_, i) => (
        <circle key={i} r={i < bad ? 3.4 : 3} className={i < bad ? 'pkt bad' : 'pkt'}>
          <animateMotion dur={`${dur}s`} begin={`${-(i / dots) * dur}s`} repeatCount="indefinite" path={d} />
        </circle>
      ))}
    </g>
  );
}

/** A clickable component: illustration centred on (x, y), with a short label underneath (or beside it on phones). */
function Piece({ id, at, v, title, value, tone, selected, ghost, badge, onSelect, children }: {
  id: Component;
  at: P;
  v: boolean;
  title: string;
  value: string;
  tone: string;
  selected: boolean;
  ghost?: boolean;
  badge?: string;
  onSelect?: (c: Component) => void;
  children: ReactNode;
}) {
  const lx = v ? ART.x + 10 : 0;
  const ly = v ? -2 : ART.y + 18;
  return (
    <g
      className={`piece tone-${tone}${selected ? ' sel' : ''}${ghost ? ' ghost' : ''}${onSelect ? ' clickable' : ''}`}
      transform={`translate(${at.x},${at.y})`}
      onClick={onSelect ? () => onSelect(id) : undefined}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={onSelect ? (e) => (e.key === 'Enter' || e.key === ' ') && onSelect(id) : undefined}
      aria-label={`${title}: ${value}`}
    >
      <title>{`${title} · ${value}`}</title>
      <circle r={ART.x + 6} className="halo" />
      <g className="art">{children}</g>
      <text x={lx} y={ly} textAnchor={v ? 'start' : 'middle'} className="piece-title">
        {title}
      </text>
      <text x={lx} y={ly + 15} textAnchor={v ? 'start' : 'middle'} className="piece-val">
        {value}
      </text>
      {badge && (
        <g transform={`translate(${v ? ART.x + 34 : 0},${v ? -ART.y + 4 : -ART.y - 22})`}>
          <g className="badge-g">
            <rect x={-badge.length * 3.4 - 7} y={-9} width={badge.length * 6.8 + 14} height={18} rx={9} className="badge" />
            <text y={4} textAnchor="middle" className="badge-text">
              {badge}
            </text>
          </g>
        </g>
      )}
    </g>
  );
}

function instTone(i: Instance, util: number): string {
  if (i.status === 'down') return 'over';
  if (i.status !== 'up') return 'pending';
  return utilTone(util);
}

/** Where each server box sits: a column on wide screens, a two-column grid on phones. */
function appGeometry(L: Layout, n: number, standby: boolean) {
  if (!L.vertical) {
    const rowH = Math.min(n === 1 ? 52 : 42, 232 / Math.max(n, 1));
    const h = Math.max(15, rowH - 6);
    const top = L.app.y - (n * rowH) / 2 + 8;
    const boxTop = Math.min(top, L.app.y - 48) - 28;
    const boxH = Math.max(top + n * rowH, L.app.y + 48) - boxTop + 8 + (standby ? 24 : 0);
    const cells = Array.from({ length: n }, (_, k) => ({ x: L.app.x - 62, y: top + k * rowH + (rowH - h) / 2, w: 124, h }));
    const spare = { x: L.app.x - 62, y: boxTop + boxH - 28, w: 124, h: 20 };
    return { cells, spare, box: { x: L.app.x - 72, y: boxTop, w: 144, h: boxH }, title: { x: L.app.x, y: boxTop + 18 } };
  }
  const cols = n > 1 ? 2 : 1;
  const slots = n + (standby ? 1 : 0);
  const rows = Math.ceil(slots / cols);
  const rowH = 32;
  const cw = 132;
  const gw = cols * cw + (cols - 1) * 8;
  const boxH = rows * rowH + 40;
  const boxTop = L.app.y - boxH / 2;
  const cell = (k: number) => ({ x: L.app.x - gw / 2 + (k % cols) * (cw + 8), y: boxTop + 30 + Math.floor(k / cols) * rowH, w: cw, h: rowH - 6 });
  const cells = Array.from({ length: n }, (_, k) => cell(k));
  return { cells, spare: { ...cell(n), h: 20 }, box: { x: L.app.x - gw / 2 - 8, y: boxTop, w: gw + 16, h: boxH }, title: { x: L.app.x, y: boxTop + 19 } };
}

export function Canvas({ s, selected, onSelect, compact }: Props) {
  const narrow = useNarrow();
  const L = narrow ? TALL : WIDE;
  const v = L.vertical;
  const m = s.metrics;
  const building = (k: string) => s.builds.find((b) => b.kind === k);
  const lbBuild = building('lb');
  const cacheBuild = building('cache');
  const showLb = s.lb || !!lbBuild || s.tech.includes('lb');
  const showCache = s.cache.on || !!cacheBuild || s.tech.includes('cache');
  const dbBuild = building('db');

  const n = s.instances.length;
  const g = appGeometry(L, n, !!s.standby);
  const appTone = m.downShare > 0 ? 'over' : utilTone(m.appUtil);
  const dbTone = utilTone(m.dbUtil);
  const err = m.errRate;

  // Wire end points on each drawing.
  const out = (p: P): P => (v ? { x: p.x, y: p.y + ART.y } : { x: p.x + ART.x, y: p.y });
  const inn = (p: P): P => (v ? { x: p.x, y: p.y - ART.y } : { x: p.x - ART.x, y: p.y });
  const appIn: P = v ? { x: L.app.x, y: g.box.y } : { x: g.box.x + 6, y: L.app.y };
  const appOut: P = v ? { x: L.app.x, y: g.box.y + g.box.h } : { x: g.box.x + g.box.w - 6, y: L.app.y };
  const entry = showLb ? out(L.lb) : out(L.users);
  const toApp = m.appLoad + m.admitted * m.downShare;
  const routed = s.instances.filter((i) => i.status !== 'booting').length;
  const latTone = m.latency >= 500 ? 'over' : m.latency >= 300 ? 'hot' : 'ok';
  const errTxt = `${(err * 100).toFixed(err > 0 && err < 0.1 ? 1 : 0)}% err`;

  return (
    <div className="canvas-wrap">
      <svg className={`canvas${compact ? ' compact' : ''}${v ? ' tall' : ''}`} viewBox={`0 0 ${L.w} ${L.h}`} role="group" aria-label="System architecture">
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="1" className="grid-dot" />
          </pattern>
          <radialGradient id="floor" cx="50%" cy="45%" r="65%">
            <stop offset="0" stopColor="#16223c" />
            <stop offset="1" stopColor="#0a1020" />
          </radialGradient>
        </defs>
        <rect width={L.w} height={L.h} fill="url(#floor)" />
        <rect width={L.w} height={L.h} fill="url(#grid)" />

        {showLb && <Flow a={out(L.users)} b={inn(L.lb)} v={v} rps={m.admitted} tone={appTone} err={err} />}
        {v ? (
          <Flow a={entry} b={appIn} v={v} rps={toApp} tone={appTone} err={err} />
        ) : (
          s.instances.map((inst, k) => {
            const c = g.cells[k];
            const live = s.lb ? inst.status !== 'booting' : k === 0;
            return <Flow key={inst.id} a={entry} b={{ x: c.x, y: c.y + c.h / 2 }} v={v} rps={live ? toApp / Math.max(1, routed) : 0} tone={instTone(inst, m.appUtil)} err={err} dead={inst.status === 'down'} />;
          })
        )}
        {s.cache.on ? (
          <>
            <Flow a={appOut} b={inn(L.cache)} v={v} rps={m.served} tone={appTone} />
            <Flow a={out(L.cache)} b={inn(L.db)} v={v} rps={m.dbOps} tone={dbTone} />
          </>
        ) : (
          <Flow a={appOut} b={inn(L.db)} v={v} rps={m.dbOps} tone={dbTone} />
        )}

        <Piece id="users" at={L.users} v={v} title="Users" value={`${num(m.demand)} req/s`} tone={s.limit < 1 ? 'busy' : 'ok'} selected={selected === 'users'} onSelect={onSelect} badge={s.limit < 1 ? `limit ${pct(s.limit)}` : s.workload.cause ? 'spike!' : undefined}>
          <Crowd demand={m.demand} limited={s.limit < 1} spike={!!s.workload.cause} />
        </Piece>

        {showLb && (
          <Piece id="lb" at={L.lb} v={v} title="Balancer" value={s.lb ? (s.hc ? 'health checks' : 'round robin') : lbBuild ? 'building…' : '+ add'} tone={s.lb ? (m.downShare > 0 ? 'over' : 'ok') : 'pending'} ghost={!s.lb} selected={selected === 'lb'} onSelect={onSelect} badge={lbBuild ? `${lbBuild.left}⏱` : undefined}>
            <LbArt on={s.lb} hc={s.hc} mood={m.downShare > 0 ? 'panic' : 'happy'} />
          </Piece>
        )}

        <g
          className={`app-group${selected === 'app' ? ' sel' : ''}${onSelect ? ' clickable' : ''} tone-${appTone}`}
          onClick={onSelect ? () => onSelect('app') : undefined}
          role={onSelect ? 'button' : undefined}
          tabIndex={onSelect ? 0 : undefined}
          onKeyDown={onSelect ? (e) => (e.key === 'Enter' || e.key === ' ') && onSelect('app') : undefined}
          aria-label={`App servers ${pct(m.appUtil)} busy`}
        >
          <title>{`App servers · ${pct(m.appUtil)} of ${num(m.appCap)} req/s`}</title>
          <rect x={g.box.x} y={g.box.y} width={g.box.w} height={g.box.h} rx={16} className="group-box" />
          <text x={g.title.x} y={g.title.y} textAnchor="middle" className="group-title">
            App servers · <tspan className="group-pct">{pct(m.appUtil)}</tspan>
          </text>
          {s.instances.map((inst, k) => {
            const c = g.cells[k];
            const label = inst.status === 'down' ? 'crashed' : inst.status === 'up' ? `size ${inst.size}` : `${inst.status === 'resizing' ? 'resizing' : 'booting'} ${inst.timer}⏱`;
            return (
              <g key={inst.id} className={`inst tone-${instTone(inst, m.appUtil)}`} transform={`translate(${c.x},${c.y})`}>
                <ServerBox w={c.w} h={c.h} status={inst.status} util={m.appUtil} size={inst.size} label={label} />
              </g>
            );
          })}
          {s.standby && (
            <g className="inst standby" transform={`translate(${g.spare.x},${g.spare.y})`}>
              <ServerBox w={g.spare.w} h={g.spare.h} status={s.standby.status === 'up' ? 'spare' : 'booting'} util={0} size={s.standby.size} label={s.standby.status === 'up' ? 'spare (ready)' : `spare ${s.standby.timer}⏱`} />
            </g>
          )}
        </g>

        {showCache && (
          <Piece id="cache" at={L.cache} v={v} title="Cache" value={s.cache.on ? `hit ${pct(m.cacheHit)}` : cacheBuild ? 'building…' : '+ add'} tone={s.cache.on ? (s.cache.warm < 1 ? 'busy' : 'ok') : 'pending'} ghost={!s.cache.on} selected={selected === 'cache'} onSelect={onSelect} badge={cacheBuild ? `${cacheBuild.left}⏱` : s.cache.on && s.cache.warm < 1 ? 'warming' : undefined}>
            <CacheArt on={s.cache.on} warm={s.cache.warm} mood={s.cache.warm < 1 ? 'ok' : 'happy'} />
          </Piece>
        )}

        <Piece id="db" at={L.db} v={v} title="Database" value={`${num(m.dbOps)} / ${num(DB_TIERS[s.dbTier].cap)} ops`} tone={dbTone} selected={selected === 'db'} onSelect={onSelect} badge={dbBuild ? `upgrading ${dbBuild.left}⏱` : m.dbUtil >= 1 ? pct(m.dbUtil) : undefined}>
          <DbArt util={m.dbUtil} mood={moodFor(m.dbUtil)} upgrading={!!dbBuild} />
        </Piece>

        <g className={`vitals tone-${latTone}`} transform={v ? `translate(${L.w - 92},${L.users.y - 16})` : `translate(${L.users.x - 50},${L.users.y + 82})`}>
          <rect width={100} height={38} rx={10} className="vitals-box" />
          <text x={50} y={16} textAnchor="middle" className="vitals-lat">
            ⏱ {ms(m.latency)}
          </text>
          <text x={50} y={31} textAnchor="middle" className={`vitals-err${err >= 0.01 ? ' bad' : ''}`}>
            {errTxt}
          </text>
        </g>
      </svg>
    </div>
  );
}
