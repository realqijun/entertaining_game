import { useState } from 'react';

const STEPS: { emoji: string; title: string; body: string }[] = [
  { emoji: '🚀', title: 'Welcome, founder', body: 'You have 5 years to turn a garage startup into a giant. Your score is your net worth: company valuation × the share you still own. Go bankrupt and it is game over.' },
  { emoji: '🌐', title: 'Keep the pipes flowing', body: 'Every request flows through Bandwidth → Compute → Database. Watch the load rings. Past ~85%, latency explodes (queueing theory!). Past 100%, requests get dropped. Use + / − or the ⚖️ right-size button. Over-provisioning wastes money.' },
  { emoji: '👩‍💻', title: 'Allocate your engineers', body: 'Product ships features (users expect them). SRE fixes bugs. R&D earns research points. Refactor pays down tech debt, which silently slows everyone. Hiring has diminishing returns (Brooks\'s Law).' },
  { emoji: '🌳', title: 'Climb the tech tree', body: 'Spend research points on real CS upgrades: binary trees to ternary search trees, caching, CDNs, sharding, chaos engineering… Answer the CS quiz after each one for a refund. Some techs are rivals. Choose wisely.' },
  { emoji: '😊', title: 'Balance happiness and money', body: 'Happiness depends on speed, reliability, features, bugs and price, weighted differently for each product. Happy users grow your company, and unhappy ones churn. Every quarter, the board deals you strategy cards.' },
  { emoji: '🦄', title: 'Raise, expand, exit', body: 'Hit user milestones to raise VC rounds (they dilute you). Unlock new regions with the right tech. At a $1B valuation you can IPO, and the earlier you do, the bigger the bonus. Space pauses. Keys 1–3 set the speed. T opens the tech tree.' },
];

export function Tutorial({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  return (
    <div className="overlay">
      <div className="modal tutorial">
        <div className="modal-emoji big">{step.emoji}</div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="dots">{STEPS.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}</div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onDone}>Skip</button>
          {i > 0 && <button className="btn ghost" onClick={() => setI(i - 1)}>Back</button>}
          <button className="btn primary" onClick={() => (i === STEPS.length - 1 ? onDone() : setI(i + 1))}>{i === STEPS.length - 1 ? "Let's go!" : 'Next'}</button>
        </div>
      </div>
    </div>
  );
}
