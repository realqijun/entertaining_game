/**
 * Illustrated SVG pieces for the architecture canvas. Every component is a little character
 * whose face reacts to load, so a first-time player can read the system state at a glance.
 */

export type Mood = 'happy' | 'ok' | 'sweat' | 'panic' | 'dead' | 'sleep';

export function moodFor(util: number, opts: { down?: boolean; pending?: boolean } = {}): Mood {
  if (opts.down) return 'dead';
  if (opts.pending) return 'sleep';
  if (util >= 1) return 'panic';
  if (util >= 0.85) return 'sweat';
  if (util >= 0.6) return 'ok';
  return 'happy';
}

/** A face centred on (cx, cy). r is the face radius it is drawn for. */
export function Face({ cx, cy, r = 10, mood }: { cx: number; cy: number; r?: number; mood: Mood }) {
  const e = r * 0.38; // eye spread
  const ey = cy - r * 0.15;
  const k = r / 10;
  const eye = (x: number) => {
    if (mood === 'dead') return <path key={x} d={`M${x - 2.2 * k},${ey - 2.2 * k}l${4.4 * k},${4.4 * k}M${x + 2.2 * k},${ey - 2.2 * k}l${-4.4 * k},${4.4 * k}`} className="face-line" />;
    if (mood === 'sleep') return <path key={x} d={`M${x - 2.4 * k},${ey}q${2.4 * k},${2 * k} ${4.8 * k},0`} className="face-line" />;
    if (mood === 'happy') return <path key={x} d={`M${x - 2.4 * k},${ey + 1 * k}q${2.4 * k},${-3.4 * k} ${4.8 * k},0`} className="face-line" />;
    return <circle key={x} cx={x} cy={ey} r={(mood === 'panic' ? 2.2 : 1.7) * k} className="face-fill" />;
  };
  const my = cy + r * 0.38;
  const mouth = {
    happy: <path d={`M${cx - 3.6 * k},${my - 1 * k}q${3.6 * k},${4.2 * k} ${7.2 * k},0`} className="face-line" />,
    ok: <path d={`M${cx - 3 * k},${my}q${3 * k},${2 * k} ${6 * k},0`} className="face-line" />,
    sweat: <path d={`M${cx - 3 * k},${my + 1 * k}h${6 * k}`} className="face-line" />,
    panic: <ellipse cx={cx} cy={my + 0.6 * k} rx={2.4 * k} ry={3 * k} className="face-fill" />,
    dead: <path d={`M${cx - 3.4 * k},${my + 1.6 * k}q${3.4 * k},${-3 * k} ${6.8 * k},0`} className="face-line" />,
    sleep: <circle cx={cx} cy={my + 0.6 * k} r={1.3 * k} className="face-fill" />,
  }[mood];
  return (
    <g className={`face mood-${mood}`}>
      {eye(cx - e)}
      {eye(cx + e)}
      {mouth}
      {(mood === 'sweat' || mood === 'panic') && <path d={`M${cx + r * 0.95},${cy - r * 0.55}q${-2.4 * k},${3.4 * k} 0,${5 * k}q${2.4 * k},${-1.6 * k} 0,${-5 * k}z`} className="sweat" />}
      {mood === 'sleep' && (
        <text x={cx + r * 0.8} y={cy - r * 0.7} className="zzz" fontSize={7 * k}>
          z
        </text>
      )}
    </g>
  );
}

/** A crowd of little people holding phones. More people appear as traffic grows. */
export function Crowd({ demand, limited, spike }: { demand: number; limited: boolean; spike: boolean }) {
  const n = Math.max(3, Math.min(7, Math.round(Math.log10(Math.max(demand, 10)) * 2)));
  const spots = [
    [0, 4], [-15, 6], [15, 6], [-8, -8], [8, -8], [-22, -6], [22, -6],
  ].slice(0, n);
  const colors = ['#38bdf8', '#f472b6', '#a3e635', '#fbbf24', '#818cf8', '#2dd4bf', '#fb7185'];
  return (
    <g className="crowd" transform="scale(1.35)">
      {spike && <path d="M20,-26 l6,-10 l6,10 h-3 v8 h-6 v-8z" className="spike-arrow" />}
      {spots
        .map((p, i) => ({ p, i }))
        .sort((a, b) => a.p[1] - b.p[1])
        .map(({ p: [x, y], i }) => (
          <g key={i} transform={`translate(${x},${y})`}>
            <g className="person" style={{ animationDelay: `${i * 0.23}s` }}>
              <path d="M-7,14 q0,-11 7,-11 q7,0 7,11z" fill={colors[i]} />
              <circle cx={0} cy={-5} r={5.2} className="skin" />
              <rect x={2.5} y={1} width={4} height={6.5} rx={1} className="phone" />
            </g>
          </g>
        ))}
      {limited && (
        <g className="gate">
          <rect x={-28} y={18} width={56} height={6} rx={3} />
          <path d="M-20,18v-8M0,18v-8M20,18v-8" />
        </g>
      )}
    </g>
  );
}

/** One app instance: a little server box with blinking LEDs. Size S/M/L changes its width. */
export function ServerBox({ w, h, status, util, size, label }: { w: number; h: number; status: string; util: number; size: string; label: string }) {
  const down = status === 'down';
  const pending = status !== 'up' && !down;
  const leds = Math.max(2, Math.min(5, Math.floor((w - 44) / 12)));
  const speed = down ? 0 : Math.max(0.25, 1.4 - util);
  const r = Math.min(h / 2 - 2, 7);
  return (
    <g className={`srv st-${status}`}>
      <rect width={w} height={h} rx={6} className="srv-body" />
      <rect x={3} y={3} width={4} height={h - 6} rx={2} className="srv-stripe" />
      <circle cx={10 + r + 2} cy={h / 2} r={r + 1.5} className="srv-face-bg" />
      <Face cx={10 + r + 2} cy={h / 2} r={r} mood={moodFor(util, { down, pending })} />
      <text x={10 + 2 * r + 9} y={h / 2 + 3.5} className="srv-label">
        {label}
      </text>
      <g transform={`translate(${w - 8 - leds * 7},${h / 2 - 2})`}>
        {Array.from({ length: leds }, (_, i) => (
          <rect key={i} x={i * 7} width={4} height={4} rx={1} className="led" style={speed ? { animationDuration: `${speed + (i % 3) * 0.17}s` } : undefined} />
        ))}
      </g>
      {down && (
        <g className="smoke">
          <circle cx={w - 18} cy={-2} r={4} />
          <circle cx={w - 12} cy={-7} r={5} />
          <circle cx={w - 20} cy={-11} r={3.5} />
        </g>
      )}
      <title>{`${size} instance · ${status}`}</title>
    </g>
  );
}

/** Database: a stack of disks whose liquid level shows how busy it is. */
export function DbArt({ util, mood, upgrading }: { util: number; mood: Mood; upgrading: boolean }) {
  const fill = Math.min(1, util);
  const top = -20;
  const bot = 22;
  const level = bot - fill * (bot - top);
  return (
    <g className="db-art">
      <defs>
        <clipPath id="db-clip">
          <path d={`M-26,${top} v${bot - top} a26,8 0 0 0 52,0 v${top - bot}z`} />
        </clipPath>
      </defs>
      <path d={`M-26,${top} v${bot - top} a26,8 0 0 0 52,0 v${top - bot}`} className="db-body" />
      <g clipPath="url(#db-clip)">
        <rect x={-27} y={level} width={54} height={bot - level + 10} className="db-liquid" />
        <path d={`M-27,${level} q6.75,-3 13.5,0 t13.5,0 t13.5,0 t13.5,0`} className="db-wave" />
      </g>
      <path d={`M-26,${(top + bot) / 2 - 2} a26,8 0 0 0 52,0`} className="db-ring" />
      <ellipse cx={0} cy={top} rx={26} ry={8} className="db-top" />
      <rect x={-13} y={-6} width={26} height={21} rx={10} className="face-plate" />
      <Face cx={0} cy={4} r={9} mood={mood} />
      {upgrading && <path d="M30,-10 l7,-9 l7,9 h-4 v8 h-6 v-8z" className="up-arrow" />}
    </g>
  );
}

/** Read cache: a glowing memory chip with a lightning bolt. */
export function CacheArt({ on, warm, mood }: { on: boolean; warm: number; mood: Mood }) {
  return (
    <g className={`cache-art${on ? '' : ' off'}`}>
      {[-14, -5, 4, 13].map((x) => (
        <g key={x}>
          <rect x={x - 1.5} y={-26} width={3} height={6} rx={1} className="pin" />
          <rect x={x - 1.5} y={20} width={3} height={6} rx={1} className="pin" />
        </g>
      ))}
      <rect x={-24} y={-21} width={48} height={42} rx={8} className="chip" />
      <path d="M3,-17 l-11,15 h8 l-3,13 l11,-16 h-8z" className="bolt" style={{ opacity: on ? 0.25 + warm * 0.75 : 0.35 }} />
      {on && <Face cx={0} cy={3} r={8} mood={mood} />}
      {on && warm < 1 && (
        <g className="frost">
          <path d="M-20,-14l5,5M-20,-9l5,-5M17,12l5,5M17,17l5,-5" />
        </g>
      )}
    </g>
  );
}

/** Load balancer: a junction that splits one stream into many. */
export function LbArt({ on, mood, hc }: { on: boolean; mood: Mood; hc: boolean }) {
  return (
    <g className={`lb-art${on ? '' : ' off'}`}>
      <circle r={22} className="lb-disc" />
      <path d="M-14,0 h10 M-4,0 l14,-10 M-4,0 h14 M-4,0 l14,10" className="lb-arrows" />
      <path d="M8,-13 l4,3 l-5,1z M10,0 l4,0 l-3,3z M8,13 l4,-3 l-5,-1z" className="lb-heads" />
      {on && (
        <g transform="translate(0,-31)">
          <circle r={8.5} className="face-plate" />
          <Face cx={0} cy={0} r={7.5} mood={mood} />
        </g>
      )}
      {on && hc && (
        <g transform="translate(17,-17)" className="hc-badge">
          <circle r={7} />
          <path d="M-3.5,0 l2.4,2.6 l4.6,-5" />
        </g>
      )}
    </g>
  );
}

/** Small static scenes for the onboarding cards. */
export function CoachArt({ step }: { step: number }) {
  return (
    <svg viewBox="0 0 320 110" className="coach-art" aria-hidden>
      {step === 0 && (
        <g>
          <path d="M70,58 H130 M210,58 H250" className="coach-wire" />
          {[0, 1, 2].map((i) => (
            <circle key={i} r={3} className="pkt">
              <animateMotion dur="2.4s" begin={`${-i * 0.8}s`} repeatCount="indefinite" path="M70,58 H250" />
            </circle>
          ))}
          <g transform="translate(42,58) scale(1.15)">
            <Crowd demand={300} limited={false} spike={false} />
          </g>
          <g transform="translate(128,44)" className="tone-ok">
            <ServerBox w={84} h={28} status="up" util={0.3} size="M" label="app" />
          </g>
          <g transform="translate(278,58) scale(0.95)" className="tone-ok">
            <DbArt util={0.4} mood="happy" upgrading={false} />
          </g>
        </g>
      )}
      {step === 1 && (
        <g>
          {([['happy', 'calm', 'ok', 0.3], ['ok', 'busy', 'busy', 0.7], ['sweat', 'hot', 'hot', 0.9], ['panic', 'overloaded', 'over', 1.2]] as const).map(([mood, label, tone, u], i) => (
            <g key={mood} transform={`translate(${45 + i * 77},46)`} className={`tone-${tone}`}>
              <circle r={22} className="coach-face-bg" />
              <Face cx={0} cy={0} r={15} mood={mood} />
              <text y={42} textAnchor="middle" className="coach-label">
                {label}
              </text>
              <rect x={-20} y={50} width={40} height={5} rx={2.5} className="coach-bar-bed" />
              <rect x={-20} y={50} width={Math.min(1, u) * 40} height={5} rx={2.5} className="coach-bar" />
            </g>
          ))}
        </g>
      )}
      {step === 2 && (
        <g>
          <g transform="translate(70,40)" className="tone-hot">
            <ServerBox w={110} h={32} status="up" util={0.9} size="M" label="size M" />
          </g>
          <path d="M150,66 l0,22 l6,-6 l5,10 l4,-2 l-5,-10 l8,0z" className="cursor" />
          <g transform="translate(205,30)">
            <rect width={92} height={30} rx={8} className="coach-btn" />
            <text x={46} y={19} textAnchor="middle" className="coach-btn-text">
              ⬆ Upgrade
            </text>
            <text x={46} y={48} textAnchor="middle" className="coach-label">
              costs cash · ready tomorrow
            </text>
          </g>
        </g>
      )}
      {step === 3 && (
        <g>
          <g transform="translate(40,44)" className="tone-over">
            <ServerBox w={100} h={30} status="down" util={1} size="M" label="crashed" />
          </g>
          <text x={160} y={66} className="coach-siren">
            🚨
          </text>
          <g transform="translate(200,46)">
            {[0, 1, 2, 3, 4].map((i) => (
              <rect key={i} x={i * 18} width={14} height={10} rx={3} className={i < 3 ? 'coach-pip on' : 'coach-pip'} />
            ))}
            <text x={42} y={30} textAnchor="middle" className="coach-label">
              5 healthy steps = fixed
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

/** Semicircle gauge with a needle; the red zone starts at 85%. */
export function Gauge({ u, label, sub }: { u: number; label: string; sub: string }) {
  const clamped = Math.min(1.2, Math.max(0, u));
  const ang = -90 + (clamped / 1.2) * 180;
  const arc = (from: number, to: number) => {
    const a0 = ((-180 + (from / 1.2) * 180) * Math.PI) / 180;
    const a1 = ((-180 + (to / 1.2) * 180) * Math.PI) / 180;
    return `M${50 + 38 * Math.cos(a0)},${50 + 38 * Math.sin(a0)} A38,38 0 0 1 ${50 + 38 * Math.cos(a1)},${50 + 38 * Math.sin(a1)}`;
  };
  return (
    <div className="gauge" title={sub}>
      <svg viewBox="0 0 100 60">
        <path d={arc(0, 0.7)} className="g-ok" />
        <path d={arc(0.7, 0.85)} className="g-busy" />
        <path d={arc(0.85, 1)} className="g-hot" />
        <path d={arc(1, 1.2)} className="g-over" />
        <g transform={`rotate(${ang} 50 50)`} className="needle">
          <path d="M50,50 L50,18" />
          <circle cx={50} cy={50} r={4} />
        </g>
      </svg>
      <b className={`tone-${u >= 1 ? 'over' : u >= 0.85 ? 'hot' : u >= 0.7 ? 'busy' : 'ok'}`}>{Math.round(u * 100)}%</b>
      <span>{label}</span>
    </div>
  );
}
