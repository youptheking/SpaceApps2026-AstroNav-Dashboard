// Seven days of minute summaries, NASA-STD-3001 [V2 6001]: "data in formats compatible with
// performing temporal trend analyses". The real watch keeps them in flash; without a watch the
// console makes dummy days with the same shape, clearly marked as such.

export const HISTORY_DAYS = 7;
export const HISTORY_MINUTES = HISTORY_DAYS * 24 * 60;

// as the Rust side emits it (src-tauri/src/protocol.rs, HistoryRecord)
export interface RawHistoryRecord {
  seq: number;
  unixTime: number;
  flags: number;
  status: number;
  alerts: number;
  hrAvg: number;
  hrMin: number;
  hrMax: number;
  spo2Avg: number;
  spo2Min: number;
  skinTemp: number;
  co2: number[];
  ppco2Avg: number;
  cabinTemp: number;
  humidity: number;
  pressure: number;
  gsr: number;
  activity: number;
  tremor: number;
  batteryMv: number;
}

export type HistoryFrame =
  | { kind: 'range'; oldest: number; newest: number }
  | { kind: 'records'; records: RawHistoryRecord[] };

// which values were measured that minute (HistoryRecord.flags in the firmware)
const F_HEART = 1 << 0;
const F_SKIN = 1 << 1;
const F_AIR = 1 << 2;
const F_PRESSURE = 1 << 3;
const F_IMU = 1 << 4;
const F_CLOCK = 1 << 7;
const S_SIMULATED = 1 << 0;

export interface HistoryMinute {
  seq: number;
  // start of the minute, ms since 1970
  at: number;
  // the watch did not know the time; `at` is estimated from the record number
  estimated: boolean;
  simulated: boolean;
  hr: number | null;
  hrMax: number | null;
  spo2Min: number | null;
  skinTemp: number | null;
  ppco2Hour: number | null;
  co2Max: number | null;
  pressureHpa: number | null;
  activity: number | null;
  alerts: number;
}

export function decode(r: RawHistoryRecord, newest: number, now: number): HistoryMinute {
  const has = (bit: number) => (r.flags & bit) !== 0;
  const clock = has(F_CLOCK) && r.unixTime > 0;
  return {
    seq: r.seq,
    at: clock ? r.unixTime * 1000 : now - (newest - r.seq + 1) * 60_000,
    estimated: !clock,
    simulated: (r.status & S_SIMULATED) !== 0,
    hr: has(F_HEART) && r.hrAvg ? r.hrAvg : null,
    hrMax: has(F_HEART) && r.hrMax ? r.hrMax : null,
    spo2Min: has(F_HEART) && r.spo2Min ? r.spo2Min : null,
    skinTemp: has(F_SKIN) ? r.skinTemp / 100 : null,
    ppco2Hour: has(F_AIR) && r.ppco2Avg ? r.ppco2Avg / 100 : null,
    co2Max: has(F_AIR) ? Math.max(...r.co2) || null : null,
    pressureHpa: has(F_PRESSURE) && r.pressure ? r.pressure / 10 : null,
    activity: has(F_IMU) ? r.activity : null,
    alerts: r.alerts,
  };
}

// ---- summaries for the charts ----

export interface HourSummary {
  at: number;
  hr: number | null;
  spo2Min: number | null;
  ppco2Hour: number | null;
  activity: number | null;
  skinTemp: number | null;
}

export interface DaySummary {
  day: string;
  minutes: number;
  hrAvg: number | null;
  spo2Min: number | null;
  ppco2Max: number | null;
  activeMinutes: number;
  restHours: number;
  alertMinutes: number;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const vals = (ms: HistoryMinute[], f: (m: HistoryMinute) => number | null) =>
  ms.map(f).filter((v): v is number => v !== null);
const round = (v: number | null, d = 0) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);

export function byHour(minutes: HistoryMinute[]): HourSummary[] {
  const groups = new Map<number, HistoryMinute[]>();
  for (const m of minutes) {
    const h = Math.floor(m.at / 3_600_000) * 3_600_000;
    const g = groups.get(h);
    if (g) g.push(m);
    else groups.set(h, [m]);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([at, ms]) => {
    const spo2 = vals(ms, (m) => m.spo2Min);
    const co2 = vals(ms, (m) => m.ppco2Hour);
    return {
      at,
      hr: round(mean(vals(ms, (m) => m.hr))),
      spo2Min: spo2.length ? Math.min(...spo2) : null,
      ppco2Hour: co2.length ? round(Math.max(...co2), 2) : null,
      activity: round(mean(vals(ms, (m) => m.activity))),
      skinTemp: round(mean(vals(ms, (m) => m.skinTemp)), 1),
    };
  });
}

const dayKey = (at: number) => new Date(at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export function byDay(minutes: HistoryMinute[]): DaySummary[] {
  const groups = new Map<string, HistoryMinute[]>();
  for (const m of minutes) {
    const k = dayKey(m.at);
    const g = groups.get(k);
    if (g) g.push(m);
    else groups.set(k, [m]);
  }
  // 7 x 24 h of minutes touches 8 calendar days (two half ones); the table shows the last 7
  return [...groups.entries()].slice(-HISTORY_DAYS).map(([day, ms]) => {
    const spo2 = vals(ms, (m) => m.spo2Min);
    const co2 = vals(ms, (m) => m.ppco2Hour);
    const act = vals(ms, (m) => m.activity);
    return {
      day,
      minutes: ms.length,
      hrAvg: round(mean(vals(ms, (m) => m.hr))),
      spo2Min: spo2.length ? Math.min(...spo2) : null,
      ppco2Max: co2.length ? round(Math.max(...co2), 2) : null,
      activeMinutes: act.filter((a) => a >= 30).length,
      restHours: round(act.filter((a) => a < 5).length / 60, 1) ?? 0,
      alertMinutes: ms.filter((m) => m.alerts !== 0).length,
    };
  });
}

// Labels for hourly points in station time (GMT): a week gets one label per day at midnight;
// under two days of data there is no midnight to speak of, so every few hours get "HH:00".
const MAX_HOUR_LABELS = 8;
export function hourLabels(hours: { at: number }[]): string[] {
  const first = hours[0]?.at ?? 0;
  const last = hours.at(-1)?.at ?? 0;
  if (last - first >= 48 * 3_600_000) {
    return hours.map((h) => (new Date(h.at).getUTCHours() === 0
      ? new Date(h.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
      : ''));
  }
  const step = Math.max(1, Math.ceil(hours.length / MAX_HOUR_LABELS));
  return hours.map((h, i) => (i % step === 0 ? `${String(new Date(h.at).getUTCHours()).padStart(2, '0')}:00` : ''));
}

// The first record number from `from` to `newest` the console does not have yet, or null when complete.
export function firstMissing(have: { has(seq: number): boolean }, from: number, newest: number): number | null {
  for (let seq = from; seq <= newest; seq++) if (!have.has(seq)) return seq;
  return null;
}

// ---- dummy history, for the demo and the example screen ----

export interface DummyOptions {
  restingHr?: number;
  // a CO2 problem on one of the days, in hours since the start
  co2Peak?: number;
  seed?: number;
}

// a small repeatable random generator, so a crew member's dummy week looks the same every time
function random(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function dummyHistory(now: number, options: DummyOptions = {}): HistoryMinute[] {
  const rnd = random(options.seed ?? 7);
  const noise = () => rnd() - 0.5;
  const resting = options.restingHr ?? 66;
  const end = Math.floor(now / 60_000) * 60_000;
  const start = end - HISTORY_MINUTES * 60_000;
  const peak = options.co2Peak ?? 4 * 24 + 14;
  const out: HistoryMinute[] = [];
  let ppco2 = 2.3;

  for (let i = 0; i < HISTORY_MINUTES; i++) {
    const at = start + i * 60_000;
    const hour = new Date(at).getUTCHours() + new Date(at).getUTCMinutes() / 60;
    // station time: sleep 21:30-06:00 GMT, two exercise blocks of 1 h
    const asleep = hour >= 21.5 || hour < 6;
    const exercise = (hour >= 9 && hour < 10) || (hour >= 16 && hour < 17);
    const activity = asleep ? 2 + 3 * rnd() : exercise ? 70 + 25 * rnd() : 15 + 25 * rnd();
    const hr = resting + (asleep ? -8 : exercise ? 55 : 6) + 3 * noise();
    const hoursIn = i / 60;
    const co2Bump = Math.max(0, 1 - Math.abs(hoursIn - peak) / 3) * 0.9;
    ppco2 += (2.35 + 0.15 * Math.sin((hoursIn / 24) * 2 * Math.PI) + co2Bump - ppco2) * 0.02;

    out.push({
      seq: i + 1,
      at,
      estimated: false,
      simulated: true,
      hr: Math.round(hr),
      hrMax: Math.round(hr + 6 + 4 * rnd()),
      spo2Min: Math.round(exercise ? 95 + 2 * rnd() : 96 + 2.5 * rnd()),
      skinTemp: Math.round((asleep ? 34.4 : exercise ? 33.2 : 33.8) * 10 + 2 * noise()) / 10,
      ppco2Hour: Math.round(ppco2 * 100) / 100,
      co2Max: Math.round(((ppco2 + 0.1) / 760) * 1e6),
      pressureHpa: Math.round((1013.2 + 0.4 * noise()) * 10) / 10,
      activity: Math.round(activity),
      alerts: ppco2 > 3 ? 1 : 0,
    });
  }
  return out;
}
