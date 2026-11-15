import type { ReactNode } from 'react';
import type { CheckIn as Data } from '../types';
import { hoursMinutes } from '../lib/health';

const streakOf = (data: Data) => data.lastDays.length - 1 - data.lastDays.lastIndexOf(false);

// one line along the foot of the console
export function CheckInBar({ data, onOpen, end }: { data: Data; onOpen: () => void; end?: ReactNode }) {
  const shortSleep = data.sleepMinutes !== null && data.sleepMinutes < data.sleepGoalMinutes;
  return (
    <footer className="foot">
      <button className="foot-checkin" onClick={onOpen} aria-label="Open the daily check-in">
        <span>Check-in</span>
        <span>{data.doneAt ? <>Done <span className="fig">{data.doneAt}</span></> : <span className="watch-text">Not done yet</span>}</span>
        <span><span className="k">Sleep</span> <span className={`fig${shortSleep ? ' watch-text' : ''}`}>{data.sleepMinutes === null ? '—' : `${hoursMinutes(data.sleepMinutes)} h`}</span></span>
        <span><span className="k">Mood</span> <span className="fig">{data.mood ?? '—'}/5</span></span>
        <span><span className="k">BP</span> <span className="fig">{data.systolic && data.diastolic ? `${data.systolic}/${data.diastolic}` : '—'}</span></span>
        <span><span className="k">Glucose</span> <span className="fig">{data.glucose ?? '—'}</span></span>
        <span><span className="fig">{streakOf(data)}</span> days in a row</span>
      </button>
      <span className="foot-note">Limits from NASA-STD-3001 Vol. 2 &middot; Advice, not a diagnosis</span>
      {end}
    </footer>
  );
}

export function CheckIn({ data }: { data: Data }) {
  const shortSleep = data.sleepMinutes !== null && data.sleepMinutes < data.sleepGoalMinutes;

  return (
    <div className="checkin">
      <p className="muted">{data.doneAt ? <>Done at <span className="fig">{data.doneAt}</span></> : 'Not done yet today'}</p>
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
          <div className="note">&ldquo;{data.moodNote}&rdquo;</div>
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
        <div><span className="fig">{streakOf(data)}</span> days in a row</div>
        <div className="days" aria-label={`Last ${data.lastDays.length} days, ${data.lastDays.filter(Boolean).length} check-ins done`}>
          {data.lastDays.map((done, i) => (
            <span key={i} className={i === data.lastDays.length - 1 ? 'today' : done ? 'done' : ''} />
          ))}
        </div>
      </div>
    </div>
  );
}
