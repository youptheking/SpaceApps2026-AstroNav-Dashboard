import { expect, test } from 'vitest';
import { byDay, byHour, decode, dummyHistory, firstMissing, hourLabels, HISTORY_MINUTES, type RawHistoryRecord } from './history';

test('a week of hours is labelled once a day, a few hours by the hour', () => {
  const start = Date.UTC(2026, 10, 8, 14, 0);
  const week = Array.from({ length: 7 * 24 }, (_, i) => ({ at: start + i * 3_600_000 }));
  const weekLabels = hourLabels(week).filter(Boolean);
  expect(weekLabels).toHaveLength(7);
  expect(weekLabels[0]).toBe('Mon 9');

  const short = Array.from({ length: 5 }, (_, i) => ({ at: Date.UTC(2026, 10, 15, 10 + i) }));
  expect(hourLabels(short)).toEqual(['10:00', '11:00', '12:00', '13:00', '14:00']);
  const day = Array.from({ length: 20 }, (_, i) => ({ at: Date.UTC(2026, 10, 15, 0) + i * 3_600_000 }));
  const dayLabels = hourLabels(day).filter(Boolean);
  expect(dayLabels.length).toBeGreaterThan(3);
  expect(dayLabels.length).toBeLessThanOrEqual(10);
});

test('the first record still missing from a download is found, or none', () => {
  const have = new Set([5, 6, 7, 9, 10]);
  expect(firstMissing(have, 5, 10)).toBe(8);
  expect(firstMissing(have, 5, 7)).toBeNull();
  expect(firstMissing(new Set(), 3, 4)).toBe(3);
});

const raw = (over: Partial<RawHistoryRecord> = {}): RawHistoryRecord => ({
  seq: 100, unixTime: 1_763_200_000, flags: 0b1001_1111, status: 0, alerts: 0,
  hrAvg: 72, hrMin: 64, hrMax: 88, spo2Avg: 97, spo2Min: 95, skinTemp: 3380,
  co2: Array(12).fill(3400), ppco2Avg: 261, cabinTemp: 2240, humidity: 4600, pressure: 10132, gsr: 250,
  activity: 12, tremor: 3, batteryMv: 3950, ...over,
});

test('a watch record becomes physical units, and only measured values count', () => {
  const m = decode(raw(), 100, 0);
  expect(m.at).toBe(1_763_200_000_000);
  expect(m.estimated).toBe(false);
  expect(m.hr).toBe(72);
  expect(m.ppco2Hour).toBe(2.61);
  expect(m.pressureHpa).toBe(1013.2);
  expect(m.skinTemp).toBe(33.8);

  // no heart-rate flag: the zeros are not real readings
  const noHeart = decode(raw({ flags: 0b1000_0100 }), 100, 0);
  expect(noHeart.hr).toBeNull();
  expect(noHeart.spo2Min).toBeNull();
  expect(noHeart.ppco2Hour).toBe(2.61);
});

test('without the clock bit the time is estimated from the record number', () => {
  const now = 1_763_300_000_000;
  const m = decode(raw({ flags: 0b0000_0001, seq: 95 }), 100, now);
  expect(m.estimated).toBe(true);
  expect(m.at).toBe(now - 6 * 60_000);
});

test('the dummy week is 7 days of minutes with a CO2 day over the NASA limit, and summarises per hour and day', () => {
  const now = Date.UTC(2026, 10, 15, 14, 0);
  const week = dummyHistory(now, { co2Peak: 4 * 24 + 14 });
  expect(week).toHaveLength(HISTORY_MINUTES);
  expect(week.every((m) => m.simulated)).toBe(true);
  expect(Math.max(...week.map((m) => m.ppco2Hour ?? 0))).toBeGreaterThan(3);

  const hours = byHour(week);
  expect(hours).toHaveLength(7 * 24);
  const days = byDay(week);
  // 7 x 24 h touches 8 calendar days; the table shows the last 7, today last
  expect(days).toHaveLength(7);
  expect(days.at(-1)!.day).toBe(new Date(now).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }));
  expect(days.some((d) => (d.ppco2Max ?? 0) > 3)).toBe(true);
  // asleep about 8.5 h a day: lots of rest
  expect(days[2]!.restHours).toBeGreaterThan(6);
  // the same seed gives the same week
  expect(dummyHistory(now, { seed: 3 })[500]).toEqual(dummyHistory(now, { seed: 3 })[500]);
});
