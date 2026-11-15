import type { ReactNode } from 'react';
import type { Battery, Simulated, Vitals } from '../types';
import { percentFromBaseline, signed } from '../lib/health';
import { EcgTrace } from './EcgTrace';
import { Figure } from './Figure';
import { Panel } from './Panel';

interface Props {
  vitals: Vitals;
  battery: Battery;
  simulated: Simulated;
  hrvNow: number | null;
  hrvBaseline: number | null;
  ecgSamples: (() => number[]) | null;
  onLeads: () => void;
}

// why the optical values are blank; nothing when the reading is good
const OPTICAL_NOTE: Record<Vitals['optical'], string | null> = {
  ok: null,
  noContact: 'No skin contact',
  motion: 'Hold still to measure',
  weak: 'Weak signal, tighten the strap',
};

const Sim = () => <span className="pill sim" title="Simulated by the watch in demo mode">Sim</span>;

interface ReadoutProps {
  tone: string;
  label: string;
  unit: string;
  sim?: boolean;
  sub: ReactNode;
  children: ReactNode;
}

function Readout({ tone, label, unit, sim, sub, children }: ReadoutProps) {
  return (
    <div className={`readout ${tone}`}>
      <div className="readout-head"><span>{label}</span>{sim ? <Sim /> : <span className="unit">{unit}</span>}</div>
      <div className="readout-value fig">{children}</div>
      <div className="readout-sub">{sub}</div>
    </div>
  );
}

export function VitalsStrip({ vitals, battery, simulated, hrvNow, hrvBaseline, ecgSamples, onLeads }: Props) {
  const drop = hrvNow !== null && hrvBaseline !== null ? percentFromBaseline(hrvNow, hrvBaseline) : null;
  const ecgBpm = vitals.hrEcg ?? vitals.hrPpg;

  return (
    <Panel
      title="Vitals"
      className="vitals"
      more="Electrodes"
      onMore={onLeads}
    >
      <div className="ecg-strip">
        <span className="strip-label">ECG &middot; 1 lead</span>
        {vitals.leadsOff || (!ecgSamples && ecgBpm === null)
          ? <button className="leads-off" onClick={onLeads}>{vitals.leadsOff ? 'Leads off. Show where the electrodes go' : 'No ECG signal'}</button>
          : <>
            {/* live: always draw what comes in (mains hum filtered out), dimmed with a warning when it is not a heartbeat */}
            <EcgTrace bpm={ecgBpm ?? 60} samples={ecgSamples} poor={!!ecgSamples && !vitals.ecgUsable} />
            {ecgSamples && !vitals.ecgUsable && (
              <button className="leads-off over" onClick={onLeads}>Poor signal, mostly mains hum. Check the electrodes</button>
            )}
          </>}
      </div>
      <div className="readouts">
        <Readout
          tone="hr" label="Heart rate" unit="bpm" sim={simulated.optical}
          sub={vitals.leadsOff ? 'ECG electrode loose'
            : vitals.hrEcg === null && OPTICAL_NOTE[vitals.optical] ? OPTICAL_NOTE[vitals.optical]
            : <>ECG <span className="fig">{vitals.hrEcg ?? '—'}</span>{vitals.hrEcg !== null && `, ${vitals.rhythmRegular ? 'regular' : 'irregular'}`}</>}
        >
          <Figure value={vitals.hrPpg ?? vitals.hrEcg} />
        </Readout>
        <Readout
          tone="spo2" label="SpO2" unit="%" sim={simulated.optical}
          sub={OPTICAL_NOTE[vitals.optical]
            ?? <>Perfusion <span className="fig"><Figure value={vitals.perfusion} digits={1} /></span> %</>}
        >
          <Figure value={vitals.spo2} />
        </Readout>
        <Readout
          tone={drop !== null && drop <= -20 ? 'hrv low' : 'hrv'} label="HRV" unit="ms"
          sub={hrvBaseline === null ? 'Learning baseline, about 5 min'
            : <><span className="fig">{drop !== null ? `${signed(drop)} %` : '—'}</span> vs baseline <span className="fig">{hrvBaseline}</span></>}
        >
          <Figure value={hrvNow} />
        </Readout>
        <Readout
          tone="plain" label="Skin temp" unit="°C" sim={simulated.optical}
          sub={vitals.skinTempSteadySince ? <>Steady since <span className="fig">{vitals.skinTempSteadySince}</span></> : 'Trend, not core'}
        >
          <Figure value={vitals.skinTemp} digits={1} />
        </Readout>
        <Readout
          tone="plain" label="Battery" unit="%" sim={battery.simulated}
          sub={battery.percent === null ? 'Running on USB'
            : battery.hoursLeft !== null ? <>About <span className="fig">{battery.hoursLeft}</span> h left</> : 'Charge level'}
        >
          <Figure value={battery.percent} />
        </Readout>
      </div>
    </Panel>
  );
}
