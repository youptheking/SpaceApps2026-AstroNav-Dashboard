// Mirrors protocol.rs: what the backend emits as 'telemetry' events, already in physical units.

interface Header { seq: number; tMs: number }

export type Packet =
  | { kind: 'ecg'; header: Header; mv: number[] }
  | { kind: 'ppg'; header: Header; red: number[]; ir: number[] }
  | { kind: 'imu'; header: Header; samples: number[][] }
  | { kind: 'gsr'; header: Header; nanosiemens: number[] }
  | {
      kind: 'vitals'; header: Header;
      hrPpg: number | null; hrEcg: number | null; spo2: number | null; perfusion: number | null;
      skinTemp: number | null; activity: number | null; tremorHz: number | null; tremorAmp: number | null;
      skinContact: boolean; motionArtifact: boolean; leadsOff: boolean; shock: boolean;
    }
  | { kind: 'rr'; header: Header; intervalsMs: number[] }
  | {
      kind: 'air'; header: Header;
      co2Ppm: number | null; tempC: number | null; humidity: number | null;
      ppco2: number | null; ppco2Hour: number | null; nasaStatus: number | null;
    }
  | { kind: 'cabin'; header: Header; pressurePa: number | null; pressureTrend: number | null; lux: number | null }
  | {
      kind: 'status'; header: Header;
      batteryMv: number | null; batteryPct: number | null; sensorsOk: number; alarms: number; firmware: [number, number];
    }
  | { kind: 'sim'; header: Header; demo: boolean; simulated: number; batterySimulated: boolean }
  | { kind: 'event'; header: Header; code: number; active: boolean; severity: number; value: number; source: number };

export type LinkStatus =
  | { state: 'unavailable' }
  | { state: 'disconnected'; reason: string | null }
  | { state: 'scanning' }
  | { state: 'connecting'; name: string }
  | { state: 'connected'; name: string };

// STATUS.sensors_ok and SIM.simulated share these bits
export const SENSOR = { max30102: 1, ad8232: 2, mpu6050: 4, scd41: 8, bmp180: 16, bh1750: 32, oled: 64, gsr: 128 } as const;

export const EVENT_CODE = {
  co2Limit: 0, co2Early: 1, spo2Low: 2, hrHigh: 3, hrLow: 4, leadsOff: 5, noSkinContact: 6,
  shock: 7, pressureDrop: 8, batteryLow: 9, stressHigh: 10, acknowledged: 11, cabinClimate: 12,
} as const;

// OLED texts the watch knows for control 0x04
export const WRIST_MESSAGE = {
  rest: 0, breathing: 1, co2High: 2, oxygenLow: 3, pressureDrop: 4, sleepShort: 5, electrodeLoose: 6, batteryLow: 7,
} as const;

export function eventText(code: number, value: number): string {
  switch (code) {
    case 0: return `CO2 above the NASA limit, ${(value / 100).toFixed(2)} mmHg`;
    case 1: return `CO2 above 3 mmHg, ${(value / 100).toFixed(2)}`;
    case 2: return `Blood oxygen low, ${value} %`;
    case 3: return `Heart rate high at rest, ${value} bpm`;
    case 4: return `Heart rate low, ${value} bpm`;
    case 5: return 'ECG electrode loose';
    case 6: return 'No skin contact';
    case 7: return `Shock detected, ${(value / 1000).toFixed(1)} g`;
    case 8: return `Cabin pressure dropping, ${value} Pa/min`;
    case 9: return `Wrist battery low, ${value} %`;
    case 10: return 'Stress rising';
    case 11: return 'Seen on the watch';
    case 12: return `Cabin climate out of range, ${(value / 100).toFixed(1)} °C`;
    default: return `Event ${code}`;
  }
}
