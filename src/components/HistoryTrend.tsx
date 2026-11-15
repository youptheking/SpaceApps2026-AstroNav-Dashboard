import { useMemo } from 'react';
import type { HistoryView } from '../lib/useTelemetry';
import { byDay, byHour, type HourSummary } from '../lib/history';
import { niceTicks, PPCO2_LIMIT } from '../lib/health';
import { LineChart } from './LineChart';

// one label per day, at midnight station time (GMT); the other hours stay unlabelled
const labels = (hours: HourSummary[]) =>
  hours.map((h) => (new Date(h.at).getUTCHours() === 0
    ? new Date(h.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
    : ''));

function series(hours: HourSummary[], f: (h: HourSummary) => number | null) {
  return hours.map(f);
}

// a line saying where the week comes from
export function HistorySource({ history }: { history: HistoryView }) {
  if (history.source === 'dummy') {
    return <span className="pill sim" title="Made on this laptop, not measured">Dummy data</span>;
  }
  switch (history.status) {
    case 'loading':
      return <span className="muted">Loading from the watch, {history.received.toLocaleString('en-GB')} of {history.total.toLocaleString('en-GB')} min</span>;
    case 'none':
      return <span className="muted">The watch has no history yet</span>;
    case 'unsupported':
      return <span className="muted">This watch firmware keeps no history</span>;
    default:
      return <span className="muted">From the watch, {history.minutes.length.toLocaleString('en-GB')} min</span>;
  }
}

export function HistoryChart({ history, height }: { history: HistoryView; height?: number }) {
  const hours = useMemo(() => byHour(history.minutes), [history.minutes]);
  const hr = series(hours, (h) => h.hr);
  const real = hr.filter((v): v is number => v !== null);
  if (real.length < 2) {
    return <p className="empty">{history.status === 'loading' ? 'Loading the week from the watch…' : 'No heart-rate history yet. The watch stores a summary every minute.'}</p>;
  }
  return (
    <LineChart
      label="Heart rate per hour, last 7 days"
      times={labels(hours)}
      values={hr}
      yTicks={niceTicks(real, 20)}
      height={height}
      xLabels={hours.length}
      colour="var(--hr, var(--chart-1))"
    />
  );
}

// The full week: four charts and a table per day, NASA-STD-3001 [V2 6001] trend analysis.
export function HistoryDetail({ history }: { history: HistoryView }) {
  const hours = useMemo(() => byHour(history.minutes), [history.minutes]);
  const days = useMemo(() => byDay(history.minutes), [history.minutes]);
  const times = labels(hours);
  const nums = (xs: (number | null)[]) => xs.filter((v): v is number => v !== null);
  const spo2 = series(hours, (h) => h.spo2Min);
  const co2 = series(hours, (h) => h.ppco2Hour);
  const act = series(hours, (h) => h.activity);
  const estimated = history.minutes.some((m) => m.estimated);

  return (
    <div className="history-detail">
      <p className="popup-text">
        <HistorySource history={history} />
        {history.source === 'dummy' && <span>No watch connected: a generated week so you can see how the trends work. Connect the watch for real data.</span>}
        {estimated && <span className="muted">Some minutes were stored before the watch knew the time; their times are estimated.</span>}
      </p>
      <div className="chart-grid">
        <div><h3>Heart rate per hour</h3><HistoryChart history={history} height={150} /></div>
        <div>
          <h3>Lowest SpO2 per hour</h3>
          {nums(spo2).length > 1
            ? <LineChart label="Lowest SpO2 per hour" times={times} values={spo2} yTicks={[88, 92, 96, 100]} height={150} xLabels={times.length} colour="var(--spo2, var(--chart-2))" reference={{ value: 94, label: 'WHO 94 %' }} />
            : <p className="empty">No SpO2 history.</p>}
        </div>
        <div>
          <h3>ppCO2, highest 1-hour average per hour</h3>
          {nums(co2).length > 1
            ? <LineChart label="ppCO2 per hour" times={times} values={co2} yTicks={niceTicks([...nums(co2), PPCO2_LIMIT], 0.5)} height={150} xLabels={times.length} tick={(v) => v.toFixed(1)} reference={{ value: PPCO2_LIMIT, label: 'NASA limit 3 mmHg' }} />
            : <p className="empty">No CO2 history.</p>}
        </div>
        <div>
          <h3>Activity per hour (% of the time moving)</h3>
          {nums(act).length > 1
            ? <LineChart label="Activity per hour" times={times} values={act} yTicks={[0, 25, 50, 75, 100]} height={150} xLabels={times.length} />
            : <p className="empty">No activity history.</p>}
        </div>
      </div>
      <table className="log-table">
        <thead>
          <tr><th>Day</th><th>Avg HR</th><th>Lowest SpO2</th><th>Peak ppCO2</th><th>Active min</th><th>Rest h</th><th>Minutes with an alert</th></tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td className="fig">{d.hrAvg ?? '—'}</td>
              <td className={`fig${d.spo2Min !== null && d.spo2Min < 94 ? ' watch-text' : ''}`}>{d.spo2Min ?? '—'}</td>
              <td className={`fig${d.ppco2Max !== null && d.ppco2Max > PPCO2_LIMIT ? ' watch-text' : ''}`}>{d.ppco2Max?.toFixed(2) ?? '—'}</td>
              <td className="fig">{d.activeMinutes}</td>
              <td className="fig">{d.restHours}</td>
              <td className="fig">{d.alertMinutes}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">The watch stores one summary per minute for 7 days, also without this laptop (NASA-STD-3001 Vol. 2, V2 6001).</p>
    </div>
  );
}
