import type { ReactNode } from 'react';

/** Hand-built SVG icon set: chunky neon glyphs with gradient fills that match the 3D scene. */
type P = { size?: number; className?: string };

function Svg({ size = 22, className, children, grad }: P & { children: ReactNode; grad: [string, string] }) {
  const id = `g${grad[0].slice(1)}${grad[1].slice(1)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`icon ${className ?? ''}`} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={grad[0]} />
          <stop offset="1" stopColor={grad[1]} />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`} stroke={`url(#${id})`} strokeLinecap="round" strokeLinejoin="round">{children}</g>
    </svg>
  );
}

export const Coin = (p: P) => (
  <Svg {...p} grad={['#fde047', '#f59e0b']}>
    <ellipse cx="12" cy="17" rx="8" ry="3.2" strokeWidth="0" />
    <ellipse cx="12" cy="12.5" rx="8" ry="3.2" strokeWidth="0" opacity="0.85" />
    <ellipse cx="12" cy="8" rx="8" ry="3.2" strokeWidth="0" />
    <path d="M12 6.6v2.8M10.6 8h2.8" stroke="#7c2d12" strokeWidth="1.4" fill="none" />
  </Svg>
);

export const Users = (p: P) => (
  <Svg {...p} grad={['#67e8f9', '#3b82f6']}>
    <circle cx="9" cy="8" r="3.6" strokeWidth="0" />
    <path d="M2.5 20c0-4 3-6.4 6.5-6.4S15.5 16 15.5 20z" strokeWidth="0" />
    <circle cx="17" cy="9" r="2.8" strokeWidth="0" opacity="0.7" />
    <path d="M14.5 14.2c3.5-.7 7 1.2 7 5.8h-4.6" strokeWidth="0" opacity="0.7" />
  </Svg>
);

export const Face = ({ mood, ...p }: P & { mood: number }) => {
  const grad: [string, string] = mood >= 70 ? ['#86efac', '#16a34a'] : mood >= 45 ? ['#fde68a', '#f59e0b'] : ['#fca5a5', '#dc2626'];
  const mouth = mood >= 70 ? 'M8 14c1.2 2 6.8 2 8 0' : mood >= 45 ? 'M8.5 15h7' : 'M8 16.5c1.2-2 6.8-2 8 0';
  return (
    <Svg {...p} grad={grad}>
      <circle cx="12" cy="12" r="9.5" strokeWidth="0" />
      <circle cx="9" cy="10" r="1.3" fill="#0b0f1a" stroke="none" />
      <circle cx="15" cy="10" r="1.3" fill="#0b0f1a" stroke="none" />
      <path d={mouth} stroke="#0b0f1a" strokeWidth="1.8" fill="none" />
    </Svg>
  );
};

export const Rocket = (p: P) => (
  <Svg {...p} grad={['#f0abfc', '#8b5cf6']}>
    <path d="M14 3c4 0 7 3 7 7l-7 7-4-4z" strokeWidth="0" />
    <circle cx="15.5" cy="8.5" r="1.8" fill="#0b0f1a" stroke="none" />
    <path d="M10 13l-4 1-3 3 5 1zM11 14l-1 4-3 3-1-5z" strokeWidth="0" opacity="0.75" />
    <path d="M6 18l-2.5 2.5" strokeWidth="2" fill="none" stroke="#fb923c" />
  </Svg>
);

export const Flask = (p: P) => (
  <Svg {...p} grad={['#c4b5fd', '#7c3aed']}>
    <path d="M9 3h6M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3" strokeWidth="2" fill="none" />
    <path d="M7.2 15h9.6l2 3.5a1.6 1.6 0 0 1-1.4 2.3H6.6a1.6 1.6 0 0 1-1.4-2.3z" strokeWidth="0" />
  </Svg>
);

export const Server = (p: P) => (
  <Svg {...p} grad={['#5eead4', '#0891b2']}>
    <rect x="4" y="3" width="16" height="7.5" rx="2" strokeWidth="0" />
    <rect x="4" y="13.5" width="16" height="7.5" rx="2" strokeWidth="0" />
    <circle cx="8" cy="6.8" r="1.2" fill="#0b0f1a" stroke="none" />
    <circle cx="8" cy="17.3" r="1.2" fill="#0b0f1a" stroke="none" />
    <path d="M12 6.8h5M12 17.3h5" stroke="#0b0f1a" strokeWidth="1.4" />
  </Svg>
);

export const Antenna = (p: P) => (
  <Svg {...p} grad={['#7dd3fc', '#2563eb']}>
    <path d="M12 10l-4 11M12 10l4 11M9.5 17h5" strokeWidth="2" fill="none" />
    <circle cx="12" cy="9" r="2.2" strokeWidth="0" />
    <path d="M7.5 4.5a6.4 6.4 0 0 0 0 9M16.5 4.5a6.4 6.4 0 0 1 0 9M4.6 2a10.5 10.5 0 0 0 0 14M19.4 2a10.5 10.5 0 0 1 0 14" strokeWidth="1.7" fill="none" />
  </Svg>
);

export const Database = (p: P) => (
  <Svg {...p} grad={['#6ee7b7', '#059669']}>
    <ellipse cx="12" cy="5.5" rx="7.5" ry="3" strokeWidth="0" />
    <path d="M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13c0 1.7-3.4 3-7.5 3s-7.5-1.3-7.5-3z" strokeWidth="0" opacity="0.8" />
    <path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" stroke="#0b0f1a" strokeWidth="1.2" fill="none" />
  </Svg>
);

export const Spark = (p: P) => (
  <Svg {...p} grad={['#f9a8d4', '#db2777']}>
    <path d="M12 2l2.2 6.3L21 10.5l-6.8 2.2L12 19l-2.2-6.3L3 10.5l6.8-2.2z" strokeWidth="0" />
    <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" strokeWidth="0" />
  </Svg>
);

export const Shield = (p: P) => (
  <Svg {...p} grad={['#fde68a', '#d97706']}>
    <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" strokeWidth="0" />
    <path d="M8.5 12l2.5 2.5 4.5-5" stroke="#0b0f1a" strokeWidth="2" fill="none" />
  </Svg>
);

export const Broom = (p: P) => (
  <Svg {...p} grad={['#86efac', '#059669']}>
    <path d="M20 3l-8 8" strokeWidth="2.4" fill="none" />
    <path d="M12.5 10.5l3 3-2 6.5c-3 .5-7-1-10-4z" strokeWidth="0" />
    <path d="M7 15.5l-2 3M10 17l-1.5 3" stroke="#0b0f1a" strokeWidth="1.2" />
  </Svg>
);

export const Tree = (p: P) => (
  <Svg {...p} grad={['#a7f3d0', '#10b981']}>
    <circle cx="12" cy="4.5" r="2.5" strokeWidth="0" />
    <circle cx="5" cy="13" r="2.5" strokeWidth="0" />
    <circle cx="19" cy="13" r="2.5" strokeWidth="0" />
    <circle cx="12" cy="20" r="2.5" strokeWidth="0" />
    <path d="M12 7v10.5M12 9.5L6.5 11.5M12 9.5l5.5 2" strokeWidth="1.8" fill="none" />
  </Svg>
);

export const Globe = (p: P) => (
  <Svg {...p} grad={['#93c5fd', '#4f46e5']}>
    <circle cx="12" cy="12" r="9.5" strokeWidth="0" opacity="0.35" />
    <circle cx="12" cy="12" r="9.5" strokeWidth="1.8" fill="none" />
    <path d="M2.5 12h19M12 2.5c3 3 3 16 0 19M12 2.5c-3 3-3 16 0 19" strokeWidth="1.5" fill="none" />
  </Svg>
);

export const Book = (p: P) => (
  <Svg {...p} grad={['#fcd34d', '#ea580c']}>
    <path d="M3 4.5C6 3.5 9 4 12 6v14c-3-2-6-2.5-9-1.5z" strokeWidth="0" />
    <path d="M21 4.5c-3-1-6-.5-9 1.5v14c3-2 6-2.5 9-1.5z" strokeWidth="0" opacity="0.7" />
  </Svg>
);

export const Team = (p: P) => (
  <Svg {...p} grad={['#f9a8d4', '#8b5cf6']}>
    <circle cx="12" cy="7" r="3.5" strokeWidth="0" />
    <path d="M5 20c0-4.5 3-7 7-7s7 2.5 7 7z" strokeWidth="0" />
    <circle cx="4.5" cy="10" r="2.2" strokeWidth="0" opacity="0.6" />
    <circle cx="19.5" cy="10" r="2.2" strokeWidth="0" opacity="0.6" />
  </Svg>
);

export const Bug = (p: P) => (
  <Svg {...p} grad={['#bef264', '#4d7c0f']}>
    <ellipse cx="12" cy="14" rx="5.5" ry="7" strokeWidth="0" />
    <circle cx="12" cy="6" r="3" strokeWidth="0" />
    <path d="M6.5 11L3 9M6.5 15H2.5M6.5 18.5L3 21M17.5 11L21 9M17.5 15h4M17.5 18.5L21 21M10 3.5L8.5 1.5M14 3.5l1.5-2" strokeWidth="1.6" fill="none" />
  </Svg>
);

export const Sound = ({ on, ...p }: P & { on: boolean }) => (
  <Svg {...p} grad={['#e2e8f0', '#94a3b8']}>
    <path d="M3 9.5h4l5-4.5v14l-5-4.5H3z" strokeWidth="0" />
    {on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" strokeWidth="1.8" fill="none" /> : <path d="M16 9l5 6M21 9l-5 6" strokeWidth="1.8" fill="none" />}
  </Svg>
);

export const Logo = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="logo-mark">
    <defs>
      <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#22d3ee" />
        <stop offset="1" stopColor="#a855f7" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="#0b1020" stroke="url(#lg1)" strokeWidth="3" />
    <path d="M24 16c-7 5-7 27 0 32M40 16c7 5 7 27 0 32" stroke="url(#lg1)" strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M26 40c4-2 6-8 7-14 1 6 3 12 7 14" stroke="#f472b6" strokeWidth="3.5" fill="none" strokeLinecap="round" />
  </svg>
);
