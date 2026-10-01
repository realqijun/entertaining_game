import { getProduct } from '../content/products';
import type { GameState } from '../engine/types';
import { ms, num, pct, satColor, uptime } from './format';
import { Tip } from './Tip';

export function SatPanel({ s }: { s: GameState }) {
  const m = s.metrics;
  const w = getProduct(s.productId).weights;
  const rows: { key: keyof typeof m.satParts; label: string; detail: string; help: string }[] = [
    { key: 'latency', label: '⏱️ Speed', detail: ms(m.latency), help: 'Total latency is the sum of each layer: service time ÷ (1 − load), plus network distance. Overloaded layers explode latency.' },
    { key: 'reliability', label: '🛡️ Reliability', detail: `${pct(m.errorRate, 1)} errors`, help: 'Errors come from dropped requests (load over 100%), outages and bugs. Uptime is shown over the last 30 days.' },
    { key: 'features', label: '✨ Features', detail: `${s.featureLevel} / ${m.expectedFeatures.toFixed(1)} expected`, help: 'Users expect a steady stream of new features. Your Product team ships them.' },
    { key: 'bugs', label: '🐛 Bugs', detail: `${Math.round(s.bugs)} open`, help: 'Bugs come from tech debt and new features. Your SRE team fixes them.' },
    { key: 'price', label: '🏷️ Price', detail: pct(s.monetization), help: 'Higher prices earn more per user but annoy them and slow growth.' },
  ];
  return (
    <div className="panel sat-panel">
      <div className="panel-title">
        User happiness <b style={{ color: satColor(s.sat) }}>{Math.round(s.sat)}</b>
        <span className="muted"> → {Math.round(m.satTarget)}</span>
        <Tip text="Happiness drifts toward its target, a weighted mix of the factors below. The weights depend on your product. Above 40, users grow. Below 40, they churn." />
        <span className="uptime" title="30-day uptime">⬆ {uptime(m.uptime30)} uptime</span>
      </div>
      {rows.map((r) => (
        <div className="sat-row" key={r.key} title={r.help}>
          <span className="sat-label">{r.label} <span className="weight">×{(w[r.key] * 100).toFixed(0)}%</span></span>
          <div className="bar"><div className="bar-fill" style={{ width: `${m.satParts[r.key]}%`, background: satColor(m.satParts[r.key]) }} /></div>
          <span className="sat-detail">{r.detail}</span>
        </div>
      ))}
      <div className="sat-foot muted">
        Addressable market: {num(m.tam)} users · {pct(s.users / m.tam, 1)} captured
      </div>
    </div>
  );
}
