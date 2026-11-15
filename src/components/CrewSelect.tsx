import { useEffect, useRef, useState } from 'react';
import type { CrewEntry } from '../lib/useCrew';
import type { CrewMember } from '../lib/crew';

interface Props {
  members: CrewEntry[];
  selected: CrewMember;
  onSelect: (id: string) => void;
}

const statusText = (s: CrewEntry['status']) => (s ? `${s} open` : 'nominal');

// Pick which crew member the console shows. The dot is the most serious open alert of each one,
// so a problem with someone else is visible without switching.
export function CrewSelect({ members, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = members.find((m) => m.member.id === selected.id)!;
  // someone not on screen has a caution or worse
  const elsewhere = members.some((m) => m.member.id !== selected.id && m.status && m.status !== 'advisory');

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="crew-select" ref={box}>
      <button
        className="crew-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Crew member: ${selected.name}. Choose another crew member`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`cdot ${current.status ?? 'nominal'}`} aria-hidden="true" />
        <span className="crew-name">{selected.name}</span>
        <span className="k">{selected.role} &middot; {selected.location}</span>
        {elsewhere && <span className="crew-flag" title="Another crew member has an open caution or warning">!</span>}
        <span className="caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="crew-menu" role="listbox" aria-label="Crew">
          {members.map(({ member, status }) => (
            <li key={member.id}>
              <button
                role="option"
                aria-selected={member.id === selected.id}
                onClick={() => {
                  onSelect(member.id);
                  setOpen(false);
                }}
              >
                <span className={`cdot ${status ?? 'nominal'}`} aria-hidden="true" />
                <span className="crew-name">{member.name}</span>
                <span className="k">{member.role} &middot; {member.location}</span>
                <span className={`pill${member.kind === 'demo' ? ' sim' : ''}`}>{member.kind === 'demo' ? 'Demo' : 'Wrist station'}</span>
                <span className="crew-status">{statusText(status)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
