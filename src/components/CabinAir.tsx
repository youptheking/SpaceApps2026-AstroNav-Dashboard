import type { CabinAir as Cabin, Simulated } from '../types';
import { niceTicks, PPCO2_LIMIT, signed } from '../lib/health';
import { Figure } from './Figure';
import { LineChart } from './LineChart';
import { Panel } from './Panel';

const SCALE_TOP = 3.5;

interface Props {
  cabin: Cabin;
  simulated: Simulated;
}

const Sim = () => <span className="pill sim">Simulated</span>;

function Readings({ cabin, simulated }: Props) {
  return (
    <ul className="kv">
      <li><span>ppCO2 now</span><span className="fig"><Figure value={cabin.ppco2Now} unit=" mmHg" digits={2} /></span></li>
      <li><span>CO2</span><span className="fig">{cabin.co2Ppm === null ? '—' : `${cabin.co2Ppm.toLocaleString('en-GB')} ppm`}</span></li>
      <li><span>Pressure {simulated.pressure && <Sim />}</span><span className="fig"><Figure value={cabin.pressureKpa} unit=" kPa" digits={1} /></span></li>
      <li><span>dP/dt</span><span className="fig">{cabin.pressureTrendPaMin === null ? '—' : `${signed(cabin.pressureTrendPaMin)} Pa/min`}</span></li>
      <li><span>Temperature</span><span className="fig"><Figure value={cabin.tempC} unit=" °C" digits={1} /></span></li>
      <li><span>Humidity</span><span className="fig"><Figure value={cabin.humidity} unit=" %RH" /></span></li>
    </ul>
  );
}

export function CabinAir({ cabin, simulated, onMore }: Props & { onMore: () => void }) {
  const avg = cabin.ppco2Hour;
  const current = cabin.ppco2Now;
  const pos = (v: number) => `${(Math.min(v, SCALE_TOP) / SCALE_TOP) * 100}%`;
  const over = avg !== null && avg > PPCO2_LIMIT;

  return (
    <Panel title="Cabin air" className="cabin" more="Trend" onMore={onMore}>
      <div className="co2">
        <div className="readout-head"><span>ppCO2, 1 h average</span>{simulated.co2 ? <Sim /> : <span className="unit">mmHg</span>}</div>
        <div className={`readout-value fig${over ? ' over' : ''}`}><Figure value={avg} digits={2} /></div>
        <div className="track" aria-hidden="true">
          {avg !== null && <div className={`fill${over ? ' over' : ''}`} style={{ width: pos(avg) }} />}
          {current !== null && <div className="now" style={{ left: pos(current) }} title={`Now ${current.toFixed(2)} mmHg`} />}
          <div className="limit" style={{ left: pos(PPCO2_LIMIT) }} />
        </div>
        <div className="scale">
          <span className="fig">0</span>
          <span>Limit <span className="fig">{PPCO2_LIMIT.toFixed(1)}</span></span>
        </div>
      </div>
      <Readings cabin={cabin} simulated={simulated} />
    </Panel>
  );
}

export function CabinDetail({ cabin, simulated, times }: Props & { times: string[] }) {
  const hasSeries = cabin.ppco2.some((v) => v !== null);
  return (
    <>
      {hasSeries ? (
        <LineChart
          label={`CO2 partial pressure since ${times[0]}, limit ${PPCO2_LIMIT} mmHg`}
          times={times}
          values={cabin.ppco2}
          yTicks={niceTicks([...cabin.ppco2, PPCO2_LIMIT], 0.5)}
          tick={(v) => v.toFixed(1)}
          height={260}
          colour="var(--co2)"
          xLabels={8}
          reference={{ value: PPCO2_LIMIT, label: 'Limit 3.0 mmHg' }}
        />
      ) : (
        <p className="empty">Waiting for the first CO2 reading. The sensor measures every 5 seconds.</p>
      )}
      <div className="detail-cols">
        <Readings cabin={cabin} simulated={simulated} />
        <div className="explain">
          <p>
            On the ISS, CO2 builds up where the air does not move, for example in a sleeping bag or behind equipment.
            The station&rsquo;s own sensors sit in a few places; this one sits on your wrist, so it measures the air you breathe.
          </p>
          <p className="muted">1-hour limit 3 mmHg from NASA-STD-3001 Vol. 2, V2 6004.</p>
        </div>
      </div>
    </>
  );
}
