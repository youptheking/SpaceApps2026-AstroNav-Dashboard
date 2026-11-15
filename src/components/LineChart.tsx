import type { Series } from '../types';
import { useWidth } from './useWidth';

interface Props {
  label: string;
  times: string[];
  values: Series;
  yTicks: number[];
  // without a height the chart fills its container
  height?: number;
  colour?: string;
  tick?: (v: number) => string;
  xLabels?: number;
  reference?: { value: number; label: string };
  annotation?: { index: number; label: string };
}

const PAD_BOTTOM = 26;

// a straight-segment line; a null value breaks the line instead of inventing one
function pathOf(values: Series, x: (i: number) => number, y: (v: number) => number): string {
  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (v === null) { pen = false; return; }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

export function LineChart({ label, times, values, yTicks, height: fixed, colour = 'var(--chart-1)', tick = String, xLabels = 7, reference, annotation }: Props) {
  const [ref, width, measured] = useWidth<HTMLDivElement>();
  const height = fixed ?? measured;
  const padTop = annotation ? 20 : 6;
  const padLeft = 28;
  const lo = yTicks[0] ?? 0;
  const hi = yTicks[yTicks.length - 1] ?? 1;
  const plotW = Math.max(0, width - padLeft - 4);
  const plotH = height - padTop - PAD_BOTTOM;
  const x = (i: number) => padLeft + (i * plotW) / Math.max(1, values.length - 1);
  const y = (v: number) => padTop + plotH - ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * plotH;
  const every = Math.max(1, Math.ceil(times.length / xLabels));
  const single = values.filter((v) => v !== null).length === 1 ? values.findIndex((v) => v !== null) : -1;

  return (
    <div ref={ref} className={`line-chart${fixed ? '' : ' fill'}`} style={fixed ? { height: fixed } : undefined}>
      {width > 0 && height > 40 && (
        <svg width={width} height={height} role="img" aria-label={label}>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={padLeft} x2={width} y1={y(t)} y2={y(t)} className="grid-line" />
              <text x={padLeft - 8} y={y(t)} dy="0.32em" textAnchor="end" className="axis">{tick(t)}</text>
            </g>
          ))}
          {times.map((t, i) => (i % every === 0 ? (
            <text key={`${t}-${i}`} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : 'middle'} className="axis">{t}</text>
          ) : null))}
          {reference && (
            <g>
              <line x1={padLeft} x2={width} y1={y(reference.value)} y2={y(reference.value)} className="ref-line" />
              <text x={width - 2} y={y(reference.value) - 6} textAnchor="end" className="axis">{reference.label}</text>
            </g>
          )}
          {annotation && (
            <g>
              <line x1={x(annotation.index)} x2={x(annotation.index)} y1={padTop - 6} y2={padTop + plotH} className="mark-line" />
              {/* near the right edge the label goes on the left of the line */}
              {x(annotation.index) > width * 0.7
                ? <text x={x(annotation.index) - 6} y={padTop - 8} textAnchor="end" className="axis">{annotation.label}</text>
                : <text x={x(annotation.index) + 6} y={padTop - 8} className="axis">{annotation.label}</text>}
            </g>
          )}
          <path d={pathOf(values, x, y)} fill="none" stroke={colour} strokeWidth={2} strokeLinejoin="round" />
          {single >= 0 && <circle cx={x(single)} cy={y(values[single]!)} r={2.5} fill={colour} />}
        </svg>
      )}
    </div>
  );
}
