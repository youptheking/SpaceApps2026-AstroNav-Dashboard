import type { Battery, Simulated, Vitals } from '../types';
import { percentFromBaseline, signed } from '../lib/health';
import { EcgTrace } from './EcgTrace';
import { Figure } from './Figure';

interface Props {
  vitals: Vitals;
  battery: Battery;
  simulated: Simulated;
  hrvNow: number | null;
  hrvBaseline: number | null;
  ecgSamples: (() => number[]) | null;
}

const Sim = () => <span className="pill sim">Simulated</span>;

export function VitalsStrip({ vitals, battery, simulated, hrvNow, hrvBaseline, ecgSamples }: Props) {
  const drop = hrvNow !== null && hrvBaseline !== null ? percentFromBaseline(hrvNow, hrvBaseline) : null;
  const ecgBpm = vitals.hrEcg ?? vitals.hrPpg;

  return (
    <section className="card vitals" aria-label="Vital signs, now">
      <div className="vital heart">
        <div>
          <div className="label">Heart rate {simulated.optical && <Sim />}</div>
          <div className="value fig"><Figure value={vitals.hrPpg ?? vitals.hrEcg} unit="bpm" /></div>
          <div className="sub">
            {vitals.leadsOff ? 'ECG electrode loose' : <>ECG <span className="fig">{vitals.hrEcg ?? '—'}</span>{vitals.hrEcg !== null && ` · rhythm ${vitals.rhythmRegular ? 'regular' : 'irregular'}`}</>}
          </div>
        </div>
        {ecgBpm !== null && !vitals.leadsOff && <EcgTrace bpm={ecgBpm} samples={ecgSamples} />}
      </div>
      <div className="vital">
        <div className="label">Blood oxygen {simulated.optical && <Sim />}</div>
        <div className="value fig"><Figure value={vitals.spo2} unit="% SpO2" /></div>
        <div className="sub">
          {vitals.spo2 === null && !vitals.skinContact ? 'No skin contact' : <>Perfusion <span className="fig"><Figure value={vitals.perfusion} digits={1} /> %</span></>}
        </div>
      </div>
      <div className="vital">
        <div className="label">Heart rate variability</div>
        <div className="value fig"><Figure value={hrvNow} unit="ms" /></div>
        <div className="sub">
          {hrvBaseline === null ? 'Learning your baseline, about 5 min'
            : <>{drop !== null && <span className={`fig${drop <= -20 ? ' watch-text' : ''}`}>{signed(drop)} %</span>} vs your baseline <span className="fig">{hrvBaseline} ms</span></>}
        </div>
      </div>
      <div className="vital">
        <div className="label">Skin temperature {simulated.optical && <Sim />}</div>
        <div className="value fig"><Figure value={vitals.skinTemp} unit="°C" digits={1} /></div>
        <div className="sub">{vitals.skinTempSteadySince ? `Steady since ${vitals.skinTempSteadySince}` : 'Trend, not core temperature'}</div>
      </div>
      <div className="vital">
        <div className="label">Wrist battery {battery.simulated && <Sim />}</div>
        <div className="value fig"><Figure value={battery.percent} unit="%" /></div>
        <div className="sub">{battery.percent === null ? 'Running on USB' : battery.hoursLeft !== null ? `About ${battery.hoursLeft} h left` : 'Charge level'}</div>
      </div>
    </section>
  );
}
