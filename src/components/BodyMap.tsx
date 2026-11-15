import { useEffect, useState } from 'react';
import type { BodySystem, Status } from '../types';
import type { Hazard } from '../lib/hazards';
import { Panel } from './Panel';

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

function Spots({ systems, selected, onPick }: { systems: BodySystem[]; selected?: string; onPick?: (id: BodySystem['id']) => void }) {
  return (
    <>
      {systems.map((s) => {
        const [cx, cy] = spots[s.id];
        return (
          <g key={s.id} className={`hit${s.id === selected ? ' on' : ''}`} onClick={() => onPick?.(s.id)}>
            <circle className="ring" cx={cx} cy={cy} r="9" />
            <circle cx={cx} cy={cy} r="4" fill={colour[s.status]} />
          </g>
        );
      })}
    </>
  );
}

interface StatusProps {
  systems: BodySystem[];
  leadsOff: boolean;
  onSystem: (id: BodySystem['id']) => void;
  onLeads: () => void;
  hazards: { hazard: Hazard; status: Status | null }[];
  onHazards: () => void;
}

function ElectrodeFigure() {
  return (
    <svg className="figure" viewBox="0 0 150 300" role="img" aria-label="Chest with the heart and the three ECG electrodes">
      <Silhouette />
      <path className="heart-shape" transform="translate(85 101) scale(1.9) translate(-86 -102)" d="M86 111c-7-4.5-10.5-8-10.5-12a3.8 3.8 0 0 1 10.5-2.2 3.8 3.8 0 0 1 10.5 2.2c0 4-3.5 7.5-10.5 12z" />
      {electrodes.map((e) => (
        <g key={e.lead}>
          <circle cx={e.x} cy={e.y} r="6" fill={e.colour} />
          <circle cx={e.x} cy={e.y} r="2" fill="#13171d" />
        </g>
      ))}
    </svg>
  );
}

function LeadList() {
  return (
    <ul className="leads">
      {electrodes.map((e) => (
        <li key={e.lead}>
          <span className="lead-dot" style={{ background: e.colour }} />
          <span><b>{e.lead}</b><span className="where">{e.where}</span></span>
        </li>
      ))}
    </ul>
  );
}

type Tab = 'systems' | 'leads' | 'hazards';

export function CrewStatus({ systems, leadsOff, onSystem, onLeads, hazards, onHazards }: StatusProps) {
  const [tab, setTab] = useState<Tab>('systems');
  const concerns = systems.filter((s) => s.status !== 'ok').length;

  // a loose electrode is the moment someone needs to see where it goes
  useEffect(() => {
    if (leadsOff) setTab('leads');
  }, [leadsOff]);

  const tabs = (
    <span className="tabs" role="tablist" aria-label="Body view">
      <button role="tab" aria-selected={tab === 'systems'} onClick={() => setTab('systems')}>
        Systems{concerns > 0 && <span className="dot watch" aria-label={`${concerns} to watch`} />}
      </button>
      <button role="tab" aria-selected={tab === 'leads'} onClick={() => setTab('leads')}>
        ECG leads{leadsOff && <span className="dot watch" aria-label="electrode loose" />}
      </button>
      <button role="tab" aria-selected={tab === 'hazards'} onClick={() => setTab('hazards')}>
        NASA hazards
      </button>
    </span>
  );

  return (
    <Panel
      title="Body"
      className="body"
      meta={tabs}
      more={tab === 'systems' ? undefined : 'More'}
      onMore={tab === 'leads' ? onLeads : tab === 'hazards' ? onHazards : undefined}
    >
      {tab === 'hazards' ? (
        <ul className="hazards">
          {hazards.map(({ hazard, status }) => (
            <li key={hazard.id}>
              <button onClick={onHazards}>
                <span className={`dot ${status ?? 'info'}`} />
                <span className="name">{hazard.name}</span>
                <span className={`cover ${hazard.coverage}`}>{COVERAGE[hazard.coverage]}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : tab === 'systems' ? (
        <>
          <svg className="figure" viewBox="0 0 150 300" aria-hidden="true">
            <Silhouette />
            <Spots systems={systems} onPick={onSystem} />
          </svg>
          <ul className="systems">
            {systems.map((s) => (
              <li key={s.id}>
                <button onClick={() => onSystem(s.id)}>
                  <span className={`dot ${s.status}`} />
                  <span className="name">{s.name}</span>
                  <span className="state">{s.state}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <ElectrodeFigure />
          <div className="leads-tab">
            <LeadList />
            <p className={`lead-state ${leadsOff ? 'watch-text' : 'muted'}`}>
              {leadsOff ? 'An electrode is loose. Press it down or replace the sticker.' : 'All three electrodes are on.'}
            </p>
          </div>
        </>
      )}
    </Panel>
  );
}

const COVERAGE = { covered: 'Monitored', partly: 'Partly', none: 'Not measured' } as const;

// The five hazards of human spaceflight (NASA HRP) and what AstroNav does for each.
export function HazardsDetail({ hazards }: { hazards: { hazard: Hazard; status: Status | null }[] }) {
  return (
    <div className="hazard-detail">
      <p className="popup-text">
        NASA&rsquo;s Human Research Program groups the dangers of spaceflight into five hazards. This is what AstroNav does for each, and the HRP risks it relates to.
      </p>
      <table className="log-table hazard-table">
        <thead>
          <tr><th>Hazard</th><th>Now</th><th>What AstroNav does</th><th>HRP risks</th></tr>
        </thead>
        <tbody>
          {hazards.map(({ hazard, status }) => (
            <tr key={hazard.id}>
              <td><b>{hazard.name}</b><div className="muted small">{hazard.nasa}</div></td>
              <td><span className={`dot ${status ?? 'info'}`} /> <span className={`cover ${hazard.coverage}`}>{COVERAGE[hazard.coverage]}</span></td>
              <td>{hazard.measures}</td>
              <td className="muted small">{hazard.risks.join(' · ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">Sources: nasa.gov/hrp/hazards, nasa.gov/hrp/risks; radiation: Canadian Space Agency, &ldquo;Monitoring radiation for astronaut health&rdquo; (2026).</p>
    </div>
  );
}

export function SystemDetail({ systems, id }: { systems: BodySystem[]; id: BodySystem['id'] }) {
  const s = systems.find((x) => x.id === id);
  if (!s) return null;
  return (
    <div className="detail-split">
      <svg className="figure" viewBox="0 0 150 300" aria-hidden="true">
        <Silhouette />
        <Spots systems={systems} selected={id} />
      </svg>
      <div className="explain">
        <p className="status-line"><span className={`dot ${s.status}`} /> {s.state}</p>
        <p>{s.what}</p>
        <h3>In space</h3>
        <p>{s.inSpace}</p>
        <h3>When to act</h3>
        <p>{s.whenToAct}</p>
        <h3>NASA Human Research Program</h3>
        <p className="hrp">
          <span className="k">Hazard</span> {s.hazard}
          <br />
          <span className="k">{s.risks.length > 1 ? 'Risks' : 'Risk'}</span> {s.risks.join(' · ')}
        </p>
      </div>
    </div>
  );
}

export function EcgSetup({ leadsOff }: { leadsOff: boolean }) {
  return (
    <div className="detail-split">
      <ElectrodeFigure />
      <div className="explain">
        <LeadList />
        <p className={leadsOff ? 'watch-text' : 'muted'}>
          {leadsOff ? 'An electrode is loose. Press it down or replace the sticker.' : 'All three electrodes are on.'}
        </p>
        <h3>Why on the chest</h3>
        <p>The three electrodes pick up the heart&rsquo;s electrical signal. That gives the heart rhythm and the beat-to-beat timing the console uses for HRV and stress.</p>
        <p><b>Tip.</b> Clean, dry skin and fresh stickers give the cleanest trace. The heart sits slightly left of the middle, so the yellow lead is on that side.</p>
      </div>
    </div>
  );
}
