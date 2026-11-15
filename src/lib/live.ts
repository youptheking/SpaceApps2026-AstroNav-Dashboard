import type { AlertEvent, CheckIn, Series, Snapshot, Vitals } from '../types';
import { clock, clockOf, rmssd } from './health';
import { EVENT_CODE, SENSOR, eventText, type Packet } from './packets';
import { deriveSystems } from './systems';

const STEP_MINUTES = 1;
const KEEP_MINUTES = 120;
const BASELINE_MINUTES = 5;
const ECG_KEEP = 750; // 3 s at 250 Hz
const SEVERITY = ['info', 'warning', 'alarm'] as const;
const SOURCE = ['Wrist', 'Dashboard', 'You'] as const;

const emptyVitals = (): Vitals => ({
  hrPpg: null, hrEcg: null, rhythmRegular: true, spo2: null, perfusion: null, skinTemp: null,
  skinTempSteadySince: null, activity: null, leadsOff: false, skinContact: false,
});

const minuteOf = (d: Date) => Math.floor(d.getTime() / 60000);

// Folds the packet stream from the watch into what the overview shows.
export class LiveModel {
  private vitals = emptyVitals();
  private batteryPct: number | null = null;
  private batterySimulated = false;
  private simulatedBits = 0;
  private demo = false;
  private rr: { at: number; ms: number }[] = [];
  private hrvByMinute = new Map<number, number[]>();
  private co2ByMinute = new Map<number, number[]>();
  private firstMinute: number | null = null;
  private air: Extract<Packet, { kind: 'air' }> | null = null;
  private cabin: Extract<Packet, { kind: 'cabin' }> | null = null;
  private alerts: AlertEvent[] = [];
  private activeCodes = new Set<number>();
  private stressFrom: string | null = null;
  private ecg: number[] = [];
  packets = 0;

  apply(p: Packet, at = new Date()): void {
    this.packets++;
    const minute = minuteOf(at);
    this.firstMinute ??= minute;

    switch (p.kind) {
      case 'ecg':
        this.ecg.push(...p.mv);
        if (this.ecg.length > ECG_KEEP) this.ecg.splice(0, this.ecg.length - ECG_KEEP);
        break;
      case 'vitals':
        this.vitals = {
          hrPpg: p.hrPpg, hrEcg: p.hrEcg, spo2: p.spo2, perfusion: p.perfusion, skinTemp: p.skinTemp,
          activity: p.activity, leadsOff: p.leadsOff, skinContact: p.skinContact,
          rhythmRegular: this.vitals.rhythmRegular, skinTempSteadySince: null,
        };
        break;
      case 'rr': {
        const bucket = this.hrvByMinute.get(minute) ?? [];
        for (const ms of p.intervalsMs) {
          this.rr.push({ at: at.getTime(), ms });
          bucket.push(ms);
        }
        this.hrvByMinute.set(minute, bucket);
        this.rr = this.rr.filter((r) => at.getTime() - r.at < 60_000);
        this.vitals.rhythmRegular = regular(this.rr.map((r) => r.ms));
        break;
      }
      case 'air':
        this.air = p;
        if (p.ppco2 !== null) {
          const bucket = this.co2ByMinute.get(minute) ?? [];
          bucket.push(p.ppco2);
          this.co2ByMinute.set(minute, bucket);
        }
        break;
      case 'cabin':
        this.cabin = p;
        break;
      case 'status':
        this.batteryPct = p.batteryPct;
        this.activeCodes = new Set(Array.from({ length: 16 }, (_, i) => i).filter((i) => p.alarms & (1 << i)));
        break;
      case 'sim':
        this.demo = p.demo;
        this.simulatedBits = p.simulated;
        this.batterySimulated = p.batterySimulated;
        break;
      case 'event':
        this.onEvent(p, at);
        break;
      default:
        break;
    }
  }

  private onEvent(p: Extract<Packet, { kind: 'event' }>, at: Date) {
    const time = clockOf(at);
    if (p.code === EVENT_CODE.stressHigh) this.stressFrom = p.active ? (this.stressFrom ?? time) : null;
    if (p.active) this.activeCodes.add(p.code);
    else this.activeCodes.delete(p.code);

    if (p.code === EVENT_CODE.acknowledged) {
      const seen = this.openAlert(p.value);
      if (seen) seen.resolution = 'Seen by you';
      return;
    }
    if (p.active) {
      // the watch repeats an alert when it gets worse; keep one row and update it
      const open = this.openAlert(p.code);
      const row: AlertEvent = {
        id: `${p.code}-${p.header.seq}-${at.getTime()}`,
        code: p.code,
        time: open?.time ?? time,
        text: eventText(p.code, p.value),
        severity: SEVERITY[p.severity] ?? 'warning',
        raisedBy: SOURCE[p.source] ?? 'Wrist',
        resolution: null,
      };
      if (open) Object.assign(open, { text: row.text, severity: row.severity });
      else this.alerts.unshift(row);
      this.alerts = this.alerts.slice(0, 30);
    } else {
      const open = this.openAlert(p.code);
      if (open) open.resolution = `Cleared ${time}`;
    }
  }

  private openAlert(code: number) {
    return this.alerts.find((a) => a.code === code && a.resolution === null);
  }

  markHandled(id: string, at = new Date()) {
    const a = this.alerts.find((x) => x.id === id);
    if (a) a.resolution = `Handled ${clockOf(at)}`;
  }

  ecgSamples(): number[] {
    return this.ecg;
  }

  snapshot(base: { crew: Snapshot['crew']; checkIn: CheckIn }, now = new Date()): Snapshot {
    const nowMinute = minuteOf(now);
    const first = Math.max(this.firstMinute ?? nowMinute, nowMinute - KEEP_MINUTES + 1);
    const minutes = Array.from({ length: nowMinute - first + 1 }, (_, i) => first + i);

    const hrv: Series = minutes.map((m) => rmssd(this.hrvByMinute.get(m) ?? []));
    const co2: Series = minutes.map((m) => {
      const v = this.co2ByMinute.get(m);
      return v?.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    });
    const realHrv = [...this.hrvByMinute.keys()].sort((a, b) => a - b)
      .map((m) => rmssd(this.hrvByMinute.get(m)!)).filter((v): v is number => v !== null);
    const hrvBaseline = realHrv.length >= BASELINE_MINUTES
      ? Math.round(realHrv.slice(0, BASELINE_MINUTES).reduce((a, b) => a + b, 0) / BASELINE_MINUTES)
      : null;
    const lastMinute = rmssd(this.rr.map((r) => r.ms));
    const hrvNow = lastMinute === null ? null : Math.round(lastMinute);

    const sim = this.simulatedBits;
    const startDate = new Date(first * 60000);

    return {
      source: 'live',
      crew: base.crew,
      now: clockOf(now, true),
      demoMode: this.demo,
      seriesStart: clock(startDate.getHours() * 60 + startDate.getMinutes()),
      seriesStepMinutes: STEP_MINUTES,
      vitals: this.vitals,
      battery: { percent: this.batteryPct, hoursLeft: null, simulated: this.batterySimulated },
      simulated: { optical: !!(sim & SENSOR.max30102), co2: !!(sim & SENSOR.scd41), pressure: !!(sim & SENSOR.bmp180) },
      hrvBaseline,
      hrv,
      hrvNow,
      stressFrom: this.stressFrom,
      cabin: {
        ppco2: co2,
        ppco2Now: this.air?.ppco2 ?? null,
        ppco2Hour: this.air?.ppco2Hour ?? null,
        co2Ppm: this.air?.co2Ppm ?? null,
        pressureKpa: this.cabin?.pressurePa != null ? this.cabin.pressurePa / 1000 : null,
        pressureTrendPaMin: this.cabin?.pressureTrend ?? null,
        tempC: this.air?.tempC ?? null,
        humidity: this.air?.humidity ?? null,
      },
      systems: deriveSystems({
        vitals: this.vitals, hrvNow, hrvBaseline,
        stressActive: this.stressFrom !== null, activeCodes: this.activeCodes,
      }),
      alerts: this.alerts.map((a) => ({ ...a })),
      checkIn: base.checkIn,
    };
  }
}

// irregular when beats differ by more than 20 % from the median, a rough screen and not a diagnosis
function regular(intervals: number[]): boolean {
  if (intervals.length < 5) return true;
  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  const off = intervals.filter((ms) => Math.abs(ms - median) / median > 0.2).length;
  return off / intervals.length < 0.15;
}
