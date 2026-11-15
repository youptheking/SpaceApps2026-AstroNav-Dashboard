import type { Series } from '../types';
import { niceTicks } from '../lib/health';
import { LineChart } from './LineChart';

interface Props {
  times: string[];
  hrv: Series;
  baseline: number | null;
  stressFrom: string | null;
  height?: number;
  xLabels?: number;
}

export function HrvChart({ times, hrv, baseline, stressFrom, height, xLabels }: Props) {
  const stressIndex = stressFrom ? times.indexOf(stressFrom) : -1;
  const real = hrv.filter((v): v is number => v !== null);
  if (real.length === 0) return <p className="empty">No beats yet. HRV needs the chest electrodes of the ECG.</p>;

  const spread = Math.max(...real, baseline ?? 0) - Math.min(...real, baseline ?? Infinity);
  return (
    <LineChart
      label={`HRV since ${times[0]}${baseline !== null ? `, baseline ${baseline} ms` : ''}`}
      times={times}
      values={hrv}
      yTicks={niceTicks([...real, baseline], spread > 60 ? 20 : 10)}
      height={height}
      xLabels={xLabels}
      colour="var(--hrv)"
      reference={baseline !== null ? { value: baseline, label: `Baseline ${baseline} ms` } : undefined}
      annotation={stressIndex >= 0 ? { index: stressIndex, label: 'Stress trend starts' } : undefined}
    />
  );
}

export function HrvDetail(props: Props) {
  return (
    <>
      <HrvChart {...props} height={300} xLabels={8} />
      <div className="explain cols">
        <p>
          HRV is the variation between heartbeats (RMSSD), from the chest ECG. It drops with stress, poor sleep and illness,
          so the console compares it with your own baseline from the first minutes after connecting, not with a norm.
        </p>
        <p>
          A drop of 20 % or more that lasts, together with higher skin conductance, starts a stress trend. Slow breathing for
          two minutes usually brings it back within 15 minutes.
        </p>
      </div>
    </>
  );
}
