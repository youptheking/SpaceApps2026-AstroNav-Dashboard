import { useCallback, useState } from 'react';
import type { CheckIn } from '../types';
import { sample } from '../data/sample';
import type { CrewMember } from './crew';

// The daily check-in the crew member fills in on the console: how they slept and feel.
// Ties to two NASA HRP risks: Inadequate Sleep and Irregular Schedules, and Behavioral Changes.
// Kept per crew member and per day in this browser's storage.

export interface CheckInEntry {
  doneAt: string;
  sleepMinutes: number | null;
  mood: number | null;
  moodNote: string;
  systolic: number | null;
  diastolic: number | null;
  glucose: number | null;
}

export const SLEEP_GOAL_MINUTES = 420;
const DAYS_SHOWN = 14;
const key = (memberId: string) => `astronav.checkin.${memberId}`;

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function load(memberId: string): Record<string, CheckInEntry> {
  try {
    return JSON.parse(localStorage.getItem(key(memberId)) ?? '{}') as Record<string, CheckInEntry>;
  } catch {
    return {};
  }
}

function store(memberId: string, all: Record<string, CheckInEntry>) {
  try {
    localStorage.setItem(key(memberId), JSON.stringify(all));
  } catch {
    // private mode or blocked storage: kept until the app closes
  }
}

export function toCheckIn(all: Record<string, CheckInEntry>, now = new Date()): CheckIn {
  const today = all[dateKey(now)];
  const lastDays = Array.from({ length: DAYS_SHOWN }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (DAYS_SHOWN - 1 - i));
    return !!all[dateKey(d)];
  });
  return {
    doneAt: today?.doneAt ?? null,
    sleepMinutes: today?.sleepMinutes ?? null,
    sleepGoalMinutes: SLEEP_GOAL_MINUTES,
    mood: today?.mood ?? null,
    moodNote: today?.moodNote ?? '',
    systolic: today?.systolic ?? null,
    diastolic: today?.diastolic ?? null,
    nextBloodPressure: '',
    glucose: today?.glucose ?? null,
    glucoseNote: '',
    lastDays,
  };
}

// A crew member's check-in. The demo crew start with example values until someone fills it in.
export function useCheckIn(member: CrewMember) {
  const [entries, setEntries] = useState<Record<string, Record<string, CheckInEntry>>>({});
  const all = entries[member.id] ?? load(member.id);
  const saved = toCheckIn(all);
  const data: CheckIn = member.kind === 'demo' && saved.doneAt === null ? { ...sample.checkIn, dummy: true } : saved;

  const save = useCallback((entry: CheckInEntry) => {
    const next = { ...load(member.id), [dateKey(new Date())]: entry };
    store(member.id, next);
    setEntries((e) => ({ ...e, [member.id]: next }));
  }, [member.id]);

  return { data, save };
}
