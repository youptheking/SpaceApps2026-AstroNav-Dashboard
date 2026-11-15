export const PPCO2_LIMIT = 3.0; // mmHg, 1-hour average, NASA-STD-3001 V2 6004
export const SAMPLE_MINUTES = 10;

export function average(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// one-hour rolling average over 10-minute samples
export function hourAverage(samples: number[]): number {
  return average(samples.slice(-60 / SAMPLE_MINUTES));
}

export function percentFromBaseline(value: number, baseline: number): number {
  return Math.round(((value - baseline) / baseline) * 100);
}

export function toMinutes(clock: string): number {
  const [h, m] = clock.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function clock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function sampleTimes(start: string, count: number): string[] {
  const first = toMinutes(start);
  return Array.from({ length: count }, (_, i) => clock(first + i * SAMPLE_MINUTES));
}

export function signed(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return '0';
}

export function hoursMinutes(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}
