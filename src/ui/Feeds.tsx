import { CODEX } from '../content/codex';

export function CodexView({ unlocked }: { unlocked: string[] }) {
  return (
    <div className="codex">
      <div className="muted small">{unlocked.length}/{CODEX.length} discovered</div>
      {CODEX.map((c) => {
        const open = unlocked.includes(c.id);
        return (
          <details key={c.id} className={`codex-entry ${open ? '' : 'locked'}`}>
            <summary>{open ? c.emoji : '🔒'} {open ? c.title : '???'} {!open && <span className="muted small"> · {c.hint}</span>}</summary>
            {open && <p>{c.body}</p>}
          </details>
        );
      })}
    </div>
  );
}
