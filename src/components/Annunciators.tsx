import type { AlertEvent, Vitals } from '../types';
import type { LinkStatus } from '../lib/packets';
import { cwClass, type CwClass } from '../lib/cw';
import { LAMPS, type LampLabel } from '../lib/lamps';

const RANK: Record<CwClass, number> = { advisory: 1, caution: 2, warning: 3, emergency: 4 };

interface Props {
  alerts: AlertEvent[];
  vitals: Vitals;
  link: LinkStatus;
  linkLost: boolean;
  muted: Set<LampLabel>;
  onOpen: () => void;
}

// speaker with a stroke through it, next to the label of a muted lamp
function MutedIcon() {
  return (
    <svg className="lamp-mute" viewBox="0 0 16 16" width="11" height="11" aria-label="muted" role="img">
      <path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor" />
      <path d="M11 6l4 4M15 6l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Annunciators({ alerts, vitals, link, linkLost, muted, onOpen }: Props) {
  const open = alerts.filter((a) => a.resolution === null && a.code !== null);
  const worst = (codes: readonly number[]): CwClass | null =>
    open.filter((a) => codes.includes(a.code!)).map(cwClass).sort((a, b) => RANK[b] - RANK[a])[0] ?? null;

  const lamps: { label: string; cls: CwClass | null; muted: boolean }[] = LAMPS.map((l) => {
    let cls = worst(l.codes);
    // what the screen already knows, before the watch raises it
    if (!cls && l.label === 'ECG leads' && vitals.leadsOff) cls = 'advisory';
    if (!cls && l.label === 'Skin contact' && !vitals.skinContact) cls = 'advisory';
    return { label: l.label, cls, muted: muted.has(l.label) };
  });
  if (link.state !== 'unavailable') lamps.push({ label: 'Link', cls: linkLost ? 'caution' : null, muted: false });

  const counts = lamps.reduce<Partial<Record<CwClass, number>>>((n, l) => (l.cls ? { ...n, [l.cls]: (n[l.cls] ?? 0) + 1 } : n), {});
  const top = (Object.keys(counts) as CwClass[]).sort((a, b) => RANK[b] - RANK[a])[0];

  return (
    <nav className="cw" aria-label="Caution and warning">
      <div className={`cw-sum ${top ?? 'nominal'}`}>
        <span className="k">C&amp;W</span>
        <span>{top ? `${counts[top]} ${top}` : 'Nominal'}</span>
      </div>
      <div className="lamps">
        {lamps.map((l) => (
          <button
            key={l.label}
            className={`lamp${l.cls ? ` ${l.cls}` : ''}${l.muted ? ' muted' : ''}`}
            onClick={onOpen}
            title={`${l.cls ? `${l.label}: ${l.cls}. Open the event log.` : `${l.label}: nominal`}${l.muted ? ' Sound muted.' : ''}`}
          >
            {l.label}
            {l.muted && <MutedIcon />}
          </button>
        ))}
      </div>
    </nav>
  );
}
