import { LAMPS, type LampLabel } from '../lib/lamps';

interface Props {
  muted: Set<LampLabel>;
  onChange: (muted: Set<LampLabel>) => void;
}

// Sound per lamp. A muted lamp still lights up; only the buzzer on the watch stays quiet for it.
export function MuteControl({ muted, onChange }: Props) {
  const toggle = (label: LampLabel) => {
    const next = new Set(muted);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    onChange(next);
  };
  const all = LAMPS.every((l) => muted.has(l.label));

  return (
    <div className="mute-pop">
      <p className="popup-text">
        Muting silences the buzzer on the watch for that parameter. The lamp at the top still lights up and the event is still logged.
      </p>
      <ul className="mute-list">
        {LAMPS.map((l) => (
          <li key={l.label}>
            <span>{l.label}</span>
            <button
              className="toggle"
              role="switch"
              aria-checked={!muted.has(l.label)}
              aria-label={`Sound for ${l.label}`}
              onClick={() => toggle(l.label)}
            >
              <span className="track-sw" aria-hidden="true"><span /></span>
              {muted.has(l.label) ? 'Muted' : 'Sound'}
            </button>
          </li>
        ))}
      </ul>
      <div className="mute-actions">
        <button className="btn small" onClick={() => onChange(all ? new Set() : new Set(LAMPS.map((l) => l.label)))}>
          {all ? 'Unmute all' : 'Mute all'}
        </button>
      </div>
    </div>
  );
}
