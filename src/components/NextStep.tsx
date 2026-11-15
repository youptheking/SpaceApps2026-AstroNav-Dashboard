import { useState } from 'react';
import { LineChart } from './LineChart';

interface Props {
  times: string[];
  hrv: number[];
  baseline: number;
  stressFrom: string | null;
}

export function NextStep({ times, hrv, baseline, stressFrom }: Props) {
  const [sent, setSent] = useState(false);
  const stressIndex = stressFrom ? times.indexOf(stressFrom) : -1;

  return (
    <section className="card next" aria-labelledby="next-title">
      <div className="card-head">
        <h2 id="next-title">Next step</h2>
        <span className="muted">Advice, not a diagnosis</span>
      </div>
      <div className="advice">
        <div className="what">Take a 2-minute breathing break</div>
        <div className="why">
          Your HRV has dropped for almost four hours while you were at rest, and your skin conductance is up.
          Slow breathing usually brings HRV back within 15 minutes.
        </div>
        <div className="actions">
          <button className="btn primary" disabled={sent} onClick={() => setSent(true)}>
            {sent ? 'Sent to wrist' : 'Start on wrist'}
          </button>
          <button className="btn">Remind me in 30 min</button>
        </div>
      </div>
      <div className="chart-head">
        <h3>HRV today, against your baseline</h3>
        <div className="range" role="group" aria-label="Period">
          <button aria-pressed="true">Today</button>
          <button aria-pressed="false">7 days</button>
        </div>
      </div>
      <LineChart
        label={`HRV every 10 minutes since ${times[0]}, baseline ${baseline} ms`}
        times={times}
        values={hrv}
        yTicks={[20, 30, 40, 50, 60]}
        height={250}
        reference={{ value: baseline, label: `Your baseline ${baseline} ms` }}
        annotation={stressIndex >= 0 ? { index: stressIndex, label: 'Stress trend starts' } : undefined}
      />
    </section>
  );
}
