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
        {ecgBpm !== null && !vitals.leadsOff
          ? <EcgTrace bpm={ecgBpm} samples={ecgSamples} />
          : <button className="leads-off" onClick={onLeads}>{vitals.leadsOff ? 'Leads off. Show where the electrodes go' : 'No ECG signal'}</button>}
      </div>
      <div className="readouts">
        <Readout
          tone="hr" label="Heart rate" unit="bpm" sim={simulated.optical}
          sub={vitals.leadsOff ? 'ECG electrode loose'
            : <>ECG <span className="fig">{vitals.hrEcg ?? '—'}</span>{vitals.hrEcg !== null && `, ${vitals.rhythmRegular ? 'regular' : 'irregular'}`}</>}
        >
          <Figure value={vitals.hrPpg ?? vitals.hrEcg} />
        </Readout>
        <Readout
          tone="spo2" label="SpO2" unit="%" sim={simulated.optical}
          sub={vitals.spo2 === null && !vitals.skinContact ? 'No skin contact'
            : <>Perfusion <span className="fig"><Figure value={vitals.perfusion} digits={1} /></span> %</>}
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
