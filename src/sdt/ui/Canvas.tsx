import { useEffect, useState } from 'react';
import { DB_TIERS, SIZES } from '../content/balance';
import type { Component, GameState, Instance } from '../engine/types';
import { ms, num, pct, utilTone } from './format';

/** 2D architecture view: users → (load balancer) → app instances → (cache) → database. */

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
const WIDE: Layout = { w: 750, h: 300, vertical: false, users: { x: 70, y: 150 }, lb: { x: 210, y: 150 }, app: { x: 370, y: 150 }, cache: { x: 530, y: 150 }, db: { x: 680, y: 150 } };
const TALL: Layout = { w: 360, h: 600, vertical: true, users: { x: 180, y: 42 }, lb: { x: 180, y: 140 }, app: { x: 180, y: 300 }, cache: { x: 180, y: 452 }, db: { x: 180, y: 550 } };
const NODE_W = 112;
const NODE_H = 62;

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

function Flow({ a, b, v, rps, tone, dead }: { a: P; b: P; v: boolean; rps: number; tone: string; dead?: boolean }) {
  const w = Math.max(1.5, Math.min(7, Math.log10(Math.max(rps, 1)) * 1.6));
  const dur = Math.max(0.35, 2.2 - Math.log10(Math.max(rps, 1)) * 0.45);
  const d = v
    ? `M${a.x},${a.y} C${a.x},${(a.y + b.y) / 2} ${b.x},${(a.y + b.y) / 2} ${b.x},${b.y}`
    : `M${a.x},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}`;
  return (
    <g className={`flow tone-${tone}${dead ? ' dead' : ''}`}>
      <path d={d} className="flow-bed" strokeWidth={w + 4} />
      {rps > 0 && <path d={d} className="flow-dash" strokeWidth={w} style={{ animationDuration: `${dur}s` }} />}
    </g>
  );
}

function Node({
  id,
  x,
  y,
  w = 112,
  h = 62,
  title,
  sub,
  util,
  tone,
  selected,
  ghost,
  badge,
  onSelect,
  icon,
}: {
  id: Component;
  x: number;
  y: number;
  w?: number;
  h?: number;
  title: string;
  sub: string;
  util?: number;
  tone: string;
  selected: boolean;
  ghost?: boolean;
  badge?: string;
  icon: React.ReactNode;
  onSelect?: (c: Component) => void;
}) {
  return (
    <g
      className={`node tone-${tone}${selected ? ' sel' : ''}${ghost ? ' ghost' : ''}${onSelect ? ' clickable' : ''}`}
      transform={`translate(${x - w / 2},${y - h / 2})`}
      onClick={onSelect ? () => onSelect(id) : undefined}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={onSelect ? (e) => (e.key === 'Enter' || e.key === ' ') && onSelect(id) : undefined}
      aria-label={`${title}: ${sub}`}
    >
      <title>{`${title} · ${sub}`}</title>
      <rect width={w} height={h} rx={12} className="node-box" />
      <g transform="translate(10,10)" className="node-icon">
        {icon}
      </g>
      <text x={34} y={22} className="node-title">
        {title}
      </text>
      <text x={10} y={44} className="node-sub">
        {sub}
      </text>
      {util !== undefined && (
        <g transform={`translate(10,${h - 10})`}>
          <rect width={w - 20} height={4} rx={2} className="bar-bed" />
          <rect width={Math.min(1, util) * (w - 20)} height={4} rx={2} className="bar-fill" />
        </g>
      )}
      {badge && (
        <g transform={`translate(${w - 8},-6)`}>
          <rect x={-badge.length * 7 - 8} width={badge.length * 7 + 12} height={18} rx={9} className="badge" />
          <text x={-badge.length * 3.5 - 2} y={13} className="badge-text" textAnchor="middle">
            {badge}
          </text>
        </g>
      )}
    </g>
  );
}

const I = {
  users: (
    <g fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx={8} cy={8} r={7} />
      <path d="M1 8h14M8 1c3 3 3 11 0 14M8 1c-3 3-3 11 0 14" />
    </g>
  ),
  lb: (
    <g fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M1 8h5M6 8l8-6M6 8h8M6 8l8 6" />
    </g>
  ),
  app: (
    <g fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x={1} y={1} width={14} height={6} rx={1.5} />
      <rect x={1} y={9} width={14} height={6} rx={1.5} />
      <path d="M4 4h1M4 12h1" strokeLinecap="round" />
    </g>
  ),
  cache: (
    <g fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
      <path d="M9 1L3 9h5l-1 6 6-8H8z" />
    </g>
  ),
  db: (
    <g fill="none" stroke="currentColor" strokeWidth={1.8}>
      <ellipse cx={8} cy={3.5} rx={6.5} ry={2.5} />
      <path d="M1.5 3.5v9c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-9M1.5 8c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5" />
    </g>
  ),
};

function instTone(i: Instance, util: number): string {
  if (i.status === 'down') return 'over';
  if (i.status !== 'up') return 'pending';
  return utilTone(util);
}

/** Where each instance box sits: a column on wide screens, a two-column grid on phones. */
function appGeometry(L: Layout, n: number, standby: boolean) {
  if (!L.vertical) {
    const rowH = Math.min(46, 230 / n);
    const h = Math.max(18, rowH - 6);
    const top = L.app.y - (n * rowH) / 2;
    const boxTop = Math.min(top, L.app.y - 48) - 26;
    const boxH = Math.max(top + n * rowH, L.app.y + 48) - boxTop + 8 + (standby ? 24 : 0);
    const cells = Array.from({ length: n }, (_, k) => ({ x: L.app.x - 60, y: top + k * rowH + (rowH - h) / 2, w: 120, h }));
    const spare = { x: L.app.x - 60, y: boxTop + boxH - 28, w: 120, h: 18 };
    return { cells, spare, box: { x: L.app.x - 68, y: boxTop, w: 136, h: boxH }, title: { x: L.app.x - 60, y: boxTop + 17 } };
  }
  const cols = n > 1 ? 2 : 1;
  const slots = n + (standby ? 1 : 0);
  const rows = Math.ceil(slots / cols);
  const rowH = 30;
  const cw = 120;
  const gw = cols * cw + (cols - 1) * 8;
  const boxH = rows * rowH + 40;
  const boxTop = L.app.y - boxH / 2;
  const cell = (k: number) => ({ x: L.app.x - gw / 2 + (k % cols) * (cw + 8), y: boxTop + 30 + Math.floor(k / cols) * rowH, w: cw, h: rowH - 6 });
  const cells = Array.from({ length: n }, (_, k) => cell(k));
  return { cells, spare: { ...cell(n), h: 18 }, box: { x: L.app.x - gw / 2 - 8, y: boxTop, w: gw + 16, h: boxH }, title: { x: L.app.x - gw / 2, y: boxTop + 18 } };
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

  // Connection points on each node.
  const out = (p: P, half = NODE_W / 2): P => (v ? { x: p.x, y: p.y + NODE_H / 2 } : { x: p.x + half, y: p.y });
  const inn = (p: P, half = NODE_W / 2): P => (v ? { x: p.x, y: p.y - NODE_H / 2 } : { x: p.x - half, y: p.y });
  const appIn: P = v ? { x: L.app.x, y: g.box.y } : { x: g.box.x + 8, y: L.app.y };
  const appOut: P = v ? { x: L.app.x, y: g.box.y + g.box.h } : { x: g.box.x + g.box.w - 8, y: L.app.y };
  const entry = showLb ? out(L.lb) : out(L.users);
  const toApp = m.appLoad + m.admitted * m.downShare;
  const routed = s.instances.filter((i) => i.status !== 'booting').length;

  return (
    <div className="canvas-wrap">
      <svg className={`canvas${compact ? ' compact' : ''}${v ? ' tall' : ''}`} viewBox={`0 0 ${L.w} ${L.h}`} role="group" aria-label="System architecture">
        <defs>
          <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M25 0H0V25" fill="none" className="grid-line" />
          </pattern>
        </defs>
        <rect width={L.w} height={L.h} fill="url(#grid)" />

        {showLb && <Flow a={out(L.users)} b={inn(L.lb)} v={v} rps={m.admitted} tone={appTone} />}
        {v ? (
          <Flow a={entry} b={appIn} v={v} rps={toApp} tone={appTone} />
        ) : (
          s.instances.map((inst, k) => {
            const c = g.cells[k];
            const live = s.lb ? inst.status !== 'booting' : k === 0;
            return <Flow key={inst.id} a={entry} b={{ x: c.x, y: c.y + c.h / 2 }} v={v} rps={live ? toApp / Math.max(1, routed) : 0} tone={instTone(inst, m.appUtil)} dead={inst.status === 'down'} />;
          })
        )}
        {s.cache.on ? (
          <>
            <Flow a={appOut} b={inn(L.cache, 50)} v={v} rps={m.served} tone={appTone} />
            <Flow a={out(L.cache, 50)} b={inn(L.db)} v={v} rps={m.dbOps} tone={dbTone} />
          </>
        ) : (
          <Flow a={appOut} b={inn(L.db)} v={v} rps={m.dbOps} tone={dbTone} />
        )}

        <Node id="users" x={L.users.x} y={L.users.y} title="Users" sub={`${num(m.demand)} req/s`} tone={s.limit < 1 ? 'busy' : 'ok'} selected={selected === 'users'} onSelect={onSelect} icon={I.users} badge={s.limit < 1 ? `limit ${pct(s.limit)}` : s.workload.cause ? '↑ spike' : undefined} />

        {showLb && (
          <Node id="lb" x={L.lb.x} y={L.lb.y} title="Balancer" sub={s.lb ? (s.hc ? 'health-checked' : 'round robin') : lbBuild ? 'building…' : '+ add'} tone={s.lb ? (m.downShare > 0 ? 'over' : 'ok') : 'pending'} ghost={!s.lb} selected={selected === 'lb'} onSelect={onSelect} icon={I.lb} badge={lbBuild ? `${lbBuild.left}⏱` : undefined} />
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
          <rect x={g.box.x} y={g.box.y} width={g.box.w} height={g.box.h} rx={14} className="group-box" />
          <text x={g.title.x} y={g.title.y} className="group-title">
            App · {pct(m.appUtil)}
          </text>
          {s.instances.map((inst, k) => {
            const c = g.cells[k];
            const tone = instTone(inst, m.appUtil);
            const label = inst.status === 'down' ? '✕ down' : inst.status === 'up' ? `${inst.size} · ${num(SIZES[inst.size].cap)}` : `${inst.status === 'resizing' ? '↻' : '⏻'} ${inst.timer}⏱`;
            const roomy = c.h >= 22;
            return (
              <g key={inst.id} className={`inst tone-${tone}`} transform={`translate(${c.x},${c.y})`}>
                <rect width={c.w} height={c.h} rx={7} className="inst-box" />
                {roomy && (
                  <text x={8} y={c.h / 2 + 4} className="inst-text">
                    #{inst.id}
                  </text>
                )}
                <text x={roomy ? 34 : 8} y={c.h / 2 + 4} className="inst-text">
                  {label}
                </text>
              </g>
            );
          })}
          {s.standby && (
            <g className="inst standby" transform={`translate(${g.spare.x},${g.spare.y})`}>
              <rect width={g.spare.w} height={18} rx={6} className="inst-box" />
              <text x={8} y={13} className="inst-text">
                spare {s.standby.status === 'up' ? 'ready' : `${s.standby.timer}⏱`}
              </text>
            </g>
          )}
        </g>

        {showCache && (
          <Node id="cache" x={L.cache.x} y={L.cache.y} w={100} title="Cache" sub={s.cache.on ? `hit ${pct(m.cacheHit)}` : cacheBuild ? 'building…' : '+ add'} tone={s.cache.on ? (s.cache.warm < 1 ? 'busy' : 'ok') : 'pending'} ghost={!s.cache.on} selected={selected === 'cache'} onSelect={onSelect} icon={I.cache} badge={cacheBuild ? `${cacheBuild.left}⏱` : s.cache.on && s.cache.warm < 1 ? 'cold' : undefined} util={s.cache.on ? s.cache.warm : undefined} />
        )}

        <Node id="db" x={L.db.x} y={L.db.y} title="Database" sub={`${num(m.dbOps)}/${num(DB_TIERS[s.dbTier].cap)} ops`} util={m.dbUtil} tone={dbTone} selected={selected === 'db'} onSelect={onSelect} icon={I.db} badge={dbBuild ? `↑ ${dbBuild.left}⏱` : m.dbUtil >= 1 ? pct(m.dbUtil) : undefined} />

        <text x={v ? L.users.x + 118 : L.users.x} y={v ? L.users.y + 4 : L.users.y + 52} textAnchor={v ? 'start' : 'middle'} className={`lat-label tone-${m.latency >= 500 ? 'over' : m.latency >= 300 ? 'hot' : 'ok'}`}>
          {v ? ms(m.latency) : `${ms(m.latency)} · ${(m.errRate * 100).toFixed(m.errRate > 0 && m.errRate < 0.1 ? 1 : 0)}% err`}
        </text>
        {v && (
          <text x={L.users.x + 118} y={L.users.y + 20} className={`lat-label tone-${m.errRate >= 0.01 ? 'over' : 'ok'}`}>
            {(m.errRate * 100).toFixed(m.errRate > 0 && m.errRate < 0.1 ? 1 : 0)}% err
          </text>
        )}
      </svg>
    </div>
  );
}
