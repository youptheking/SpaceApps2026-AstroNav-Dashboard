import { useEffect, useState } from 'react';
import { Overview } from './pages/Overview';
import { sample } from './data/sample';
import { toMinutes } from './lib/health';
import { useTelemetry } from './lib/useTelemetry';
import { useCrew } from './lib/useCrew';
import { useCheckIn } from './lib/checkin';

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

const dayOfYear = (d: Date) => Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000) + 1;

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// station time is GMT, written as day of the year and time of day
function gmtOf(now: Date, sampleSeconds: number | null): string {
  const secs = sampleSeconds ?? now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  return `${pad(dayOfYear(now), 3)}/${pad(Math.floor(secs / 3600) % 24)}:${pad(Math.floor(secs / 60) % 60)}:${pad(secs % 60)}`;
}

export default function App() {
  const real = useTelemetry();
  const crew = useCrew(real);
  const checkIn = useCheckIn(crew.selected);
  // the check-in belongs to the crew member, not to the watch: the same with or without it
  const telemetry = { ...crew.telemetry, data: { ...crew.telemetry.data, checkIn: checkIn.data } };
  const now = useNow();
  const [opened] = useState(() => Date.now());
  // the sample screen runs its own clock from the time in the sample, so its charts line up
  const sampleSeconds = toMinutes(sample.now) * 60 + Number(sample.now.split(':')[2] ?? 0) + Math.floor((now.getTime() - opened) / 1000);
  const gmt = gmtOf(now, telemetry.data.source === 'sample' ? sampleSeconds : null);

  // a fresh console per crew member: their own popups, handled marks and silenced alerts
  return <Overview key={crew.selected.id} telemetry={telemetry} gmt={gmt} crew={crew} onSaveCheckIn={checkIn.save} />;
}
