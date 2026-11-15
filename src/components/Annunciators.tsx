import type { AlertEvent, Vitals } from '../types';
import type { LinkStatus } from '../lib/packets';
import { EVENT_CODE } from '../lib/packets';

// ISS caution and warning classes; a rapid depress is the one emergency the watch can see
export type CwClass = 'emergency' | 'warning' | 'caution' | 'advisory';

export function cwClass(a: Pick<AlertEvent, 'code' | 'severity'>): CwClass {
  if (a.severity === 'alarm') return a.code === EVENT_CODE.pressureDrop ? 'emergency' : 'warning';
  return a.severity === 'warning' ? 'caution' : 'advisory';
}

const RANK: Record<CwClass, number> = { advisory: 1, caution: 2, warning: 3, emergency: 4 };

const LAMPS = [
  { label: 'ppCO2', codes: [EVENT_CODE.co2Limit, EVENT_CODE.co2Early] },
  { label: 'Cabin press', codes: [EVENT_CODE.pressureDrop] },
  { label: 'SpO2', codes: [EVENT_CODE.spo2Low] },
  { label: 'Heart rate', codes: [EVENT_CODE.hrHigh, EVENT_CODE.hrLow] },
  { label: 'Stress', codes: [EVENT_CODE.stressHigh] },
  { label: 'ECG leads', codes: [EVENT_CODE.leadsOff] },
  { label: 'Skin contact', codes: [EVENT_CODE.noSkinContact] },
  { label: 'Shock', codes: [EVENT_CODE.shock] },
  { label: 'Climate', codes: [EVENT_CODE.cabinClimate] },
  { label: 'Wrist batt', codes: [EVENT_CODE.batteryLow] },
] as const;

interface Props {
  alerts: AlertEvent[];
  vitals: Vitals;
  link: LinkStatus;
  linkLost: boolean;
  onOpen: () => void;
}

export function Annunciators({ alerts, vitals, link, linkLost, onOpen }: Props) {
  const open = alerts.filter((a) => a.resolution === null && a.code !== null);
  const worst = (codes: readonly number[]): CwClass | null =>
    open.filter((a) => codes.includes(a.code!)).map(cwClass).sort((a, b) => RANK[b] - RANK[a])[0] ?? null;

  const lamps: { label: string; cls: CwClass | null }[] = LAMPS.map((l) => {
    let cls = worst(l.codes);
    // what the screen already knows, before the watch raises it
    if (!cls && l.label === 'ECG leads' && vitals.leadsOff) cls = 'advisory';
    if (!cls && l.label === 'Skin contact' && !vitals.skinContact) cls = 'advisory';
    return { label: l.label, cls };
  });
  if (link.state !== 'unavailable') lamps.push({ label: 'Link', cls: linkLost ? 'caution' : null });

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
            className={`lamp${l.cls ? ` ${l.cls}` : ''}`}
            onClick={onOpen}
            title={l.cls ? `${l.label}: ${l.cls}. Open the event log.` : `${l.label}: nominal`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
