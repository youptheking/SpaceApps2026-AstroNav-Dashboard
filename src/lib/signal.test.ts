import { describe, expect, test } from 'vitest';
import { ecgUsable, opticalQuality, removeMains } from './signal';

const HZ = 250;

// one lead at 72 bpm in ADC counts, the same shape the demo watch draws
function ecg(seconds: number, hum = 0): number[] {
  const g = (p: number, c: number, w: number, a: number) => a * Math.exp(-((p - c) ** 2) / (2 * w * w));
  const beat = 60 / 72;
  return Array.from({ length: seconds * HZ }, (_, i) => {
    const t = i / HZ;
    const p = (t % beat) / beat;
    const shape = g(p, 0.18, 0.025, 0.12) - g(p, 0.355, 0.008, 0.12) + g(p, 0.37, 0.01, 1) - g(p, 0.39, 0.009, 0.25) + g(p, 0.62, 0.045, 0.28);
    return Math.round(1500 + 900 * shape + hum * Math.sin(2 * Math.PI * 50 * t));
  });
}

// what the watch sent with the electrodes off: 50 Hz mains, clipped at 0
const mainsOnly = Array.from({ length: 3 * HZ }, (_, i) => [2175, 3159, 2450, 150, 0][i % 5]!);

describe('ECG quality', () => {
  test('a clean trace is usable', () => {
    expect(ecgUsable(ecg(3))).toBe(true);
  });

  test('a trace with some mains hum is still usable, and the hum is filtered out', () => {
    const noisy = ecg(3, 60);
    expect(ecgUsable(noisy)).toBe(true);
    const clean = ecg(3);
    const filtered = removeMains(noisy);
    const worst = Math.max(...filtered.slice(10).map((v, i) => Math.abs(v - removeMains(clean)[i + 10]!)));
    expect(worst).toBeLessThan(5);
  });

  test('pure mains pickup with loose electrodes is not usable', () => {
    expect(ecgUsable(mainsOnly)).toBe(false);
  });

  test('a trace stuck at the top of the ADC range is not usable', () => {
    expect(ecgUsable(ecg(3).map((v, i) => (i % 8 === 0 ? 3159 : v)))).toBe(false);
  });

  test('a flat line is not usable', () => {
    expect(ecgUsable(Array.from({ length: 3 * HZ }, (_, i) => 1500 + (i % 3)))).toBe(false);
  });

  test('too little data is not judged usable yet', () => {
    expect(ecgUsable(ecg(3).slice(0, 100))).toBe(false);
  });
});

describe('optical quality', () => {
  const v = { skinContact: true, motionArtifact: false, perfusion: 2.4 };
  test('still, good contact and perfusion is ok', () => {
    expect(opticalQuality(v)).toBe('ok');
  });
  test('movement makes the reading unreliable', () => {
    expect(opticalQuality({ ...v, motionArtifact: true })).toBe('motion');
  });
  test('a very weak pulse signal is unreliable', () => {
    expect(opticalQuality({ ...v, perfusion: 0.2 })).toBe('weak');
    expect(opticalQuality({ ...v, perfusion: null })).toBe('weak');
  });
  test('no skin contact wins over everything else', () => {
    expect(opticalQuality({ skinContact: false, motionArtifact: true, perfusion: 0.1 })).toBe('noContact');
  });
});
