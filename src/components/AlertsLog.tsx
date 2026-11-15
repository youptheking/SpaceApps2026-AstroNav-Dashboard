import type { AlertEvent } from '../types';
import { cwClass } from './Annunciators';
import { Panel } from './Panel';

interface Props {
  alerts: AlertEvent[];
  handled: Set<string>;
}

const stateOf = (a: AlertEvent, handled: Set<string>) =>
  a.resolution !== null ? a.resolution : handled.has(a.id) ? 'Handled' : null;

// the last few events on the console; the full log is in a popup
export function EventLog({ alerts, handled, onMore }: Props & { onMore: () => void }) {
  const rows = alerts.slice(0, 5);
  const open = alerts.filter((a) => stateOf(a, handled) === null).length;

  return (
    <Panel title="Events" className="log" meta={open ? `${open} open` : `${alerts.length} today`} more="All events" onMore={onMore}>
      {rows.length === 0 ? (
        <p className="empty">No events since connecting. The watch raises them on its own, also without this laptop.</p>
      ) : (
        <ol className="events">
          {rows.map((a) => {
            const state = stateOf(a, handled);
            return (
              <li key={a.id} className={state === null ? 'open' : ''}>
                <span className="fig time">{a.time}</span>
                <span className={`tag ${a.code === null ? 'note' : cwClass(a)}`}>{a.code === null ? 'Note' : cwClass(a)}</span>
                <span className="text">{a.text}</span>
                <span className="state">{state === null ? 'Open' : state || '—'}</span>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

export function AlertsLog({ alerts, handled, onHandled }: Props & { onHandled: (id: string, code: number | null) => void }) {
  if (alerts.length === 0) {
    return <p className="empty">No events since connecting. The watch raises them on its own, also without this laptop.</p>;
  }
  return (
    <table className="log-table">
      <thead>
        <tr><th>Time</th><th>Class</th><th>Event</th><th>Raised by</th><th>State</th></tr>
      </thead>
      <tbody>
        {alerts.map((a) => {
          const state = stateOf(a, handled);
          return (
            <tr key={a.id}>
              <td className="fig muted">{a.time}</td>
              <td><span className={`tag ${a.code === null ? 'note' : cwClass(a)}`}>{a.code === null ? 'Note' : cwClass(a)}</span></td>
              <td>{a.text}</td>
              <td className="muted">{a.raisedBy}</td>
              <td>
                {state !== null ? <span className="muted">{state || '—'}</span> : (
                  <button className="btn small" onClick={() => onHandled(a.id, a.code)}>Mark handled</button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
