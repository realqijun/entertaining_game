import { useMemo, useState } from 'react';
import { clearEvents, events, fromJsonl, isFacilitated, newParticipant, playerId, setFacilitated, toJsonl, track, type Ev } from '../analytics';
import { buildReport, OBS_KINDS, OBSERVATION, TARGETS } from '../report';

/**
 * Facilitator dashboard (#/stats). Tracks the primary targets for the facilitated cohort,
 * the secondary organic-interest targets, and the observation thresholds for week 2.
 * Import exports from other laptops (or the analytics endpoint) to see the whole cohort.
 */
export function Stats({ onBack }: { onBack: () => void }) {
  const [imported, setImported] = useState<Ev[]>([]);
  const [fac, setFac] = useState(isFacilitated());
  const [tick, setTick] = useState(0);
  const local = useMemo(() => events(), [tick]);
  const all = useMemo(() => {
    const seen = new Set<string>();
    return [...local, ...imported].filter((e) => {
      const k = `${e.pid}|${e.t}|${e.name}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [local, imported]);
  const r = useMemo(() => buildReport(all), [all]);
  const pid = playerId();
  const mine = local.filter((e) => e.pid === pid && e.name === 'obs');

  const ratio = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)}%`);
  const status = (ok: boolean | null) => (ok === null ? 'pending' : ok ? 'pass' : 'fail');

  const download = () => {
    const blob = new Blob([toJsonl(local)], { type: 'application/x-ndjson' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sdt-events-${new Date().toISOString().slice(0, 10)}-${pid}.jsonl`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const fp = r.facilitated;
  const obsCount = (id: string) => (id === 'ask' ? fp.asked : id === 'resolved' ? fp.completed : id === 'explained' ? fp.explained : fp.replayed);

  return (
    <div className="stats">
      <header className="land-top">
        <button className="brand" onClick={onBack}>
          99.99<span>%</span>
        </button>
        <span className="muted small">Facilitator dashboard</span>
      </header>

      <section className="card">
        <h2>This session</h2>
        <div className="row wrap">
          <label className="toggle">
            <input
              type="checkbox"
              checked={fac}
              onChange={(e) => {
                setFacilitated(e.target.checked);
                setFac(e.target.checked);
                setTick(tick + 1);
              }}
            />
            Facilitator present (this tab)
          </label>
          <button
            className="btn sm"
            onClick={() => {
              if (!confirm('Start a new participant? The current save on this device is cleared.')) return;
              newParticipant();
              setTick(tick + 1);
            }}
          >
            New participant
          </button>
          <span className="muted small mono">player {pid}</span>
        </div>
        <p className="muted small">
          Tip: open <code>/?fac=1#/play</code> in the tester&apos;s tab so their events count as facilitated. Organic beta players arrive without it.
        </p>
        <h4>Observation tally (this participant)</h4>
        <div className="row wrap">
          {OBS_KINDS.map((k) => (
            <button
              key={k.id}
              className="btn sm"
              onClick={() => {
                track('obs', { kind: k.id });
                setTick(tick + 1);
              }}
            >
              {k.label} <span className="pill">{mine.filter((e) => e.p?.kind === k.id).length}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Week-2 observation thresholds</h2>
        <p className="muted small">Go / no-go signals for the current design, from {fp.players} facilitated participant{fp.players === 1 ? '' : 's'}.</p>
        <table>
          <tbody>
            {OBSERVATION.map((o) => {
              const n = obsCount(o.id);
              return (
                <tr key={o.id} className={status(fp.players ? n >= o.min : null)}>
                  <td>{o.label}</td>
                  <td className="mono">
                    {n} / {fp.players}
                  </td>
                  <td className="mono">≥ {o.min}</td>
                </tr>
              );
            })}
            <tr className={status(fp.enjoyment === null ? null : fp.enjoyment >= 4)}>
              <td>Median enjoyment</td>
              <td className="mono">{fp.enjoyment ?? '–'}</td>
              <td className="mono">≥ 4</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Primary targets · facilitated cohort</h2>
        <table>
          <tbody>
            <tr className={status(fp.completion === null ? null : fp.completion >= TARGETS.primary.completion.goal)}>
              <td>{TARGETS.primary.completion.label}</td>
              <td className="mono">
                {fp.completed}/{fp.players} ({ratio(fp.completion)})
              </td>
              <td className="mono">≥ {TARGETS.primary.completion.goal * 100}%</td>
            </tr>
            <tr className={status(fp.enjoyment === null ? null : fp.enjoyment >= TARGETS.primary.enjoyment.goal)}>
              <td>{TARGETS.primary.enjoyment.label}</td>
              <td className="mono">
                {fp.enjoyment ?? '–'} <span className="muted">[{fp.enjoyDist.join(' ')}]</span>
              </td>
              <td className="mono">≥ {TARGETS.primary.enjoyment.goal}</td>
            </tr>
            <tr className={status(fp.replay === null ? null : fp.replay >= TARGETS.primary.replay.goal)}>
              <td>{TARGETS.primary.replay.label}</td>
              <td className="mono">
                {fp.replayed}/{fp.players} ({ratio(fp.replay)})
              </td>
              <td className="mono">≥ {TARGETS.primary.replay.goal * 100}%</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Secondary targets · organic interest</h2>
        <table>
          <tbody>
            <tr className={status(r.landing.byDeadline >= TARGETS.secondary.signups.goal ? true : null)}>
              <td>
                {TARGETS.secondary.signups.label} <span className="muted small">({TARGETS.secondary.signups.by})</span>
              </td>
              <td className="mono">
                {r.landing.byDeadline} <span className="muted">· {r.landing.visitors} visitors, {ratio(r.landing.conversion)}</span>
              </td>
              <td className="mono">≥ {TARGETS.secondary.signups.goal}</td>
            </tr>
            <tr className={status(r.organic.byDeadline >= TARGETS.secondary.unprompted.goal ? true : null)}>
              <td>
                {TARGETS.secondary.unprompted.label} <span className="muted small">({TARGETS.secondary.unprompted.by})</span>
              </td>
              <td className="mono">{r.organic.byDeadline}</td>
              <td className="mono">≥ {TARGETS.secondary.unprompted.goal}</td>
            </tr>
            <tr className={status(r.organic.secondRunShare === null ? null : r.organic.secondRunShare >= TARGETS.secondary.secondRun.goal)}>
              <td>{TARGETS.secondary.secondRun.label}</td>
              <td className="mono">
                {r.organic.secondRun}/{r.organic.unprompted} ({ratio(r.organic.secondRunShare)})
              </td>
              <td className="mono">≥ {TARGETS.secondary.secondRun.goal * 100}%</td>
            </tr>
          </tbody>
        </table>
        {Object.keys(r.organic.sources).length > 0 && (
          <p className="muted small">
            Sources:{' '}
            {Object.entries(r.organic.sources)
              .map(([k, v]) => `${k} ${v}`)
              .join(' · ')}
          </p>
        )}
      </section>

      <section className="card">
        <h2>Data</h2>
        <p className="muted small">
          {local.length} events on this device{imported.length ? `, ${imported.length} imported` : ''}. Import .jsonl exports from other laptops or your analytics endpoint to see the full cohort.
        </p>
        <div className="row wrap">
          <button className="btn sm" onClick={download}>
            Export .jsonl
          </button>
          <label className="btn sm">
            Import…
            <input
              type="file"
              accept=".jsonl,.json,.txt"
              multiple
              hidden
              onChange={async (e) => {
                const files = [...(e.target.files ?? [])];
                const evs: Ev[] = [];
                for (const f of files) {
                  try {
                    evs.push(...fromJsonl(await f.text()));
                  } catch {
                    alert(`Could not read ${f.name}`);
                  }
                }
                setImported((x) => [...x, ...evs]);
              }}
            />
          </label>
          <button
            className="btn sm ghost"
            onClick={() => {
              if (!confirm('Delete all events stored on this device?')) return;
              clearEvents();
              setTick(tick + 1);
            }}
          >
            Clear local events
          </button>
        </div>
      </section>
    </div>
  );
}
