import { useState, type ReactElement } from 'react';
import { getProduct } from '../content/products';
import * as A from '../engine/actions';
import { BASE } from '../engine/helpers';
import { IPO_THRESHOLD } from '../engine/sim';
import type { GameState } from '../engine/types';
import { money, ms, num, pct, satColor, uptime } from './format';
import { Coin, Face, Logo, Rocket, Sound, Users } from './Icons';
import { isMuted, setMuted, sfx } from './sfx';

type Act = <T>(fn: (s: GameState) => T) => T;

export function Hud({ s, speed, setSpeed, act, onMenu }: { s: GameState; speed: number; setSpeed: (n: number) => void; act: Act; onMenu: () => void }) {
  const [satOpen, setSatOpen] = useState(false);
  const [muted, setM] = useState(isMuted());
  const m = s.metrics;
  const net = (m.revenueDay - m.costDay) * 30;
  const year = Math.floor(s.day / 365) + 1;
  const ipo = m.valuation >= IPO_THRESHOLD && !s.over;
  return (
    <>
      <div className="hud-left">
        <button className="hud-brand" onClick={onMenu} title="Menu">
          <Logo size={30} />
          <span>{getProduct(s.productId).emoji} {s.companyName}</span>
        </button>
        <div className="hud-time">
          <span className="mono">Y{year} · D{s.day}</span>
          <div className="hud-prog"><i style={{ width: `${(s.day / BASE.totalDays) * 100}%` }} /></div>
        </div>
        <div className="hud-speed">
          {['❚❚', '▶', '▶▶', '▶▶▶'].map((l, i) => (
            <button key={l} className={speed === i ? 'on' : ''} onClick={() => { setSpeed(i); sfx.click(); }} title={['Pause (Space)', 'Normal (1)', 'Fast (2)', 'Turbo (3)'][i]}>{l}</button>
          ))}
          <button onClick={() => { setMuted(!muted); setM(!muted); }} title={muted ? 'Unmute' : 'Mute'}><Sound on={!muted} size={16} /></button>
        </div>
      </div>
      <div className="hud-right">
        <Pill icon={<Coin />} value={money(s.cash)} sub={`${net >= 0 ? '+' : ''}${money(net)}/mo`} tone={net >= 0 ? 'good' : 'bad'} warn={s.cash < 0} title="Cash · monthly profit" />
        <Pill icon={<Users />} value={num(s.users)} sub={`${m.growthDay >= 0 ? '+' : ''}${num(m.growthDay * 30)}/mo`} tone={m.growthDay >= 0 ? 'good' : 'bad'} title="Users · monthly growth" />
        <Pill icon={<Face mood={s.sat} />} value={`${Math.round(s.sat)}`} sub={s.sat < m.satTarget - 1 ? '▲' : s.sat > m.satTarget + 1 ? '▼' : '●'} tone={s.sat < m.satTarget ? 'good' : 'bad'} color={satColor(s.sat)} onClick={() => setSatOpen((o) => !o)} title="Happiness: click for the breakdown" />
        <Pill icon={<Rocket />} value={money(m.valuation)} sub={`own ${pct(s.equity)}`} title="Valuation · your stake" />
        {ipo && <button className="ipo-btn" onClick={() => { if (confirm('IPO now and end the run with a bonus?')) act((st) => A.ipo(st)); }}>🔔 IPO</button>}
      </div>
      {satOpen && <SatPop s={s} onClose={() => setSatOpen(false)} />}
    </>
  );
}

function Pill({ icon, value, sub, tone, color, warn, onClick, title }: { icon: ReactElement; value: string; sub?: string; tone?: string; color?: string; warn?: boolean; onClick?: () => void; title?: string }) {
  return (
    <button className={`pill ${warn ? 'warn' : ''} ${onClick ? 'clickable' : ''}`} onClick={onClick} title={title}>
      {icon}
      <span className="pill-v" style={color ? { color } : undefined}>{value}</span>
      {sub && <span className={`pill-s ${tone ?? ''}`}>{sub}</span>}
    </button>
  );
}

function SatPop({ s, onClose }: { s: GameState; onClose: () => void }) {
  const m = s.metrics;
  const w = getProduct(s.productId).weights;
  const rows: [keyof typeof m.satParts, string, string][] = [
    ['latency', '⚡ Speed', ms(m.latency)],
    ['reliability', '🛡️ Uptime', uptime(m.uptime30)],
    ['features', '✨ Features', `${s.featureLevel}/${Math.ceil(m.expectedFeatures)}`],
    ['bugs', '🐛 Bugs', `${Math.round(s.bugs)}`],
    ['price', '🏷️ Price', pct(s.monetization)],
  ];
  return (
    <div className="satpop" onClick={onClose}>
      <div className="satpop-title">Happiness → {Math.round(m.satTarget)}</div>
      {rows.map(([k, label, v]) => (
        <div key={k} className="satpop-row">
          <span>{label}<em>{Math.round(w[k] * 100)}%</em></span>
          <div className="bar"><i style={{ width: `${m.satParts[k]}%`, background: satColor(m.satParts[k]) }} /></div>
          <b>{v}</b>
        </div>
      ))}
    </div>
  );
}
