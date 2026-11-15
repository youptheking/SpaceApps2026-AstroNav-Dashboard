export type Status = 'ok' | 'watch' | 'alert';

export interface Vitals {
  hrPpg: number | null;
  hrEcg: number | null;
  rhythmRegular: boolean;
  spo2: number | null;
  perfusion: number | null;
  skinTemp: number | null;
  skinTempSteadySince: string | null;
}

export interface Battery {
  percent: number | null;
  hoursLeft: number | null;
  simulated: boolean;
}

export interface CabinAir {
  // ppCO2 in mmHg, one sample per 10 minutes
  ppco2: number[];
  co2Ppm: number | null;
  pressureKpa: number | null;
  pressureTrendPaMin: number | null;
  tempC: number | null;
  humidity: number | null;
}

export interface BodySystem {
  id: 'nerves' | 'heart' | 'lungs' | 'skin' | 'muscle';
  name: string;
  status: Status;
  state: string;
  what: string;
  inSpace: string;
  whenToAct: string;
}

export interface AlertEvent {
  time: string;
  text: string;
  severity: 'info' | 'warning' | 'alarm';
  raisedBy: 'Wrist' | 'Dashboard' | 'You';
  // null while the alert is still open
  resolution: string | null;
}

export interface CheckIn {
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
  crew: { name: string; role: string; location: string };
  now: string;
  demoMode: boolean;
  connected: boolean;
  deviceName: string;
  // samples are every 10 minutes from this time of day
  seriesStart: string;
  vitals: Vitals;
  battery: Battery;
  hrvBaseline: number;
  hrv: number[];
  stressFrom: string | null;
  cabin: CabinAir;
  systems: BodySystem[];
  alerts: AlertEvent[];
  checkIn: CheckIn;
}
