import { useState } from 'react';
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

export function BodyMap({ systems }: { systems: BodySystem[] }) {
  const firstConcern = systems.find((s) => s.status !== 'ok') ?? systems[0];
  const [selected, setSelected] = useState(firstConcern?.id);
  const current = systems.find((s) => s.id === selected);

  return (
    <section className="card body-card" aria-labelledby="body-title">
      <div className="card-head">
        <h2 id="body-title">Body systems</h2>
        <span className="muted">Select one to read more</span>
      </div>
      <svg className="figure" viewBox="0 0 150 300" aria-hidden="true">
        <g className="silhouette">
          <circle cx="75" cy="30" r="20" />
          <rect x="67" y="48" width="16" height="14" rx="4" />
          <path d="M44 62h62c9 0 15 6 16 15l7 74c1 6-3 10-8 10s-8-4-9-9l-6-56v54l3 28H41l3-28V96l-6 56c-1 5-4 9-9 9s-9-4-8-10l7-74c1-9 7-15 16-15z" />
          <path d="M44 183h29l-3 104c0 5-4 8-9 8s-9-3-9-8zM77 183h29l-8 104c0 5-4 8-9 8s-9-3-9-8z" />
        </g>
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
    </section>
  );
}
