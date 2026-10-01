import { useEffect, useRef } from 'react';
import { DataCenter } from '../three/DataCenter';

/** Self-running demo diorama behind the main menu. */
export function MenuWorld() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const dc = new DataCenter(ref.current);
    let t = 0;
    const tick = () => {
      t += 1;
      const wave = (Math.sin(t / 20) + 1) / 2;
      dc.setState({
        users: 2_000_000, servers: 24 + Math.round(wave * 14), bandwidth: 40, dbNodes: 6,
        util: { cpu: 0.45 + wave * 0.6, bw: 0.55, db: 0.7 }, rps: 20000, latency: 120, cacheHit: 0.4, cdn: 0.3,
        down: false, bugs: 18, outageHours: 0, teams: { product: 6, sre: 4, rnd: 4, refactor: 2 }, regions: ['eu', 'apac', 'mars'],
        flags: { cache: true, cdn: true, edge: false, autoscale: true }, running: true, speed: 1,
      });
    };
    tick();
    const id = window.setInterval(tick, 400);
    return () => { window.clearInterval(id); dc.dispose(); };
  }, []);
  return <canvas ref={ref} className="world-canvas menu-world" aria-hidden />;
}
