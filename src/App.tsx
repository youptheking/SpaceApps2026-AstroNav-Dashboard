import { useEffect, useState } from 'react';
import { Rail } from './components/Rail';
import { Overview } from './pages/Overview';
import { sample } from './data/sample';
import { toMinutes } from './lib/health';

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
  // demo clock runs on from the sample's time until the wrist station supplies real time
  const now = useClock(sample.now);
  const openAlerts = sample.alerts.filter((a) => a.resolution === null).length;

  return (
    <div className="app">
      <Rail openAlerts={openAlerts} />
      <Overview data={sample} now={now} />
    </div>
  );
}
