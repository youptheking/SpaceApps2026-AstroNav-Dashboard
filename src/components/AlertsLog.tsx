import { useState } from 'react';
import type { AlertEvent } from '../types';

const dot = { info: 'info', warning: 'watch', alarm: 'alert' } as const;

export function AlertsLog({ alerts }: { alerts: AlertEvent[] }) {
  const [handled, setHandled] = useState<Set<number>>(new Set());
  return (
    <section className="card log" aria-labelledby="log-title">
      <div className="card-head">
        <h2 id="log-title">Alerts today</h2>
        <a className="muted" href="#">View all</a>
      </div>
      <table>
        <thead>
          <tr><th>Time</th><th>Event</th><th className="by-cell">Raised by</th><th>State</th></tr>
        </thead>
        <tbody>
          {alerts.map((a, i) => (
            <tr key={`${a.time}-${a.text}`}>
              <td className="time fig">{a.time}</td>
              <td><span className="event"><span className={`dot ${dot[a.severity]}`} />{a.text}</span></td>
              <td className="by-cell muted">{a.raisedBy}</td>
              <td>
                {a.resolution !== null ? <span className="muted">{a.resolution}</span>
                  : handled.has(i) ? <span className="muted">Handled</span>
                  : <button className="textbtn" onClick={() => setHandled(new Set(handled).add(i))}>Mark handled</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
