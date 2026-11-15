import { useState } from 'react';
import type { AlertEvent } from '../types';

const dot = { info: 'info', warning: 'watch', alarm: 'alert' } as const;

interface Props {
  alerts: AlertEvent[];
  onHandled: (id: string, code: number | null) => void;
}

export function AlertsLog({ alerts, onHandled }: Props) {
  // handled here right away, so the row changes before the next update from the watch
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const rows = alerts.slice(0, 6);

  return (
    <section className="card log" aria-labelledby="log-title">
      <div className="card-head">
        <h2 id="log-title">Alerts today</h2>
        <span className="muted">{alerts.length === 0 ? 'None yet' : `${alerts.length} in total`}</span>
      </div>
      {rows.length === 0 ? (
        <p className="empty">No alerts since connecting. The watch raises them on its own, also without this laptop.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Time</th><th>Event</th><th className="by-cell">Raised by</th><th>State</th></tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="time fig">{a.time}</td>
                <td><span className="event"><span className={`dot ${dot[a.severity]}`} />{a.text}</span></td>
                <td className="by-cell muted">{a.raisedBy}</td>
                <td>
                  {a.resolution !== null ? <span className="muted">{a.resolution}</span>
                    : handled.has(a.id) ? <span className="muted">Handled</span>
                    : (
                      <button className="textbtn" onClick={() => { setHandled(new Set(handled).add(a.id)); onHandled(a.id, a.code); }}>
                        Mark handled
                      </button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
