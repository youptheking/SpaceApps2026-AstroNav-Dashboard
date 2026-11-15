import { useEffect, useState } from 'react';
import type { BodySystem } from '../types';

// where each system sits on the 150x300 figure; the wrist is where the station is worn
const spots: Record<BodySystem['id'], [number, number]> = {
  nerves: [75, 26],
  lungs: [61, 90],
  heart: [85, 100],
  skin: [126, 150],
  muscle: [60, 230],
};

const colour = { ok: 'var(--positive)', watch: 'var(--warning)', alert: 'var(--negative)' } as const;

// AD8232 lead colours on the cable; the figure faces you, so the wearer's right is on the left
const electrodes = [
  { lead: 'Red', colour: '#e5484d', x: 56, y: 74, where: 'Right chest, just under the collarbone' },
  { lead: 'Yellow', colour: '#f0c419', x: 94, y: 74, where: 'Left chest, just under the collarbone' },
  { lead: 'Green', colour: '#3fb950', x: 58, y: 166, where: 'Right side, on the lower ribs' },
];

function Silhouette() {
  return (
    <g className="silhouette">
      <circle cx="75" cy="30" r="20" />
      <rect x="67" y="48" width="16" height="14" rx="4" />
      <path d="M44 62h62c9 0 15 6 16 15l7 74c1 6-3 10-8 10s-8-4-9-9l-6-56v54l3 28H41l3-28V96l-6 56c-1 5-4 9-9 9s-9-4-8-10l7-74c1-9 7-15 16-15z" />
      <path d="M44 183h29l-3 104c0 5-4 8-9 8s-9-3-9-8zM77 183h29l-8 104c0 5-4 8-9 8s-9-3-9-8z" />
    </g>
  );
}

type View = 'status' | 'ecg';

export function BodyMap({ systems, leadsOff }: { systems: BodySystem[]; leadsOff: boolean }) {
  const firstConcern = systems.find((s) => s.status !== 'ok') ?? systems[0];
  const [selected, setSelected] = useState(firstConcern?.id);
  const [view, setView] = useState<View>('status');
  const current = systems.find((s) => s.id === selected);

  // a loose electrode is the moment someone needs the placement guide
  useEffect(() => {
    if (leadsOff) setView('ecg');
  }, [leadsOff]);

  return (
    <section className="card body-card" aria-labelledby="body-title">
      <div className="card-head">
        <h2 id="body-title">Body</h2>
        <div className="range" role="group" aria-label="View">
          <button aria-pressed={view === 'status'} onClick={() => setView('status')}>Status</button>
          <button aria-pressed={view === 'ecg'} onClick={() => setView('ecg')}>
            ECG setup{leadsOff && <span className="dot watch tab-dot" aria-label="electrode loose" />}
          </button>
        </div>
      </div>

      {view === 'status' ? (
        <>
          <svg className="figure" viewBox="0 0 150 300" aria-hidden="true">
            <Silhouette />
            {systems.map((s) => {
              const [cx, cy] = spots[s.id];
              return (
                <g key={s.id} className={`hit${s.id === selected ? ' on' : ''}`} onClick={() => setSelected(s.id)}>
                  <circle className="ring" cx={cx} cy={cy} r="9" />
                  <circle cx={cx} cy={cy} r="4" fill={colour[s.status]} />
                </g>
              );
            })}
          </svg>
          <ul className="systems">
            {systems.map((s) => (
              <li key={s.id}>
                <button aria-pressed={s.id === selected} onClick={() => setSelected(s.id)}>
                  <span className={`dot ${s.status}`} />
                  <span className="name">{s.name}</span>
                  <span className="state">{s.state}</span>
                </button>
              </li>
            ))}
          </ul>
          {current && (
            <div className="explain" aria-live="polite">
              <h3>{current.name}</h3>
              <p>{current.what}</p>
              <p><b>In space.</b> {current.inSpace}</p>
              <p><b>When to act.</b> {current.whenToAct}</p>
            </div>
          )}
        </>
      ) : (
        <>
          <svg className="figure" viewBox="0 0 150 300" role="img" aria-label="Chest with the heart and the three ECG electrodes">
            <Silhouette />
            <path className="heart-shape" transform="translate(85 101) scale(1.9) translate(-86 -102)" d="M86 111c-7-4.5-10.5-8-10.5-12a3.8 3.8 0 0 1 10.5-2.2 3.8 3.8 0 0 1 10.5 2.2c0 4-3.5 7.5-10.5 12z" />
            {electrodes.map((e) => (
              <g key={e.lead}>
                <circle cx={e.x} cy={e.y} r="6" fill={e.colour} />
                <circle cx={e.x} cy={e.y} r="2" fill="#131217" />
              </g>
            ))}
          </svg>
          <div className="ecg-setup">
            <ul className="leads">
              {electrodes.map((e) => (
                <li key={e.lead}>
                  <span className="lead-dot" style={{ background: e.colour }} />
                  <span><b>{e.lead}</b><span className="where">{e.where}</span></span>
                </li>
              ))}
            </ul>
            <p className={`lead-state${leadsOff ? ' watch-text' : ''}`}>
              {leadsOff ? 'An electrode is loose. Press it down or replace the sticker.' : 'All three electrodes are on.'}
            </p>
          </div>
          <div className="explain">
            <h3>Why on the chest</h3>
            <p>The three electrodes pick up the heart&rsquo;s electrical signal. That gives the heart rhythm and the beat-to-beat timing the dashboard uses for HRV and stress.</p>
            <p><b>Tip.</b> Clean, dry skin and fresh stickers give the cleanest trace. The heart sits slightly left of the middle, so the yellow lead is on that side.</p>
          </div>
        </>
      )}
    </section>
  );
}
