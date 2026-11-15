import type { CabinAir as Cabin, Simulated } from '../types';
import { niceTicks, PPCO2_LIMIT, signed } from '../lib/health';
import { Figure } from './Figure';
import { LineChart } from './LineChart';

const SCALE_TOP = 3.5;

interface Props {
  cabin: Cabin;
  simulated: Simulated;
  times: string[];
  now: string;
}

export function CabinAir({ cabin, simulated, times, now }: Props) {
  const avg = cabin.ppco2Hour;
  const current = cabin.ppco2Now;
  const pos = (v: number) => `${(Math.min(v, SCALE_TOP) / SCALE_TOP) * 100}%`;
  const hasSeries = cabin.ppco2.some((v) => v !== null);

  return (
    <section className="card cabin" aria-labelledby="cabin-title">
      <div className="card-head">
        <h2 id="cabin-title">Cabin air</h2>
        <span className="muted fig">{now.slice(0, 5)}</span>
      </div>
      <div className="co2">
        <div className="label muted">CO2 partial pressure, 1-hour average {simulated.co2 && <span className="pill sim">Simulated</span>}</div>
        <div className="value fig"><Figure value={avg} unit="mmHg" digits={2} /></div>
        <div className="track" aria-hidden="true">
          {avg !== null && <div className="fill" style={{ width: pos(avg) }} />}
          {current !== null && <div className="now" style={{ left: pos(current) }} title={`Now ${current.toFixed(2)} mmHg`} />}
          <div className="limit" style={{ left: pos(PPCO2_LIMIT) }} />
        </div>
        <div className="scale">
          <span className="fig">0</span>
          <span>NASA limit <span className="fig">{PPCO2_LIMIT.toFixed(1)}</span></span>
        </div>
      </div>
      <div className="chart-head">
        <h3>CO2 since {times[0]}</h3>
        <span className="muted">mmHg</span>
      </div>
      {hasSeries ? (
        <LineChart
          label={`CO2 partial pressure since ${times[0]}, limit ${PPCO2_LIMIT} mmHg`}
          times={times}
          values={cabin.ppco2}
          yTicks={niceTicks([...cabin.ppco2, PPCO2_LIMIT], 0.5)}
          tick={(v) => v.toFixed(1)}
          height={150}
          colour="#bdbdc0"
          xLabels={3}
          reference={{ value: PPCO2_LIMIT, label: 'Limit 3.0' }}
        />
      ) : (
        <p className="empty">Waiting for the first CO2 reading. The sensor measures every 5 seconds.</p>
      )}
      <ul className="kv">
        <li><span>CO2 now</span><span className="fig"><Figure value={current} unit=" mmHg" digits={2} /></span></li>
        <li><span>CO2 concentration</span><span className="fig">{cabin.co2Ppm === null ? '—' : `${cabin.co2Ppm.toLocaleString('en-GB')} ppm`}</span></li>
        <li><span>Cabin pressure {simulated.pressure && <span className="pill sim">Simulated</span>}</span><span className="fig"><Figure value={cabin.pressureKpa} unit=" kPa" digits={1} /></span></li>
        <li><span>Pressure trend</span><span className="fig">{cabin.pressureTrendPaMin === null ? '—' : `${signed(cabin.pressureTrendPaMin)} Pa/min`}</span></li>
        <li><span>Temperature</span><span className="fig"><Figure value={cabin.tempC} unit=" °C" digits={1} /></span></li>
        <li><span>Humidity</span><span className="fig"><Figure value={cabin.humidity} unit=" %" /></span></li>
      </ul>
      <p className="source">Limit from NASA-STD-3001 Vol. 2, V2 6004.</p>
    </section>
  );
}
