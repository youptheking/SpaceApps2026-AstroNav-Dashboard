import { useState, type ReactNode } from 'react';
import type { CheckIn as Data } from '../types';
import { hoursMinutes } from '../lib/health';
import type { CheckInEntry } from '../lib/checkin';

const streakOf = (data: Data) => {
  // today counts once it is done; before that the streak runs up to yesterday
  const days = data.doneAt ? data.lastDays : data.lastDays.slice(0, -1);
  const last = days.lastIndexOf(false);
  return days.length - 1 - last;
};

const daysText = (n: number) => `${n} day${n === 1 ? '' : 's'} in a row`;

const Example = () => <span className="pill sim" title="Example values, not filled in by anyone">Example</span>;

// one line along the foot of the console
export function CheckInBar({ data, onOpen, end }: { data: Data; onOpen: () => void; end?: ReactNode }) {
  const shortSleep = data.sleepMinutes !== null && data.sleepMinutes < data.sleepGoalMinutes;
  return (
    <footer className="foot">
      <button className="foot-checkin" onClick={onOpen} aria-label="Open the daily check-in">
        <span>Check-in</span>
        {data.dummy && <Example />}
        <span>{data.doneAt ? <>Done <span className="fig">{data.doneAt}</span></> : <span className="watch-text">Not done yet, click to fill in</span>}</span>
        {data.doneAt && <>
          <span><span className="k">Sleep</span> <span className={`fig${shortSleep ? ' watch-text' : ''}`}>{data.sleepMinutes === null ? '—' : `${hoursMinutes(data.sleepMinutes)} h`}</span></span>
          <span><span className="k">Mood</span> <span className="fig">{data.mood ?? '—'}/5</span></span>
          {data.systolic && data.diastolic && <span><span className="k">BP</span> <span className="fig">{`${data.systolic}/${data.diastolic}`}</span></span>}
          {data.glucose && <span><span className="k">Glucose</span> <span className="fig">{data.glucose}</span></span>}
        </>}
        <span className="fig">{daysText(streakOf(data))}</span>
      </button>
      <span className="foot-note">Limits from NASA-STD-3001 Vol. 2 &middot; Advice, not a diagnosis</span>
      {end}
    </footer>
  );
}

const MOOD = ['', 'Very low', 'Low', 'OK', 'Good', 'Very good'];

const num = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? null : Number(v));

// The check-in form. Sleep and mood tie to the NASA HRP risks of inadequate sleep and of behavioural changes.
export function CheckIn({ data, onSave }: { data: Data; onSave: (entry: CheckInEntry) => void }) {
  const [editing, setEditing] = useState(data.doneAt === null || !!data.dummy);
  const [hours, setHours] = useState(data.sleepMinutes !== null ? String(Math.floor(data.sleepMinutes / 60)) : '');
  const [mins, setMins] = useState(data.sleepMinutes !== null ? String(data.sleepMinutes % 60) : '');
  const [mood, setMood] = useState<number | null>(data.mood);
  const [note, setNote] = useState(data.moodNote);
  const [sys, setSys] = useState(data.systolic ? String(data.systolic) : '');
  const [dia, setDia] = useState(data.diastolic ? String(data.diastolic) : '');
  const [glucose, setGlucose] = useState(data.glucose ? String(data.glucose) : '');

  const h = num(hours);
  const m = num(mins) ?? 0;
  const sleepMinutes = h === null ? null : Math.round(h * 60 + m);
  const sleepOk = sleepMinutes === null || (sleepMinutes >= 0 && sleepMinutes <= 24 * 60);
  const canSave = mood !== null && sleepMinutes !== null && sleepOk;

  const save = () => {
    const now = new Date();
    onSave({
      doneAt: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      sleepMinutes,
      mood,
      moodNote: note.trim(),
      systolic: num(sys),
      diastolic: num(dia),
      glucose: num(glucose),
    });
    setEditing(false);
  };

  if (!editing) {
    const shortSleep = data.sleepMinutes !== null && data.sleepMinutes < data.sleepGoalMinutes;
    return (
      <div className="checkin">
        <p className="muted">Done at <span className="fig">{data.doneAt}</span></p>
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
            <div className="note">{data.moodNote ? <>&ldquo;{data.moodNote}&rdquo;</> : MOOD[data.mood ?? 0]}</div>
          </div>
          <div>
            <div className="label">Blood pressure</div>
            <div className="value fig">{data.systolic && data.diastolic ? <>{data.systolic}/{data.diastolic}<small>mmHg</small></> : '—'}</div>
            <div className="note">Optional, from the station&rsquo;s cuff</div>
          </div>
          <div>
            <div className="label">Blood glucose</div>
            <div className="value fig">{data.glucose ?? '—'}<small>mg/dL</small></div>
            <div className="note">Optional</div>
          </div>
        </div>
        <div className="streak">
          <div className="fig">{daysText(streakOf(data))}</div>
          <div className="days" aria-label={`Last ${data.lastDays.length} days, ${data.lastDays.filter(Boolean).length} check-ins done`}>
            {data.lastDays.map((done, i) => (
              <span key={i} className={i === data.lastDays.length - 1 ? (done ? 'done' : 'today') : done ? 'done' : ''} />
            ))}
          </div>
        </div>
        <div className="form-actions"><button className="btn small" onClick={() => setEditing(true)}>Edit</button></div>
      </div>
    );
  }

  return (
    <form className="checkin-form" onSubmit={(e) => { e.preventDefault(); if (canSave) save(); }}>
      {data.dummy && (
        <p className="notice sim">These are example values. Fill in your own to replace them.</p>
      )}
      <p className="muted">How did you sleep and how do you feel? Takes half a minute. Sleep and mood are two of the risks NASA&rsquo;s Human Research Program tracks on long missions.</p>

      <fieldset>
        <legend>Sleep last night</legend>
        <label>
          <input inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} aria-label="Hours of sleep" placeholder="7" />
          <span>h</span>
        </label>
        <label>
          <input inputMode="numeric" value={mins} onChange={(e) => setMins(e.target.value)} aria-label="Minutes of sleep" placeholder="0" />
          <span>min</span>
        </label>
        {!sleepOk && <span className="watch-text">Between 0 and 24 hours</span>}
      </fieldset>

      <fieldset>
        <legend>Mood</legend>
        <div className="mood" role="radiogroup" aria-label="Mood from 1 to 5">
          {[1, 2, 3, 4, 5].map((v) => (
            <button type="button" key={v} role="radio" aria-checked={mood === v} aria-label={`${v}, ${MOOD[v]}`} onClick={() => setMood(v)}>
              <span className="fig">{v}</span>
              <small>{MOOD[v]}</small>
            </button>
          ))}
        </div>
        <input className="wide" value={note} onChange={(e) => setNote(e.target.value)} placeholder="A word about how you feel (optional)" aria-label="Note on mood" maxLength={80} />
      </fieldset>

      <fieldset>
        <legend>Optional</legend>
        <label>
          <span className="k">Blood pressure</span>
          <input inputMode="numeric" value={sys} onChange={(e) => setSys(e.target.value)} aria-label="Systolic" placeholder="120" />
          <span>/</span>
          <input inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value)} aria-label="Diastolic" placeholder="80" />
          <span>mmHg</span>
        </label>
        <label>
          <span className="k">Glucose</span>
          <input inputMode="numeric" value={glucose} onChange={(e) => setGlucose(e.target.value)} aria-label="Blood glucose" placeholder="95" />
          <span>mg/dL</span>
        </label>
      </fieldset>

      <div className="form-actions">
        {data.doneAt && !data.dummy && <button type="button" className="btn small" onClick={() => setEditing(false)}>Cancel</button>}
        <button type="submit" className="btn primary" disabled={!canSave}>Save check-in</button>
      </div>
    </form>
  );
}
