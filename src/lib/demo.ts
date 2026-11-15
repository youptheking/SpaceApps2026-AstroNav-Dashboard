import { EVENT_CODE, type Packet } from './packets';

// A pretend watch for showing the console without hardware. It sends the same packets as the
// real one, and plays a five-minute story on repeat:
//   0:30  stress builds: heart rate up, HRV down, skin conductance up
//   1:00  CO2 creeps over 3 mmHg in a badly ventilated corner
//   1:55  an ECG electrode comes loose for a few seconds
//   2:30  ventilation fixed, CO2 falls back
//   2:50  the breathing break works, stress fades
const CYCLE_S = 300;
const TICK_MS = 100;
const ECG_HZ = 250;
const HISTORY_MIN = 45;

const ramp = (t: number, from: number, to: number) => Math.min(1, Math.max(0, (t - from) / (to - from)));

// Which story a pretend watch plays. 'full' is the original five-minute story; the others are
// for extra demo crew members, so each one shows something different.
//   co2     a badly ventilated module: CO2 creeps over 3 mmHg and back, the body stays calm
//   stress  a hard work block: stress builds and fades, the air is fine
//   calm    nothing happens: everything in range
export type DemoStory = 'full' | 'co2' | 'stress' | 'calm';

export interface DemoOptions {
  story?: DemoStory;
  // seconds into the cycle at the start, so several pretend watches are not in step
  startS?: number;
  // personal resting heart rate and HRV, so crew members do not look identical
  restingHr?: number;
  restingRmssd?: number;
}

// the story at t seconds into the cycle
function scene(t: number, story: DemoStory) {
  const stress = ramp(t, 30, 90) - ramp(t, 170, 230);
  const co2Rise = ramp(t, 60, 120) - ramp(t, 150, 200);
  switch (story) {
    case 'co2':
      return { stress: 0, ppco2: 2.6 + 0.75 * co2Rise, leadsOff: false };
    case 'stress':
      return { stress, ppco2: 2.35, leadsOff: false };
    case 'calm':
      return { stress: 0, ppco2: 2.2, leadsOff: false };
    default:
      return { stress, ppco2: 2.55 + 0.75 * co2Rise, leadsOff: t >= 115 && t < 123 };
  }
}

function gauss(): number {
  const u = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

// P, QRS and T as bumps over one beat, same shape as the sample trace
function ecgShape(p: number): number {
  const g = (c: number, w: number, a: number) => a * Math.exp(-((p - c) ** 2) / (2 * w * w));
  return g(0.18, 0.025, 0.12) - g(0.355, 0.008, 0.12) + g(0.37, 0.01, 1) - g(0.39, 0.009, 0.25) + g(0.62, 0.045, 0.28);
}

export class DemoWatch {
  private seq = 0;
  private ms = 0; // stream time
  private beatStart = 0;
  private beatLen = 0.85;
  private breath = 0;
  private rrPending: number[] = [];
  private co2Hour: number[] = [];
  private active = new Set<number>();
  private battery = 84;
  private story: DemoStory;
  private startMs: number;
  private restingHr: number;
  private restingRmssd: number;

  constructor(options: DemoOptions = {}) {
    this.story = options.story ?? 'full';
    this.startMs = Math.round((options.startS ?? 0) * 10) * 100;
    this.restingHr = options.restingHr ?? 70;
    this.restingRmssd = options.restingRmssd ?? 48;
  }

  private header() {
    return { seq: this.seq++ & 0xffff, tMs: this.ms };
  }

  // heart rate and RMSSD the story asks for
  private heart(stress: number) {
    return { hr: this.restingHr + 14 * stress, rmssd: this.restingRmssd - 18 * stress };
  }

  // one RR interval: mean from heart rate, breathing swing plus noise sized to give the RMSSD
  private nextRr(stress: number): number {
    const { hr, rmssd } = this.heart(stress);
    this.breath += 0.85 * 2 * Math.PI * 0.25;
    return Math.round(60000 / hr + 0.95 * rmssd * Math.sin(this.breath) + 0.25 * rmssd * gauss());
  }

  private air(ppco2: number, stress: number): Packet {
    this.co2Hour.push(ppco2);
    if (this.co2Hour.length > 720) this.co2Hour.shift(); // an hour at one reading per 5 s
    const hour = this.co2Hour.reduce((a, b) => a + b, 0) / this.co2Hour.length;
    const now = ppco2 + 0.03 * gauss();
    return {
      kind: 'air', header: this.header(),
      co2Ppm: Math.round((now / 760) * 1e6),
      tempC: Math.round((22.4 + 0.1 * gauss()) * 10) / 10,
      humidity: Math.round(46 + 2 * stress + gauss()),
      ppco2: Math.round(now * 100) / 100,
      ppco2Hour: Math.round(hour * 100) / 100,
      nasaStatus: hour > 3 ? 2 : now > 3 ? 1 : 0,
    };
  }

  // 45 quiet minutes before the demo starts, so there is a baseline and a chart to look at
  history(now: Date): [Packet, Date][] {
    const out: [Packet, Date][] = [];
    for (let m = HISTORY_MIN; m >= 1; m--) {
      const minute = new Date(now.getTime() - m * 60_000);
      const intervals: number[] = [];
      for (let total = 0; total < 60_000;) {
        const rr = this.nextRr(0);
        intervals.push(rr);
        total += rr;
      }
      out.push([{ kind: 'rr', header: this.header(), intervalsMs: intervals }, minute]);
      const drift = scene(0, this.story).ppco2 - 0.25 * (m / HISTORY_MIN);
      for (let s = 0; s < 60; s += 5) out.push([this.air(drift, 0), new Date(minute.getTime() + s * 1000)]);
    }
    return out;
  }

  private event(code: number, active: boolean, severity: number, value = 0): Packet | null {
    if (this.active.has(code) === active) return null;
    if (active) this.active.add(code);
    else this.active.delete(code);
    return { kind: 'event', header: this.header(), code, active, severity, value, source: 0 };
  }

  // everything the watch sends in the next 100 ms
  tick(): Packet[] {
    const out: Packet[] = [];
    const t = ((this.ms + this.startMs) / 1000) % CYCLE_S;
    const s = scene(t, this.story);

    if (this.ms === 0) out.push({ kind: 'sim', header: this.header(), demo: false, simulated: 0, batterySimulated: false });

    // 25 ECG samples, starting a new beat whenever the last one has run out
    const mv: number[] = [];
    for (let i = 0; i < ECG_HZ / 10; i++) {
      const at = this.ms / 1000 + i / ECG_HZ;
      if (at >= this.beatStart + this.beatLen) {
        this.beatStart += this.beatLen;
        const rr = this.nextRr(s.stress);
        this.beatLen = rr / 1000;
        if (!s.leadsOff) this.rrPending.push(rr);
      }
      const shape = s.leadsOff ? 0 : ecgShape((at - this.beatStart) / this.beatLen);
      mv.push(Math.round(1500 + 900 * shape + 8 * gauss()));
    }
    out.push({ kind: 'ecg', header: this.header(), mv });

    if (this.ms % 1000 === 0) {
      const { hr } = this.heart(s.stress);
      out.push({
        kind: 'vitals', header: this.header(),
        hrPpg: Math.round(hr + gauss()),
        hrEcg: s.leadsOff ? null : Math.round(hr),
        spo2: Math.random() < 0.7 ? 98 : 97,
        perfusion: Math.round((2.4 - 0.5 * s.stress + 0.1 * gauss()) * 10) / 10,
        skinTemp: Math.round((33.8 - 0.4 * s.stress + 0.03 * gauss()) * 10) / 10,
        activity: 0, tremorHz: null, tremorAmp: 0,
        skinContact: true, motionArtifact: false, leadsOff: s.leadsOff, shock: false,
      });
      if (this.rrPending.length) out.push({ kind: 'rr', header: this.header(), intervalsMs: this.rrPending.splice(0) });
      out.push({
        kind: 'gsr', header: this.header(),
        nanosiemens: Array.from({ length: 10 }, () => Math.round(2000 + 2500 * s.stress + 60 * gauss())),
      });
    }

    if (this.ms % 5000 === 0) {
      out.push(this.air(s.ppco2, s.stress));
      out.push({ kind: 'cabin', header: this.header(), pressurePa: Math.round(101300 + 15 * gauss()), pressureTrend: Math.round(gauss()), lux: 320 });
    }

    if (this.ms % 10_000 === 0) {
      if (this.ms > 0 && this.ms % 300_000 === 0) this.battery = Math.max(20, this.battery - 1);
      const alarms = [...this.active].reduce((bits, code) => bits | (1 << code), 0);
      out.push({ kind: 'status', header: this.header(), batteryMv: 3950, batteryPct: this.battery, sensorsOk: 0xff, alarms, firmware: [1, 0] });
    }

    const events = [
      this.event(EVENT_CODE.stressHigh, s.stress >= 0.6 || (this.active.has(EVENT_CODE.stressHigh) && s.stress > 0.3), 1),
      this.event(EVENT_CODE.co2Early, s.ppco2 > 3 || (this.active.has(EVENT_CODE.co2Early) && s.ppco2 > 2.9), 1, Math.round(s.ppco2 * 100)),
      this.event(EVENT_CODE.leadsOff, s.leadsOff, 0),
    ];
    for (const e of events) if (e) out.push(e);

    this.ms += TICK_MS;
    return out;
  }
}

export const DEMO_TICK_MS = TICK_MS;
