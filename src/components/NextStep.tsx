import { useEffect, useState } from 'react';
import type { Series } from '../types';
import type { Advice } from '../lib/advice';
import { niceTicks } from '../lib/health';
import { LineChart } from './LineChart';

interface Props {
  advice: Advice;
  times: string[];
  hrv: Series;
  baseline: number | null;
  stressFrom: string | null;
  onSend: (code: number, severity: number, messageId: number) => Promise<boolean>;
}

export function NextStep({ advice, times, hrv, baseline, stressFrom, onSend }: Props) {
  const [sent, setSent] = useState<string | null>(null);
  const stressIndex = stressFrom ? times.indexOf(stressFrom) : -1;
  const real = hrv.filter((v): v is number => v !== null);
  const spread = Math.max(...real, baseline ?? 0) - Math.min(...real, baseline ?? Infinity);
  const ticks = niceTicks([...real, baseline], spread > 60 ? 20 : 10);

  // a new piece of advice can be sent again
  useEffect(() => setSent(null), [advice.title]);

  const send = async () => {
    if (!advice.wrist) return;
    const ok = await onSend(advice.wrist.code, advice.wrist.severity, advice.wrist.messageId);
    if (ok) setSent(advice.title);
  };

  return (
    <section className="card next" aria-labelledby="next-title">
      <div className="card-head">
        <h2 id="next-title">Next step</h2>
        <span className="muted">Advice, not a diagnosis</span>
      </div>
      <div className="advice">
        <div className="what">{advice.title}</div>
        <div className="why">{advice.why}</div>
        {advice.wrist && (
          <div className="actions">
            <button className="btn primary" disabled={sent === advice.title} onClick={send}>
              {sent === advice.title ? 'Sent to wrist' : advice.wrist.label}
            </button>
            <button className="btn">Remind me in 30 min</button>
          </div>
        )}
      </div>
      <div className="chart-head">
        <h3>HRV {baseline !== null ? 'against your baseline' : 'since connecting'}</h3>
        <div className="range" role="group" aria-label="Period">
          <button aria-pressed="true">Today</button>
          <button aria-pressed="false">7 days</button>
        </div>
      </div>
      {real.length === 0 ? (
        <p className="empty">No beats yet. HRV needs the chest electrodes of the ECG.</p>
      ) : (
        <LineChart
          label={`HRV since ${times[0]}${baseline !== null ? `, baseline ${baseline} ms` : ''}`}
          times={times}
          values={hrv}
          yTicks={ticks}
          height={250}
          reference={baseline !== null ? { value: baseline, label: `Your baseline ${baseline} ms` } : undefined}
          annotation={stressIndex >= 0 ? { index: stressIndex, label: 'Stress trend starts' } : undefined}
        />
      )}
    </section>
  );
}
