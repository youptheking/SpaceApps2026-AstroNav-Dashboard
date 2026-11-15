import { describe, expect, test } from 'vitest';
import { hourAverage, percentFromBaseline, sampleTimes, signed } from './health';
import { sample } from '../data/sample';

describe('health helpers', () => {
  test('hour average uses the last six 10-minute samples', () => {
    expect(hourAverage([1, 1, 2, 2, 2, 2, 2, 2])).toBe(2);
  });

  test('baseline change is rounded to whole percent', () => {
    expect(percentFromBaseline(34, 49)).toBe(-31);
  });

  test('sample times step by ten minutes', () => {
    expect(sampleTimes('08:00', 4)).toEqual(['08:00', '08:10', '08:20', '08:30']);
  });

  test('signed numbers use a real minus', () => {
    expect(signed(-31)).toBe('−31');
    expect(signed(4)).toBe('+4');
  });
});

describe('sample data agrees with itself', () => {
  test('HRV and CO2 series cover the same times', () => {
    expect(sample.hrv.length).toBe(sample.cabin.ppco2.length);
  });

  test('the stress start is one of the sample times', () => {
    expect(sampleTimes(sample.seriesStart, sample.hrv.length)).toContain(sample.stressFrom);
  });
});
