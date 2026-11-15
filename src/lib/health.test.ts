import { describe, expect, test } from 'vitest';
import { hourAverage, niceTicks, percentFromBaseline, rmssd, sampleTimes, signed } from './health';
import { sample } from '../data/sample';
import { SYSTEM_TEXT } from './systems';

describe('health helpers', () => {
  test('hour average uses the last hour of samples and skips gaps', () => {
    expect(hourAverage([1, 1, 2, 2, 2, 2, 2, 2], 10)).toBe(2);
    expect(hourAverage([5, null, 3], 30)).toBe(3);
    expect(hourAverage([null, null], 10)).toBeNull();
  });

  test('baseline change is rounded to whole percent', () => {
    expect(percentFromBaseline(34, 49)).toBe(-31);
  });

  test('sample times step by the given minutes', () => {
    expect(sampleTimes('08:00', 4, 10)).toEqual(['08:00', '08:10', '08:20', '08:30']);
    expect(sampleTimes('23:59', 2, 1)).toEqual(['23:59', '00:00']);
  });

  test('signed numbers use a real minus', () => {
    expect(signed(-31)).toBe('−31');
    expect(signed(4)).toBe('+4');
  });

  test('RMSSD from beat intervals', () => {
    expect(rmssd([800, 810, 800, 810])).toBe(10);
    expect(rmssd([800, 810])).toBeNull();
  });

  test('axis ticks cover the data with room on top', () => {
    expect(niceTicks([34, 52, 49], 10)).toEqual([30, 40, 50, 60]);
    expect(niceTicks([2.26, 3.04, 3.0], 0.5)).toEqual([2, 2.5, 3, 3.5]);
  });
});

describe('sample data agrees with itself', () => {
  test('HRV and CO2 series cover the same times', () => {
    expect(sample.hrv.length).toBe(sample.cabin.ppco2.length);
  });

  test('the stress start is one of the sample times', () => {
    expect(sampleTimes(sample.seriesStart, sample.hrv.length, sample.seriesStepMinutes)).toContain(sample.stressFrom);
  });

  test('the HRV figure matches the last point of the chart', () => {
    expect(sample.hrvNow).toBe(sample.hrv.at(-1));
  });
});

test('every body system names its NASA HRP hazard and at least one risk', () => {
  const hazards = ['Space Radiation', 'Isolation and Confinement', 'Distance from Earth', 'Gravity Fields', 'Hostile/Closed Environments'];
  for (const t of Object.values(SYSTEM_TEXT)) {
    expect(hazards).toContain(t.hazard);
    expect(t.risks.length).toBeGreaterThan(0);
    for (const r of t.risks) expect(r).toMatch(/^Risk of /);
  }
});
