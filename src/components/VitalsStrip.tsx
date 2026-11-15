import type { Battery, Vitals } from '../types';
import { percentFromBaseline, signed } from '../lib/health';
import { EcgTrace } from './EcgTrace';
import { Figure } from './Figure';

interface Props {
  vitals: Vitals;
  battery: Battery;
  hrvNow: number | null;
  hrvBaseline: number;
}

export function VitalsStrip({ vitals, battery, hrvNow, hrvBaseline }: Props) {
  const drop = hrvNow === null ? null : percentFromBaseline(hrvNow, hrvBaseline);
  return (
    <section className="card vitals" aria-label="Vital signs, now">
      <div className="vital heart">
        <div>
          <div className="label">Heart rate</div>
          <div className="value fig"><Figure value={vitals.hrPpg} unit="bpm" /></div>
          <div className="sub">
            ECG <span className="fig">{vitals.hrEcg ?? '—'}</span>
            {vitals.hrEcg !== null && ` · rhythm ${vitals.rhythmRegular ? 'regular' : 'irregular'}`}
          </div>
        </div>
        {vitals.hrEcg !== null && <EcgTrace bpm={vitals.hrEcg} />}
      </div>
      <div className="vital">
        <div className="label">Blood oxygen</div>
        <div className="value fig"><Figure value={vitals.spo2} unit="% SpO2" /></div>
        <div className="sub">Perfusion <span className="fig"><Figure value={vitals.perfusion} digits={1} /> %</span></div>
      </div>
      <div className="vital">
        <div className="label">Heart rate variability</div>
        <div className="value fig"><Figure value={hrvNow} unit="ms" /></div>
        <div className="sub">
          {drop !== null && <span className={`fig${drop <= -20 ? ' watch-text' : ''}`}>{signed(drop)} %</span>} vs your baseline <span className="fig">{hrvBaseline} ms</span>
        </div>
      </div>
      <div className="vital">
        <div className="label">Skin temperature</div>
        <div className="value fig"><Figure value={vitals.skinTemp} unit="°C" digits={1} /></div>
        <div className="sub">{vitals.skinTempSteadySince ? `Steady since ${vitals.skinTempSteadySince}` : 'Trend, not core temperature'}</div>
      </div>
      <div className="vital">
        <div className="label">Wrist battery {battery.simulated && <span className="pill sim">Simulated</span>}</div>
        <div className="value fig"><Figure value={battery.percent} unit="%" /></div>
        <div className="sub">{battery.hoursLeft !== null ? `About ${battery.hoursLeft} h left` : 'Running on USB'}</div>
      </div>
    </section>
  );
}
