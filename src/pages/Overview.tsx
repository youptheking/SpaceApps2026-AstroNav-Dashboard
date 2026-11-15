import type { Snapshot } from '../types';
import type { Telemetry } from '../lib/useTelemetry';
import { adviceFor } from '../lib/advice';
import { PPCO2_LIMIT, sampleTimes } from '../lib/health';
import { AlertsLog } from '../components/AlertsLog';
import { BodyMap } from '../components/BodyMap';
import { CabinAir } from '../components/CabinAir';
import { CheckIn } from '../components/CheckIn';
import { LinkControl } from '../components/LinkControl';
import { NextStep } from '../components/NextStep';
import { VitalsStrip } from '../components/VitalsStrip';

function finding(s: Snapshot): React.ReactNode {
  const avg = s.cabin.ppco2Hour;
  const co2 = avg === null ? '' : avg <= PPCO2_LIMIT ? ' cabin CO2 is under the NASA limit.' : ' cabin CO2 is above the NASA limit.';
  const open = s.alerts.filter((a) => a.resolution === null && a.severity !== 'info' && a.code !== 10);
  if (s.stressFrom) {
    return <><strong>Stress has been rising since {s.stressFrom}.</strong> {open.length ? `${open.length} other alert${open.length > 1 ? 's' : ''} open, and` : 'Everything else is in range, and'}{co2}</>;
  }
  if (open[0]) return <><strong>{open[0].text}.</strong>{co2 && ` Also,${co2}`}</>;
  return <>Everything is in range{co2 ? `, and${co2}` : '.'}</>;
}

export function Overview({ telemetry, now }: { telemetry: Telemetry; now: string }) {
  const { data } = telemetry;
  const times = sampleTimes(data.seriesStart, data.hrv.length, data.seriesStepMinutes);
  const clock = data.source === 'live' ? data.now : now;

  return (
    <main className="canvas">
      <header className="head">
        <div>
          <p className="scope">{data.crew.name} · {data.crew.role} · {data.crew.location}</p>
          <h1>Health overview</h1>
          <p className="finding">{finding(data)}</p>
        </div>
        <LinkControl telemetry={telemetry} clock={clock} />
      </header>

      <div className="grid">
        <VitalsStrip
          vitals={data.vitals}
          battery={data.battery}
          simulated={data.simulated}
          hrvNow={data.hrvNow}
          hrvBaseline={data.hrvBaseline}
          ecgSamples={telemetry.ecgSamples}
        />
        <BodyMap systems={data.systems} />
        <NextStep
          advice={adviceFor(data)}
          times={times}
          hrv={data.hrv}
          baseline={data.hrvBaseline}
          stressFrom={data.stressFrom}
          onSend={telemetry.sendAlert}
        />
        <CabinAir cabin={data.cabin} simulated={data.simulated} times={times} now={clock} />
        <AlertsLog alerts={data.alerts} onHandled={telemetry.markHandled} />
        <CheckIn data={data.checkIn} />
      </div>
    </main>
  );
}
