import type { Series } from '../types';

export const PPCO2_LIMIT = 3.0; // mmHg, 1-hour average, NASA-STD-3001 V2 6004

// WHO Pulse Oximetry Training Manual (WHO/Lifebox, 2011), p. 12: healthy patients 95 % or above;
// "If SpO2 is 94% or below, the patient must be assessed quickly"; "SpO2 of < 90% is a clinical emergency"
export const SPO2_WARN_AT_OR_BELOW = 94;
export const SPO2_ALARM_BELOW = 90;

export function spo2Level(spo2: number | null): 'ok' | 'warning' | 'alarm' {
  if (spo2 === null) return 'ok';
  if (spo2 < SPO2_ALARM_BELOW) return 'alarm';
  return spo2 <= SPO2_WARN_AT_OR_BELOW ? 'warning' : 'ok';
}

export function average(values: Series): number | null {
  const real = values.filter((v): v is number => v !== null);
  if (real.length === 0) return null;
  return real.reduce((a, b) => a + b, 0) / real.length;
}

// one-hour average of a series with the given step
export function hourAverage(samples: Series, stepMinutes: number): number | null {
  return average(samples.slice(-Math.round(60 / stepMinutes)));
}

// root mean square of successive differences between beats, the usual short-term HRV measure
export function rmssd(intervalsMs: number[]): number | null {
  if (intervalsMs.length < 3) return null;
  let sum = 0;
  for (let i = 1; i < intervalsMs.length; i++) sum += (intervalsMs[i]! - intervalsMs[i - 1]!) ** 2;
  return Math.sqrt(sum / (intervalsMs.length - 1));
}

// round axis ticks that cover the values, with the top tick above the largest one
export function niceTicks(values: Series, step: number): number[] {
  const real = values.filter((v): v is number => v !== null);
  if (real.length === 0) return [0, step];
  const lo = Math.floor(Math.min(...real) / step) * step;
  let hi = Math.ceil(Math.max(...real) / step) * step;
  if (hi <= Math.max(...real)) hi += step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(6));
  return out;
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

export function sampleTimes(start: string, count: number, stepMinutes: number): string[] {
  const first = toMinutes(start);
  return Array.from({ length: count }, (_, i) => clock(first + i * stepMinutes));
}

// station time: everything on the console is in GMT, like on board
export function clockOf(date: Date, seconds = false): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const hm = `${p(date.getUTCHours())}:${p(date.getUTCMinutes())}`;
  return seconds ? `${hm}:${p(date.getUTCSeconds())}` : hm;
}

export function signed(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return '0';
}

export function hoursMinutes(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}
