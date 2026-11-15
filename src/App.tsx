import { useEffect, useState } from 'react';
import { Rail } from './components/Rail';
import { Overview } from './pages/Overview';
import { sample } from './data/sample';
import { toMinutes } from './lib/health';
import { useTelemetry } from './lib/useTelemetry';

const pad = (n: number) => String(n).padStart(2, '0');

function useClock(start: string) {
  const [secs, setSecs] = useState(() => toMinutes(start) * 60 + Number(start.split(':')[2] ?? 0));
  useEffect(() => {
    const id = setInterval(() => setSecs((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return `${pad(Math.floor(secs / 3600) % 24)}:${pad(Math.floor(secs / 60) % 60)}:${pad(secs % 60)}`;
}

export default function App() {
  const telemetry = useTelemetry();
  // the sample screen keeps its own clock running; live data carries the laptop's time
  const now = useClock(sample.now);
  const openAlerts = telemetry.data.alerts.filter((a) => a.resolution === null).length;

  return (
    <div className="app">
      <Rail openAlerts={openAlerts} />
      <Overview telemetry={telemetry} now={now} />
    </div>
  );
}
