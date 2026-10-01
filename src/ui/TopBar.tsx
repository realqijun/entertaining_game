import { getProduct } from '../content/products';
import * as A from '../engine/actions';
import { BASE } from '../engine/helpers';
import { IPO_THRESHOLD } from '../engine/sim';
import type { GameState } from '../engine/types';
import { dateLabel, money, num, satColor } from './format';

type Act = <T>(fn: (s: GameState) => T) => T;

export function TopBar({ s, speed, setSpeed, act, onMenu }: { s: GameState; speed: number; setSpeed: (n: number) => void; act: Act; onMenu: () => void }) {
  const m = s.metrics;
  const p = getProduct(s.productId);
  const net = (m.revenueDay - m.costDay) * 30;
  const runway = net >= 0 ? Infinity : s.cash / -net;
  const progress = s.day / BASE.totalDays;
  const ipoReady = m.valuation >= IPO_THRESHOLD && !s.over;
  return (
    <header className="topbar">
      <div className="brand" onClick={onMenu} title="Menu">
        <span className="logo">O(</span>
        <span className="brand-name">{p.emoji} {s.companyName}</span>
        <span className="logo">)</span>
      </div>
      <div className="clock">
        <div className="clock-date">{dateLabel(s.day)}</div>
        <div className="progress" title={`${Math.round(progress * 100)}% of the 5-year run`}><div style={{ width: `${progress * 100}%` }} /></div>
      </div>
      <div className="speed" role="group" aria-label="Game speed">
        {['❚❚', '▶', '▶▶', '▶▶▶'].map((label, i) => (
          <button key={label} className={`btn sm ${speed === i ? 'active' : ''}`} onClick={() => setSpeed(i)} title={`${['Pause', 'Normal', 'Fast', 'Turbo'][i]} (${i === 0 ? 'Space' : i})`}>
            {label}
          </button>
        ))}
      </div>
      <div className="stats">
        <Stat label="Cash" value={money(s.cash)} tone={s.cash < 0 ? 'bad' : undefined} sub={runway === Infinity ? 'profitable 🎉' : `${runway.toFixed(1)} mo runway`} subTone={runway < 4 ? 'bad' : runway < 9 ? 'warn' : undefined} />
        <Stat label="Profit/mo" value={money(net)} tone={net >= 0 ? 'good' : 'bad'} sub={`rev ${money(m.revenueDay * 30)}`} />
        <Stat label="Users" value={num(s.users)} sub={`${m.growthDay >= 0 ? '+' : ''}${num(m.growthDay * 30)}/mo`} subTone={m.growthDay < 0 ? 'bad' : 'good'} />
        <Stat label="Happiness" value={`${Math.round(s.sat)}`} color={satColor(s.sat)} sub={`target ${Math.round(m.satTarget)}`} />
        <Stat label="Valuation" value={money(m.valuation)} sub={`you own ${(s.equity * 100).toFixed(0)}%`} />
      </div>
      {ipoReady && (
        <button className="btn ipo" onClick={() => { if (confirm('Ring the bell and IPO now? This ends the run with an early-exit bonus.')) act((st) => A.ipo(st)); }}>
          🔔 IPO
        </button>
      )}
    </header>
  );
}

function Stat({ label, value, sub, tone, subTone, color }: { label: string; value: string; sub?: string; tone?: string; subTone?: string; color?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone ?? ''}`} style={color ? { color } : undefined}>{value}</div>
      {sub && <div className={`stat-sub ${subTone ?? ''}`}>{sub}</div>}
    </div>
  );
}
