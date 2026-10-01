import { useEffect, useRef } from 'react';
import { computeMods } from '../engine/mods';
import type { GameState } from '../engine/types';

interface Particle {
  x: number;
  y: number;
  vy: number;
  stage: number;
  state: 'flow' | 'drop' | 'cache' | 'cdn';
  life: number;
  hue: string;
}

interface Snapshot {
  rps: number;
  util: { cpu: number; bw: number; db: number };
  latency: number;
  cacheHit: number;
  cdn: number;
  down: boolean;
  bugs: number;
}

const NODES = [
  { key: 'users', label: 'Users', emoji: '👥', x: 0 },
  { key: 'bw', label: 'Bandwidth', emoji: '🌐', x: 1 / 3 },
  { key: 'cpu', label: 'Compute', emoji: '🖥️', x: 2 / 3 },
  { key: 'db', label: 'Database', emoji: '🗄️', x: 1 },
] as const;

function utilFill(u: number): string {
  if (u > 1) return '#ef4444';
  if (u > 0.85) return '#f59e0b';
  if (u > 0.6) return '#a3e635';
  return '#22c55e';
}

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Animated request flow. Packet density follows traffic and colour follows load; dropped requests fall off the pipe. */
export function Pipeline({ s }: { s: GameState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snap = useRef<Snapshot | null>(null);

  const m = s.metrics;
  const mods = computeMods(s);
  snap.current = {
    rps: m.rpsPeak,
    util: m.util,
    latency: m.latency,
    cacheHit: mods.flags.has('cache') ? mods.cacheHit : 0,
    cdn: mods.cdnOffload,
    down: m.downtime > 0 || s.outageHours > 0,
    bugs: s.bugs,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const particles: Particle[] = [];
    let spawnAcc = 0;
    let last = performance.now();
    let t = 0;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const sn = snap.current!;
      const midY = h * 0.48;
      const pad = Math.min(60, Math.max(44, w * 0.07));
      const X = (f: number) => pad + (w - pad * 2) * f;
      const text = cssVar('--text', '#e2e8f0');
      const muted = cssVar('--muted', '#8b97b3');
      const panel = cssVar('--panel2', '#1a2238');
      ctx.clearRect(0, 0, w, h);

      // pipe
      ctx.strokeStyle = cssVar('--border', '#26304a');
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(NODES[0].x), midY);
      ctx.lineTo(X(NODES[3].x), midY);
      ctx.stroke();

      // spawn
      const rate = sn.down ? 6 : Math.min(60, 2 + Math.log10(sn.rps + 1) * 9);
      spawnAcc += reduced ? 0 : rate * dt;
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        particles.push({ x: X(NODES[0].x) + 18, y: midY + (Math.random() - 0.5) * 8, vy: 0, stage: 0, state: 'flow', life: 1, hue: '#38bdf8' });
      }
      const speed = Math.max(40, Math.min(260, 26000 / Math.max(60, sn.latency))) * (w / 900);
      const utils = [0, sn.util.bw, sn.util.cpu, sn.util.db];
      const drop = (u: number) => (u > 1 ? 1 - 1 / u : 0);
      const cdnX = X((NODES[0].x + NODES[1].x) / 2);
      const cacheX = X((NODES[2].x + NODES[3].x) / 2);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.state === 'flow') {
          p.x += speed * dt;
          // CDN exit
          if (p.stage === 0 && p.x >= cdnX) {
            p.stage = 0.5;
            if (Math.random() < sn.cdn) { p.state = 'cdn'; p.hue = '#a78bfa'; }
          }
          for (let k = 1; k <= 3; k++) {
            if (p.stage < k && p.x >= X(NODES[k].x)) {
              p.stage = k;
              if (sn.down || Math.random() < drop(utils[k])) { p.state = 'drop'; p.hue = '#ef4444'; p.vy = -40; }
              else if (Math.random() < Math.min(0.5, sn.bugs * 0.0003)) { p.state = 'drop'; p.hue = '#f59e0b'; p.vy = -30; }
            }
          }
          if (p.stage === 2 && p.x >= cacheX && p.state === 'flow') {
            p.stage = 2.5;
            if (Math.random() < sn.cacheHit) { p.state = 'cache'; p.hue = '#22d3ee'; }
          }
          if (p.x > X(NODES[3].x) + 10) p.life -= dt * 4;
        } else if (p.state === 'drop') {
          p.vy += 260 * dt;
          p.y += p.vy * dt;
          p.x += speed * 0.2 * dt;
          p.life -= dt * 0.9;
        } else {
          p.y -= 30 * dt;
          p.life -= dt * 2.2;
        }
        if (p.life <= 0 || p.y > h + 10) particles.splice(i, 1);
      }
      if (particles.length > 400) particles.splice(0, particles.length - 400);

      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.fillStyle = p.hue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.state === 'flow' ? 3 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // markers
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      if (sn.cdn > 0) {
        ctx.fillStyle = '#a78bfa';
        ctx.fillText(`CDN ${Math.round(sn.cdn * 100)}%`, cdnX, midY - 18);
      }
      if (sn.cacheHit > 0) {
        ctx.fillStyle = '#22d3ee';
        ctx.fillText(`⚡ cache ${Math.round(sn.cacheHit * 100)}%`, cacheX, midY - 18);
      }

      // nodes
      for (let k = 0; k < NODES.length; k++) {
        const n = NODES[k];
        const x = X(n.x);
        const r = Math.min(34, h * 0.2);
        const u = utils[k];
        const pulse = u > 1 ? 1 + Math.sin(t * 10) * 0.06 : 1;
        ctx.save();
        ctx.translate(x, midY);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = panel;
        ctx.strokeStyle = k === 0 ? '#38bdf8' : utilFill(u);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (k > 0) {
          ctx.strokeStyle = utilFill(u);
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(0, 0, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, u));
          ctx.stroke();
        }
        ctx.font = `${Math.round(r * 0.9)}px system-ui, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText(n.emoji, 0, 2);
        ctx.restore();
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = text;
        ctx.font = '600 12px "JetBrains Mono", monospace';
        ctx.fillText(n.label, x, midY + r + 22);
        ctx.fillStyle = k === 0 ? muted : utilFill(u);
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillText(k === 0 ? `${Math.round(sn.rps).toLocaleString()} req/s peak` : `${Math.round(u * 100)}% load`, x, midY + r + 37);
      }

      if (sn.down) {
        ctx.fillStyle = `rgba(239,68,68,${0.55 + Math.sin(t * 8) * 0.3})`;
        ctx.font = '800 22px "JetBrains Mono", monospace';
        ctx.fillText('🔥 OUTAGE 🔥', w / 2, 26);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="pipeline-canvas" aria-label="Request flow through bandwidth, compute and database" />;
}
