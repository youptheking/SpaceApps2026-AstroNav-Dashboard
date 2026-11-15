import { expect, test } from 'vitest';
import { dateKey, toCheckIn, type CheckInEntry } from './checkin';

const entry: CheckInEntry = { doneAt: '07:30', sleepMinutes: 400, mood: 4, moodNote: 'Rested', systolic: null, diastolic: null, glucose: null };

test('a saved check-in for today shows up, with the days before it', () => {
  const now = new Date(2026, 10, 15, 9, 0);
  const yesterday = new Date(2026, 10, 14);
  const c = toCheckIn({ [dateKey(now)]: entry, [dateKey(yesterday)]: entry }, now);
  expect(c.doneAt).toBe('07:30');
  expect(c.sleepMinutes).toBe(400);
  expect(c.dummy).toBeUndefined();
  expect(c.lastDays.slice(-2)).toEqual([true, true]);
  expect(c.lastDays.filter(Boolean)).toHaveLength(2);
});

test('nothing saved today: not done, no values', () => {
  const c = toCheckIn({}, new Date(2026, 10, 15));
  expect(c.doneAt).toBeNull();
  expect(c.mood).toBeNull();
  expect(c.lastDays.every((d) => !d)).toBe(true);
});
