// Signal quality checks, so the screen never shows a number the sensor could not really measure.

export type OpticalQuality = 'ok' | 'noContact' | 'motion' | 'weak';

// below this perfusion index the pulse wave is too small for a trustworthy SpO2 or heart rate
const MIN_PERFUSION = 0.5;

export function opticalQuality(v: { skinContact: boolean; motionArtifact: boolean; perfusion: number | null }): OpticalQuality {
  if (!v.skinContact) return 'noContact';
  if (v.motionArtifact) return 'motion';
  if (v.perfusion === null || v.perfusion < MIN_PERFUSION) return 'weak';
  return 'ok';
}

// The ECG arrives at 250 Hz, so a 5-sample average cancels 50 Hz mains hum exactly and keeps the heartbeat.
const MAINS_PERIOD = 5;
const ECG_MIN_SAMPLES = 250; // one second
// the watch sends millivolts from analogReadMilliVolts; the ESP32-S3 ADC tops out near 3160 mV.
// Samples stuck at either end mean the amplifier is overloaded.
const RAIL_LOW = 0;
const RAIL_HIGH = 3150;
const MAX_RAIL_FRACTION = 0.05;
// once the hum is filtered out, a trace with less spread than this (in counts) is a flat line, not a heartbeat;
// pure mains pickup filters down to almost exactly zero
const MIN_SPREAD = 20;

export function removeMains(raw: number[]): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < raw.length; i++) {
    sum += raw[i]!;
    if (i >= MAINS_PERIOD) sum -= raw[i - MAINS_PERIOD]!;
    out.push(sum / Math.min(i + 1, MAINS_PERIOD));
  }
  return out;
}

function spread(xs: number[]): number {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
}

export function ecgUsable(raw: number[]): boolean {
  if (raw.length < ECG_MIN_SAMPLES) return false;
  const onRail = raw.filter((v) => v <= RAIL_LOW || v >= RAIL_HIGH).length / raw.length;
  if (onRail > MAX_RAIL_FRACTION) return false;
  return spread(removeMains(raw).slice(MAINS_PERIOD)) >= MIN_SPREAD;
}
