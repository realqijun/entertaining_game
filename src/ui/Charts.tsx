import { useState } from 'react';
import type { GameState, HistoryPoint } from '../engine/types';
import { money, ms, num } from './format';

type Series = { key: keyof HistoryPoint; label: string; fmt: (n: number) => string; color: string; log?: boolean };

const TABS: { id: string; label: string; series: Series[] }[] = [
  { id: 'users', label: 'Users', series: [{ key: 'users', label: 'Users', fmt: (n) => num(n), color: '#38bdf8', log: true }] },
  { id: 'money', label: 'Money', series: [{ key: 'cash', label: 'Cash', fmt: (n) => money(n), color: '#22c55e' }, { key: 'revenue', label: 'Revenue/mo', fmt: (n) => money(n), color: '#a78bfa' }] },
  { id: 'val', label: 'Valuation', series: [{ key: 'valuation', label: 'Valuation', fmt: (n) => money(n), color: '#f472b6', log: true }] },
  { id: 'sat', label: 'Happiness', series: [{ key: 'sat', label: 'Happiness', fmt: (n) => n.toFixed(0), color: '#fbbf24' }] },
  { id: 'lat', label: 'Latency', series: [{ key: 'latency', label: 'Latency', fmt: (n) => ms(n), color: '#fb7185', log: true }] },
];

export function Charts({ s }: { s: GameState }) {
  const [tab, setTab] = useState('users');
  const current = TABS.find((t) => t.id === tab)!;
  const data = s.history;
  const W = 600;
  const H = 150;
  const pad = 6;
  return (
    <div className="charts panel">
      <div className="tabs small">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none" role="img" aria-label={`${current.label} over time`}>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={W} y1={H * g} y2={H * g} className="gridline" />
        ))}
        {current.series.map((se) => {
          if (data.length < 2) return null;
          const tf = (v: number) => (se.log ? Math.log10(Math.max(1, v)) : v);
          const vals = data.map((d) => tf(d[se.key] as number));
          const all = current.series.flatMap((x) => data.map((d) => (x.log ? Math.log10(Math.max(1, d[x.key] as number)) : (d[x.key] as number))));
          const min = Math.min(0, ...all);
          const max = Math.max(1e-9, ...all);
          const x = (i: number) => (i / (data.length - 1)) * W;
          const y = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
          const line = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
          return (
            <g key={se.key}>
              {current.series.length === 1 && <path d={`${line}L${W},${H}L0,${H}Z`} fill={se.color} opacity={0.12} />}
              <path d={line} fill="none" stroke={se.color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
              {min < 0 && <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--bad)" strokeDasharray="4 4" opacity={0.6} />}
            </g>
          );
        })}
      </svg>
      <div className="chart-legend">
        {current.series.map((se) => (
          <span key={se.key}>
            <i style={{ background: se.color }} /> {se.label}: <b>{se.fmt((data[data.length - 1]?.[se.key] as number) ?? 0)}</b>
            {se.log && <span className="muted"> (log scale)</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
