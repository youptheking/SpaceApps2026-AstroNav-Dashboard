import { expect, test } from 'vitest';
import { byDay, byHour, decode, dummyHistory, HISTORY_MINUTES, type RawHistoryRecord } from './history';

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
  expect(days.length).toBeGreaterThanOrEqual(7);
  expect(days.some((d) => (d.ppco2Max ?? 0) > 3)).toBe(true);
  // asleep about 8.5 h a day: lots of rest
  expect(days[2]!.restHours).toBeGreaterThan(6);
  // the same seed gives the same week
  expect(dummyHistory(now, { seed: 3 })[500]).toEqual(dummyHistory(now, { seed: 3 })[500]);
});
