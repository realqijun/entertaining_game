import type { ReactNode } from 'react';
import { BAL, BUILD, CACHE, DB_TIERS, INSTANCE_DELAY, SIZES } from '../content/balance';
import * as A from '../engine/actions';
import { cacheHitRate } from '../engine/sim';
import type { Component, GameState, Size } from '../engine/types';
import { CacheArt, Crowd, DbArt, LbArt, ServerBox, moodFor } from './Art';
import { money, num, pct, utilTone } from './format';

export type Run = (name: string, fn: (s: GameState) => A.Result) => void;

interface Props {
  s: GameState;
  comp: Component;
  run: Run;
}

/** When a change lands: overnight in day mode, after N steps during an incident. */
const when = (s: GameState, steps: number) => (s.mode === 'live' ? `${steps} steps` : 'overnight');

function Btn({ s, label, cost, daily, delay, check, onClick, tip, primary }: {
  s: GameState;
  label: string;
  cost?: number;
  daily?: number;
  delay?: number;
  check?: A.Result;
  onClick: () => void;
  tip: string;
  primary?: boolean;
}) {
  const poor = cost !== undefined && cost > s.cash;
  const why = check ?? (poor ? `Needs ${money(cost!)}` : null);
  const meta = [cost ? money(cost) : null, daily ? `${money(daily)}/day` : null, delay !== undefined ? `⏱ ${when(s, delay)}` : null].filter(Boolean).join(' · ');
  return (
    <button className={`act${primary ? ' primary' : ''}`} disabled={!!why} onClick={onClick} title={why ? `${tip}\n\n${why}` : tip}>
      <span className="act-label">{label}</span>
      <span className="act-meta">{why ?? meta}</span>
    </button>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="kv">
      <span>{k}</span>
      <b>{v}</b>
    </div>
  );
}

const Locked = ({ text }: { text: string }) => <p className="locked">🔒 {text}</p>;

export function Inspector({ s, comp, run }: Props) {
  const m = s.metrics;
  const has = (t: Parameters<typeof A.canResearch>[1]) => s.tech.includes(t);

  if (comp === 'users') {
    return (
      <div className="insp">
        <h3 className="insp-head"><Mini kind="users" s={s} />Users</h3>
        <Row k="Demand" v={`${num(m.demand)} req/s`} />
        <Row k="Mix" v={`${pct(m.read)} reads`} />
        {s.workload.cause && <Row k="Today" v={s.workload.cause} />}
        {m.rejected > 0 && <Row k="Rejected" v={<span className="warn">{num(m.rejected)} req/s</span>} />}
        <div className="seg-wrap" title="Traffic limiting: admit only part of demand. Fast relief, but rejected users cost revenue and slow growth.">
          <span className="seg-label">Admit</span>
          <div className="seg">
            {BAL.limits.map((f) => (
              <button key={f} className={s.limit === f ? 'on' : ''} onClick={() => run(f < 1 ? 'limit' : 'unlimit', (st) => A.setLimit(st, f))}>
                {pct(f)}
              </button>
            ))}
          </div>
        </div>
        <div className="acts">
          <Btn
            s={s}
            label="Run promotion"
            cost={BAL.promo.cost}
            check={s.mode === 'live' ? 'Not during an incident' : s.promoDays > 0 ? 'Running' : null}
            onClick={() => run('promotion', A.runPromotion)}
            tip={`Traffic ×${BAL.promo.mult} for ${BAL.promo.days} days and +${BAL.promo.permanent * 100}% users for good. Make sure you have headroom first.`}
          />
        </div>
      </div>
    );
  }

  if (comp === 'lb') {
    const building = s.builds.some((b) => b.kind === 'lb');
    return (
      <div className="insp">
        <h3 className="insp-head"><Mini kind="lb" s={s} />Load balancer</h3>
        <p className="muted small">Splits traffic across app instances. Without health checks it keeps sending traffic to dead ones.</p>
        {s.lb && <Row k="Targets" v={`${s.instances.filter((i) => i.status !== 'booting').length} instances`} />}
        <div className="acts">
          {!s.lb && <Btn s={s} primary label={building ? 'Building…' : 'Add load balancer'} cost={BUILD.lb.setup} daily={BUILD.lb.cost} delay={BUILD.lb.delay} check={building ? 'Building' : null} onClick={() => run('lb', A.buildLb)} tip="Enables horizontal scaling: more instances, traffic split between them." />}
          {has('hc') ? (
            !s.hc && <Btn s={s} label="Health checks" cost={BUILD.hc.setup} daily={BUILD.hc.cost} delay={BUILD.hc.delay} check={s.builds.some((b) => b.kind === 'hc') ? 'Building' : null} onClick={() => run('hc', A.buildHc)} tip="The balancer pings instances and stops routing to dead ones." />
          ) : (
            s.milestone >= 1 && <Locked text="Research Health checks to route around failures" />
          )}
          {s.hc && <Row k="Health checks" v={<span className="good">on</span>} />}
        </div>
      </div>
    );
  }

  if (comp === 'app') {
    const sizes: Size[] = has('scaleUp') ? ['S', 'M', 'L'] : ['S', 'M'];
    const addWhy = A.canAddInstance(s);
    return (
      <div className="insp">
        <h3 className="insp-head"><Mini kind="app" s={s} />App servers</h3>
        <Row k="Load" v={`${num(m.appLoad)} / ${num(m.appCap)} req/s (${pct(m.appUtil)})`} />
        <div className="inst-list">
          {s.instances.map((i) => (
            <div key={i.id} className={`inst-row st-${i.status}`}>
              <span className="mono">#{i.id}</span>
              <span className="inst-st">{i.status === 'up' ? `${SIZES[i.size].label}` : i.status === 'down' ? '✕ down' : `${i.status} ${i.timer}⏱`}</span>
              {i.status === 'down' ? (
                <button className="mini primary" onClick={() => run('restart', (st) => A.restartInstance(st, i.id))} title={`Restart: back in ${INSTANCE_DELAY.restart} steps`}>
                  Restart
                </button>
              ) : (
                <span className="sizes">
                  {sizes.map((z) => (
                    <button key={z} className={`mini${(i.target ?? i.size) === z ? ' on' : ''}`} disabled={(i.target ?? i.size) === z || i.status !== 'up'} onClick={() => run('resize', (st) => A.resizeInstance(st, i.id, z))} title={`${SIZES[z].label}: ${num(SIZES[z].cap)} req/s, ${money(SIZES[z].cost)}/day. Resizing restarts the instance (${INSTANCE_DELAY.resize} steps).`}>
                      {z}
                    </button>
                  ))}
                </span>
              )}
              {s.instances.length > 1 && (
                <button className="mini ghost" onClick={() => run('remove', (st) => A.removeInstance(st, i.id))} title="Remove this instance">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {!has('scaleUp') && <Locked text="Research Scale up for Large servers" />}
        <div className="acts">
          {s.lb ? (
            <Btn s={s} label="Add instance (M)" daily={SIZES.M.cost} delay={INSTANCE_DELAY.boot} check={addWhy} onClick={() => run('add_instance', (st) => A.addInstance(st, 'M'))} tip="Scale out: another 1,000 req/s behind the load balancer. It must boot first." />
          ) : (
            s.milestone >= 1 && <Locked text={has('lb') ? 'Add the load balancer to scale out' : 'Research Scale out to add instances'} />
          )}
          {has('spare') && !s.standby && <Btn s={s} label="Add spare instance" daily={SIZES.M.cost} delay={INSTANCE_DELAY.boot} onClick={() => run('standby', A.addStandby)} tip="A warm standby that does not serve traffic until promoted." />}
          {s.standby && <Btn s={s} label="Promote spare" delay={INSTANCE_DELAY.promote} check={s.standby.status !== 'up' ? 'Booting' : null} onClick={() => run('promote', A.promoteStandby)} tip="Move the spare into service." />}
          {has('autoscale') && !s.autoscale && <Btn s={s} label="Turn on autoscaling" cost={BUILD.autoscale.setup} delay={BUILD.autoscale.delay} check={!s.lb ? 'Needs load balancer' : s.builds.some((b) => b.kind === 'autoscale') ? 'Building' : null} onClick={() => run('autoscale', A.buildAutoscale)} tip="Adds instances above 85% load (after a boot delay) and removes idle ones overnight. Cannot fix a database bottleneck." />}
          {s.autoscale && <Row k="Autoscaling" v={<span className="good">on</span>} />}
        </div>
      </div>
    );
  }

  if (comp === 'cache') {
    const building = s.builds.find((b) => b.kind === 'cache' || b.kind === 'cacheTune');
    return (
      <div className="insp">
        <h3 className="insp-head"><Mini kind="cache" s={s} />Read cache</h3>
        <p className="muted small">Answers repeated reads from memory. Starts cold, warms over a few steps, and never helps writes.</p>
        {s.cache.on && (
          <>
            <Row k="Hit rate" v={`${pct(cacheHitRate(s))} of reads${s.cache.warm < 1 ? ' (warming)' : ''}`} />
            <Row k="Cacheable today" v={pct(s.workload.cacheable)} />
          </>
        )}
        <div className="acts">
          {!s.cache.on && <Btn s={s} primary label={building ? 'Building…' : 'Add read cache'} cost={CACHE.setup} daily={CACHE.cost} delay={BUILD.cache.delay} check={building ? 'Building' : null} onClick={() => run('cache', A.buildCache)} tip="60% of cacheable reads skip the database once warm." />}
          {s.cache.on && !s.cache.tuned && (has('cacheTune') ? <Btn s={s} label="Tune cache" cost={CACHE.tuneSetup} daily={CACHE.tuneCost} delay={BUILD.cacheTune.delay} check={building ? 'Building' : null} onClick={() => run('cache_tune', A.tuneCache)} tip="Hit rate 60% → 80%." /> : s.milestone >= 1 && <Locked text="Research Cache tuning for an 80% hit rate" />)}
        </div>
      </div>
    );
  }

  const next = s.dbTier + 1 + s.builds.filter((b) => b.kind === 'db').length;
  const why = A.canUpgradeDb(s);
  return (
    <div className="insp">
      <h3 className="insp-head"><Mini kind="db" s={s} />Database</h3>
      <Row k="Load" v={`${num(m.dbOps)} / ${num(m.dbCap)} ops/s (${pct(m.dbUtil)})`} />
      <Row k="Per request" v={`${(m.dbOps / Math.max(1, Math.min(m.appLoad, m.appCap))).toFixed(2)} ops`} />
      <p className="muted small">Every uncached read and every write reaches the database. Adding app servers does not raise its capacity.</p>
      <div className="acts">
        {next < DB_TIERS.length && (
          <Btn s={s} primary label={`Upgrade to ${num(DB_TIERS[next].cap)} ops/s`} cost={DB_TIERS[next].upgrade} daily={DB_TIERS[next].cost} delay={BUILD.db.delay} check={why} onClick={() => run('db_upgrade', A.upgradeDb)} tip="More headroom for every query, at a higher daily cost." />
        )}
      </div>
    </div>
  );
}

/** The component's character, drawn small next to the inspector title. */
function Mini({ kind, s }: { kind: Component; s: GameState }) {
  const m = s.metrics;
  const tone = kind === 'db' ? utilTone(m.dbUtil) : kind === 'app' ? (m.downShare > 0 ? 'over' : utilTone(m.appUtil)) : 'ok';
  return (
    <svg viewBox="-40 -40 80 80" className={`insp-mini tone-${tone}`} aria-hidden>
      {kind === 'users' && <Crowd demand={m.demand} limited={s.limit < 1} spike={false} />}
      {kind === 'lb' && <LbArt on={s.lb} hc={s.hc} mood={m.downShare > 0 ? 'panic' : 'happy'} />}
      {kind === 'cache' && <CacheArt on={s.cache.on} warm={s.cache.warm} mood="happy" />}
      {kind === 'db' && <DbArt util={m.dbUtil} mood={moodFor(m.dbUtil)} upgrading={false} />}
      {kind === 'app' && (
        <g transform="translate(-34,-14)">
          <ServerBox w={68} h={28} status={m.downShare > 0 ? 'down' : 'up'} util={m.appUtil} size="M" label="" />
        </g>
      )}
    </svg>
  );
}
