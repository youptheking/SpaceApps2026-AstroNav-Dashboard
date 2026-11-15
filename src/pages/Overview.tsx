import type { Snapshot } from '../types';
import { hourAverage, PPCO2_LIMIT, sampleTimes } from '../lib/health';
import { AlertsLog } from '../components/AlertsLog';
import { BodyMap } from '../components/BodyMap';
import { CabinAir } from '../components/CabinAir';
import { CheckIn } from '../components/CheckIn';
import { NextStep } from '../components/NextStep';
import { VitalsStrip } from '../components/VitalsStrip';

function finding(s: Snapshot, co2Avg: number | null): React.ReactNode {
  const co2 = co2Avg === null ? '' : co2Avg < PPCO2_LIMIT ? ' cabin CO2 is under the NASA limit.' : ' cabin CO2 is above the NASA limit.';
  if (s.stressFrom) {
    return <><strong>Stress has been rising since {s.stressFrom}.</strong> Everything else is in range, and{co2}</>;
  }
  return <>Everything is in range, and{co2}</>;
}

export function Overview({ data, now }: { data: Snapshot; now: string }) {
  const times = sampleTimes(data.seriesStart, data.hrv.length);
  const co2Avg = data.cabin.ppco2.length ? hourAverage(data.cabin.ppco2) : null;

  return (
    <main className="canvas">
      <header className="head">
        <div>
          <p className="scope">{data.crew.name} · {data.crew.role} · {data.crew.location}</p>
          <h1>Health overview</h1>
          <p className="finding">{finding(data, co2Avg)}</p>
        </div>
        <div className="link">
          {data.demoMode && <span className="pill sim" title="Values marked Simulated are filled in by the wrist station, not measured">Demo mode</span>}
          <span className="conn">
            <span className={`dot ${data.connected ? 'ok' : 'info'}`} />
            {data.connected ? data.deviceName : 'Wrist station not connected'}
            <span className="fig">{now}</span>
          </span>
        </div>
      </header>

      <div className="grid">
        <VitalsStrip vitals={data.vitals} battery={data.battery} hrvNow={data.hrv.at(-1) ?? null} hrvBaseline={data.hrvBaseline} />
        <BodyMap systems={data.systems} />
        <NextStep times={times} hrv={data.hrv} baseline={data.hrvBaseline} stressFrom={data.stressFrom} />
        <CabinAir cabin={data.cabin} times={times} now={now} />
        <AlertsLog alerts={data.alerts} />
        <CheckIn data={data.checkIn} />
      </div>
    </main>
  );
}
