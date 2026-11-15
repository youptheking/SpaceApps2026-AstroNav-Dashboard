import { useWidth } from './useWidth';

interface Props {
  label: string;
  times: string[];
  values: number[];
  yTicks: number[];
  height: number;
  colour?: string;
  tick?: (v: number) => string;
  xLabelEvery?: number;
  reference?: { value: number; label: string };
  annotation?: { index: number; label: string };
}

const PAD_BOTTOM = 26;

export function LineChart({ label, times, values, yTicks, height, colour = 'var(--chart-1)', tick = String, xLabelEvery = 6, reference, annotation }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const padTop = annotation ? 20 : 6;
  const padLeft = 28;
  const lo = yTicks[0] ?? 0;
  const hi = yTicks[yTicks.length - 1] ?? 1;
  const plotW = Math.max(0, width - padLeft - 4);
  const plotH = height - padTop - PAD_BOTTOM;
  const x = (i: number) => padLeft + (i * plotW) / Math.max(1, values.length - 1);
  const y = (v: number) => padTop + plotH - ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * plotH;
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');

  return (
    <div ref={ref} className="line-chart" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label}>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={padLeft} x2={width} y1={y(t)} y2={y(t)} className="grid-line" />
              <text x={padLeft - 8} y={y(t)} dy="0.32em" textAnchor="end" className="axis">{tick(t)}</text>
            </g>
          ))}
          {times.map((t, i) => (i % xLabelEvery === 0 ? (
            <text key={t} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : 'middle'} className="axis">{t}</text>
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
              <text x={x(annotation.index) + 6} y={padTop - 8} className="axis">{annotation.label}</text>
            </g>
          )}
          <path d={path} fill="none" stroke={colour} strokeWidth={2} strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}
