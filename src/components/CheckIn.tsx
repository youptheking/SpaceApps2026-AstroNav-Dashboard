import type { CheckIn as Data } from '../types';
import { hoursMinutes } from '../lib/health';

export function CheckIn({ data }: { data: Data }) {
  const streak = data.lastDays.length - 1 - data.lastDays.lastIndexOf(false);
  const shortSleep = data.sleepMinutes !== null && data.sleepMinutes < data.sleepGoalMinutes;

  return (
    <section className="card checkin" aria-labelledby="check-title">
      <div className="card-head">
        <h2 id="check-title">Daily check-in</h2>
        <span className="muted">{data.doneAt ? <>Done at <span className="fig">{data.doneAt}</span></> : 'Not done yet today'}</span>
      </div>
      <div className="cells">
        <div>
          <div className="label">Sleep</div>
          <div className="value fig">{data.sleepMinutes === null ? '—' : <>{hoursMinutes(data.sleepMinutes)}<small>h</small></>}</div>
          <div className={`note${shortSleep ? ' watch-text' : ''}`}>
            {shortSleep ? `Under the ${data.sleepGoalMinutes / 60} h you aim for` : 'On target'}
          </div>
        </div>
        <div>
          <div className="label">Mood</div>
          <div className="value fig">{data.mood ?? '—'}<small>of 5</small></div>
          <div className="note">“{data.moodNote}”</div>
        </div>
        <div>
          <div className="label">Blood pressure</div>
          <div className="value fig">
            {data.systolic && data.diastolic ? <>{data.systolic}/{data.diastolic}<small>mmHg</small></> : '—'}
          </div>
          <div className="note">Again at <span className="fig">{data.nextBloodPressure}</span></div>
        </div>
        <div>
          <div className="label">Blood glucose</div>
          <div className="value fig">{data.glucose ?? '—'}<small>mg/dL</small></div>
          <div className="note">{data.glucoseNote}</div>
        </div>
      </div>
      <div className="streak">
        <div><span className="fig">{streak}</span> days in a row</div>
        <div className="days" aria-label={`Last ${data.lastDays.length} days, ${data.lastDays.filter(Boolean).length} check-ins done`}>
          {data.lastDays.map((done, i) => (
            <span key={i} className={i === data.lastDays.length - 1 ? 'today' : done ? 'done' : ''} />
          ))}
        </div>
      </div>
    </section>
  );
}
