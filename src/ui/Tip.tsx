import { useState } from 'react';

/** Small "?" bubble that explains a mechanic on hover or tap. */
export function Tip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="tip" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
      ?
      {open && <span className="tip-bubble" role="tooltip">{text}</span>}
    </span>
  );
}
