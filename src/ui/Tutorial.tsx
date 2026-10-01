import { useState } from 'react';
import { Bug, Server, Tree } from './Icons';

const STEPS = [
  { icon: <Server size={64} />, title: 'Keep the packets flowing', body: 'Hit + on any glowing zone before it turns red. Red means dropped requests and angry users.' },
  { icon: <Bug size={64} />, title: 'Click the chaos', body: 'Squash bugs 🐛, put out fires 🔥, catch golden packets ✨.' },
  { icon: <Tree size={64} />, title: 'Scale to unicorn 🦄', body: 'Hire a team, research tech, grow to a $1B valuation and IPO.' },
];

export function Tutorial({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  return (
    <div className="overlay">
      <div className="modal tutorial" key={i}>
        <div className="tut-icon">{step.icon}</div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="dots">{STEPS.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}</div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onDone}>Skip</button>
          <button className="btn primary" onClick={() => (last ? onDone() : setI(i + 1))}>{last ? 'Play!' : 'Next'}</button>
        </div>
      </div>
    </div>
  );
}
