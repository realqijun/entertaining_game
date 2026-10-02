import { BAL, MILESTONES } from '../content/balance';
import { availability, dailyCost, dailyRevenue, users } from '../engine/sim';
import type { GameState, Point } from '../engine/types';
import { Gauge } from './Art';
import { avail, money, ms, num, pct, utilTone } from './format';

export function Hud({ s, paused, fast, onPause, onFast, onNext, onResearch, onMenu, researchPulse }: {
  s: GameState;
  paused: boolean;
  fast: boolean;
  onPause: () => void;
  onFast: () => void;
  onNext: () => void;
  onResearch: () => void;
  onMenu: () => void;
  researchPulse: boolean;
}) {
  const u = users(s);
  const target = MILESTONES[Math.min(s.milestone, MILESTONES.length - 1)];
  const prev = s.milestone > 0 ? MILESTONES[s.milestone - 1].users : 50_000;
  const prog = Math.max(0, Math.min(1, (u - prev) / (target.users - prev)));
  const net = dailyRevenue(s.metrics) - dailyCost(s);
  return (
    <header className="hud">
      <button className="brand" onClick={onMenu} title="Menu">
        99.99<span>%</span>
      </button>
      <div className="hud-stat" title={`Day ${s.day} of ${BAL.lastDay}. The run ends if you have not reached 1M users by day ${BAL.lastDay}.`}>
        <span className="hud-ic">📅</span>
        <small>Day</small>
        <b>{s.day}</b>
      </div>
      <div className="hud-stat grow" title={`Next milestone: ${target.title} at ${num(target.users)} users`}>
        <span className="hud-ic">👥</span>
        <small>Users → {num(target.users)} 🚩</small>
        <b>{num(u)}</b>
        <i className="prog">
          <i style={{ width: `${prog * 100}%` }} />
        </i>
      </div>
      <div className="hud-stat" title={`Revenue ${money(dailyRevenue(s.metrics))}/day − costs ${money(dailyCost(s))}/day`}>
        <span className="hud-ic">💰</span>
        <small>Cash</small>
        <b className={s.cash < 300 ? 'bad' : ''}>{money(s.cash)}</b>
        <em className={net >= 0 ? 'good' : 'bad'}>{net >= 0 ? '+' : ''}{money(net)}/d</em>
      </div>
      <div className="hud-stat" title="Reputation. Outages and slow days lower it, which slows growth. At 0 your users leave.">
        <span className="hud-ic">{s.rep >= 55 ? '😊' : s.rep >= 30 ? '😐' : '😟'}</span>
        <small>Rep</small>
        <b className={s.rep < 30 ? 'bad' : s.rep < 55 ? 'warn' : ''}>{Math.round(s.rep)}</b>
      </div>
      <div className="hud-stat hide-sm" title="Share of admitted requests served successfully so far">
        <span className="hud-ic">🛡️</span>
        <small>Uptime</small>
        <b>{avail(availability(s))}</b>
      </div>
      <button className={`btn research${researchPulse ? ' pulse' : ''}`} onClick={onResearch} title="Tech tree">
        🔬 Research{s.rp > 0 && <span className="pill">{s.rp}</span>}
      </button>
      <div className="clock">
        <button className="btn sm" onClick={onPause} title={paused ? 'Play' : 'Pause'} aria-label={paused ? 'Play' : 'Pause'}>
          {paused ? '▶' : '❚❚'}
        </button>
        <button className={`btn sm${fast ? ' on' : ''}`} onClick={onFast} title="Fast forward">
          »
        </button>
        {s.mode === 'day' && paused && (
          <button className="btn sm" onClick={onNext} title="Advance one day">
            +1 day
          </button>
        )}
      </div>
    </header>
  );
}

export function Spark({ pts, k, max, line }: { pts: Point[]; k: keyof Point; max: number; line?: number }) {
  const w = 120;
  const h = 30;
  if (pts.length < 2) return <svg className="spark" viewBox={`0 0 ${w} ${h}`} />;
  const xs = (i: number) => (i / (pts.length - 1)) * w;
  const ys = (v: number) => h - Math.min(1, v / max) * (h - 2) - 1;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(p[k] as number).toFixed(1)}`).join('');
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {line !== undefined && <line x1={0} x2={w} y1={ys(line)} y2={ys(line)} className="spark-line" />}
      <path d={d} />
    </svg>
  );
}

export function Metrics({ s }: { s: GameState }) {
  const m = s.metrics;
  const pts = (s.mode === 'live' ? s.liveHist : s.dayHist).slice(-30);
  const maxDemand = Math.max(1, ...pts.map((p) => p.demand));
  return (
    <section className="metrics" aria-label="Metrics">
      <div className="tiles">
        <div className="tile" title="Peak requests per second">
          <small>👥 Traffic</small>
          <b>{num(m.demand)}<em>req/s</em></b>
          <Spark pts={pts} k="demand" max={maxDemand * 1.1} />
        </div>
        <div className={`tile tone-${m.latency >= BAL.latencyOk ? 'over' : m.latency >= 300 ? 'hot' : 'ok'}`} title={`Latency at peak. Recovery needs < ${BAL.latencyOk} ms.`}>
          <small>⏱ Latency</small>
          <b>{ms(m.latency)}</b>
          <Spark pts={pts} k="latency" max={1500} line={BAL.latencyOk} />
        </div>
        <div className={`tile tone-${m.errRate >= BAL.errOk ? 'over' : 'ok'}`} title={`Failed ÷ admitted requests. Recovery needs < ${BAL.errOk * 100}%.`}>
          <small>❌ Errors</small>
          <b>{(m.errRate * 100).toFixed(m.errRate > 0 && m.errRate < 0.1 ? 1 : 0)}%</b>
          <Spark pts={pts} k="errRate" max={1} line={BAL.errOk} />
        </div>
      </div>
      <div className="gauges">
        <Gauge u={m.appUtil} label="🖥️ App servers" sub={`${num(m.appLoad)} / ${num(m.appCap)} req/s`} />
        <Gauge u={m.dbUtil} label="🗄️ Database" sub={`${num(m.dbOps)} / ${num(m.dbCap)} ops/s`} />
      </div>
      {s.cache.on && (
        <div className="utils">
          <Util label="⚡ Cache hit" u={m.cacheHit} detail="share of reads served from memory" good />
        </div>
      )}
      <ul className="alerts" aria-live="polite">
        {s.alerts.length === 0 && <li className="calm">✓ No alerts</li>}
        {s.alerts.map((a, i) => (
          <li key={i} className={a.level}>
            {a.level === 'crit' ? '●' : '▲'} {a.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Util({ label, u, detail, good }: { label: string; u: number; detail: string; good?: boolean }) {
  const tone = good ? 'ok' : utilTone(u);
  return (
    <div className={`util tone-${tone}`} title={detail}>
      <span>{label}</span>
      <i>
        <i style={{ width: `${Math.min(1, u) * 100}%` }} />
        {!good && <i className="mark" />}
      </i>
      <b>{pct(u)}</b>
    </div>
  );
}

export function IncidentBar({ s, onHint }: { s: GameState; onHint: () => void }) {
  if (s.mode !== 'live') return null;
  const inc = s.incident;
  const m = s.metrics;
  const title = inc ? (inc.variant === 'db' ? 'Database overload' : inc.variant === 'app' ? 'App server overload' : 'Instance failure') : m.overloaded ? `${m.bottleneck === 'db' ? 'Database' : 'App servers'} overloaded` : 'Watching the system';
  const blocking = m.downShare > 0 ? 'traffic hits a dead instance' : m.errRate >= BAL.errOk ? `errors ${(m.errRate * 100).toFixed(1)}% ≥ 1%` : m.latency >= BAL.latencyOk ? `latency ${ms(m.latency)} ≥ 500ms` : null;
  const sub = inc
    ? `Recover: ${s.healthySteps}/${BAL.recoverSteps} healthy steps${blocking ? ` · blocked: ${blocking}` : ''}`
    : m.overloaded
      ? `Incident in ${Math.max(0, BAL.overloadSteps - s.overSteps)} step${BAL.overloadSteps - s.overSteps === 1 ? '' : 's'}`
      : `Stable ${s.healthySteps}/${BAL.recoverSteps}`;
  return (
    <div className={`incident${inc ? ' open' : ''}`} role="status">
      <span className="siren" aria-hidden>
        {inc ? '🚨' : '⚠️'}
      </span>
      <div>
        <b>{title}</b>
        <small>
          LIVE · step {s.step} · {sub}
        </small>
      </div>
      <div className="heal" aria-hidden>
        {Array.from({ length: BAL.recoverSteps }, (_, i) => (
          <i key={i} className={i < s.healthySteps ? 'on' : ''} />
        ))}
      </div>
      <button className={`btn sm hint${inc && inc.hints === 0 && s.step - inc.startStep > 6 ? ' pulse' : ''}`} onClick={onHint}>
        💡 Hint
      </button>
    </div>
  );
}

export function Feed({ s }: { s: GameState }) {
  return (
    <ul className="feed">
      {s.log.slice(0, 6).map((l, i) => (
        <li key={`${l.day}-${i}`} className={l.tone}>
          <span>D{l.day}</span> {l.text}
        </li>
      ))}
    </ul>
  );
}
