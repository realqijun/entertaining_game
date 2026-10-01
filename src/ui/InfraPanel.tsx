import * as A from '../engine/actions';
import { BASE } from '../engine/helpers';
import { computeMods } from '../engine/mods';
import { capacityPerServer } from '../engine/sim';
import type { GameState } from '../engine/types';
import { money, ms, num, pct, utilColor } from './format';
import { Tip } from './Tip';

type Act = <T>(fn: (s: GameState) => T) => T;

interface LayerProps {
  title: string;
  emoji: string;
  kind: A.Infra;
  count: number;
  util: number;
  demand: string;
  capacity: string;
  latency: number;
  costMo: number;
  unitCost: number;
  unitLabel: string;
  auto: boolean;
  act: Act;
  help: string;
  /** Units that would bring utilization to ~65%. */
  ideal: number;
}

function Layer(p: LayerProps) {
  const set = (v: number) => p.act((s) => A.setInfra(s, p.kind, v));
  return (
    <div className="layer">
      <div className="layer-head">
        <span className="layer-title">
          {p.emoji} {p.title}
          <Tip text={p.help} />
        </span>
        <span className="layer-util" style={{ color: utilColor(p.util) }}>{pct(Math.min(p.util, 9.99))}</span>
      </div>
      <div className="bar"><div className="bar-fill" style={{ width: `${Math.min(100, p.util * 100)}%`, background: utilColor(p.util) }} /></div>
      <div className="layer-stats">
        <span title="Peak demand vs. capacity">{p.demand} / {p.capacity}</span>
        <span title="Latency added by this layer">+{ms(p.latency)}</span>
      </div>
      <div className="layer-count">
        <button className="btn sm" disabled={p.auto || p.count <= 1} onClick={() => set(p.count - Math.max(1, Math.round(p.count * 0.1)))} aria-label={`Remove ${p.unitLabel}`}>−</button>
        <span className="count" title={`${p.count} ${p.unitLabel}`}>{num(p.count, 2)}</span>
        <button className="btn sm" disabled={p.auto} onClick={() => set(p.count + Math.max(1, Math.round(p.count * 0.1)))} aria-label={`Add ${p.unitLabel}`}>+</button>
        <button className="btn sm ghost" disabled={p.auto || p.ideal === p.count} onClick={() => set(p.ideal)} title="Right-size: set capacity so this layer runs at about 65% load">
          ⚖️ {num(p.ideal, 2)}
        </button>
      </div>
      <div className="layer-foot">
        <span>{money(p.costMo)}/mo</span>
        <span className="muted">{money(p.unitCost)}/{p.unitLabel}</span>
      </div>
      {p.auto && <div className="auto-badge">🤖 autoscaled</div>}
    </div>
  );
}

export function InfraPanel({ s, act }: { s: GameState; act: Act }) {
  const m = s.metrics;
  const mods = computeMods(s);
  const autoOn = mods.flags.has('autoscale') && s.autoscale;
  const perServer = capacityPerServer(mods);
  const perDb = BASE.dbQps * mods.dbCapacity;
  const fit = (demand: number, per: number) => Math.max(1, Math.ceil(demand / (per * 0.65)));
  const unit = (key: 'servers' | 'bandwidth' | 'db') => {
    const c = m.costs[key];
    const n = key === 'servers' ? s.servers : key === 'bandwidth' ? s.bandwidth : s.dbNodes;
    return n ? (c * 30) / n : 0;
  };
  return (
    <div className="infra">
      <Layer
        title="Bandwidth" emoji="🌐" kind="bandwidth" count={s.bandwidth} util={m.util.bw}
        demand={`${num(m.bwDemand)} Mbps`} capacity={`${num(m.bwCap)}`} latency={m.latParts.bw}
        costMo={m.costs.bandwidth * 30} unitCost={unit('bandwidth')} unitLabel="10 Mbps link" auto={autoOn} act={act}
        ideal={fit(m.bwDemand, BASE.bandwidthMbps)}
        help="Network egress. Demand = requests × payload size. CDNs and compression shrink it."
      />
      <Layer
        title="Compute" emoji="🖥️" kind="servers" count={s.servers} util={m.util.cpu}
        demand={`${num(m.cpuDemand)} cu`} capacity={`${num(m.cpuCap)}`} latency={m.latParts.cpu}
        costMo={m.costs.servers * 30} unitCost={unit('servers')} unitLabel="server" auto={autoOn} act={act}
        ideal={fit(m.cpuDemand, perServer)}
        help={`CPU units (cu) per second. Each server handles ${num(perServer)} cu. Better algorithms cut CPU per request.`}
      />
      <Layer
        title="Database" emoji="🗄️" kind="dbNodes" count={s.dbNodes} util={m.util.db}
        demand={`${num(m.dbDemand)} qps`} capacity={`${num(m.dbCap)}`} latency={m.latParts.db}
        costMo={m.costs.db * 30} unitCost={unit('db')} unitLabel="DB node" auto={false} act={act}
        ideal={fit(m.dbDemand, perDb)}
        help={`Queries per second. Each node handles ${num(perDb)} qps. Caches, indexes and replicas help. Databases never autoscale: scaling state is hard!`}
      />
      {mods.flags.has('autoscale') && (
        <label className="autoscale-toggle">
          <input type="checkbox" checked={s.autoscale} onChange={() => act((st) => A.toggleAutoscale(st))} />
          🤖 Autoscale compute &amp; bandwidth (targets 65% load)
        </label>
      )}
    </div>
  );
}
