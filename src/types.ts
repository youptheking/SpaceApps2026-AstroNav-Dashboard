import type { OpticalQuality } from './lib/signal';

export type Status = 'ok' | 'watch' | 'alert';

// null in a series means no reading in that interval
export type Series = (number | null)[];

export interface Vitals {
  hrPpg: number | null;
  hrEcg: number | null;
  rhythmRegular: boolean;
  spo2: number | null;
  perfusion: number | null;
  skinTemp: number | null;
  skinTempSteadySince: string | null;
  activity: number | null;
  leadsOff: boolean;
  skinContact: boolean;
  // whether the optical sensor reading is trustworthy; hrPpg and spo2 are null when it is not
  optical: OpticalQuality;
  // hrPpg and spo2 are the last trusted reading of a few seconds ago, held over a short dropout
  opticalHeld: boolean;
  // whether the ECG looks like a heartbeat rather than mains hum, overload or a flat line
  ecgUsable: boolean;
}

export interface Battery {
  percent: number | null;
  hoursLeft: number | null;
  simulated: boolean;
}

export interface CabinAir {
  // ppCO2 in mmHg, one value per series step
  ppco2: Series;
  ppco2Now: number | null;
  ppco2Hour: number | null;
  co2Ppm: number | null;
  pressureKpa: number | null;
  pressureTrendPaMin: number | null;
  tempC: number | null;
  humidity: number | null;
}

// which values the watch filled in itself in demo mode
export interface Simulated {
  optical: boolean;
  co2: boolean;
  pressure: boolean;
}

export interface BodySystem {
  id: 'nerves' | 'heart' | 'lungs' | 'skin' | 'muscle';
  name: string;
  status: Status;
  state: string;
  what: string;
  inSpace: string;
  whenToAct: string;
  // NASA Human Research Program: the hazard of spaceflight and the HRP risks this system relates to
  hazard: string;
  risks: string[];
}

export interface AlertEvent {
  id: string;
  code: number | null;
  time: string;
  text: string;
  severity: 'info' | 'warning' | 'alarm';
  raisedBy: 'Wrist' | 'Dashboard' | 'You';
  // null while the alert is still open
  resolution: string | null;
}

export interface CheckIn {
  // example values, not filled in by anyone
  dummy?: boolean;
  doneAt: string | null;
  sleepMinutes: number | null;
  sleepGoalMinutes: number;
  mood: number | null;
  moodNote: string;
  systolic: number | null;
  diastolic: number | null;
  nextBloodPressure: string;
  glucose: number | null;
  glucoseNote: string;
  // oldest first, today last
  lastDays: boolean[];
}

export interface Snapshot {
  source: 'sample' | 'live' | 'demo';
  crew: { name: string; role: string; location: string };
  now: string;
  demoMode: boolean;
  // series start at this time of day and step by this many minutes
  seriesStart: string;
  seriesStepMinutes: number;
  vitals: Vitals;
  battery: Battery;
  simulated: Simulated;
  hrvBaseline: number | null;
  hrv: Series;
  // RMSSD over the last minute of beats
  hrvNow: number | null;
  stressFrom: string | null;
  cabin: CabinAir;
  systems: BodySystem[];
  alerts: AlertEvent[];
  checkIn: CheckIn;
}
