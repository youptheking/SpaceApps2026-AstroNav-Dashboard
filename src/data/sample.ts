import type { Snapshot } from '../types';
import { hourAverage } from '../lib/health';
import { system } from '../lib/systems';

// ppCO2 (mmHg) every 10 minutes from 08:00
const ppco2 = [
  2.31, 2.28, 2.3, 2.34, 2.29, 2.26, 2.31, 2.35, 2.38, 2.33, 2.3, 2.29, 2.32, 2.36, 2.4, 2.37, 2.33, 2.31, 2.35, 2.39,
  2.42, 2.38, 2.36, 2.41, 2.45, 2.43, 2.4, 2.44, 2.48, 2.51, 2.55, 2.58, 2.62, 2.88, 3.04, 2.86, 2.74, 2.71, 2.7, 2.7,
];

// Shown while no watch is connected. Same numbers as mockups/overview.
export const sample: Snapshot = {
  source: 'sample',
  crew: { name: 'L. Verhoef', role: 'Flight engineer', location: 'ISS, Columbus' },
  now: '14:32:08',
  demoMode: false,
  seriesStart: '08:00',
  seriesStepMinutes: 10,
  vitals: {
    hrPpg: 72,
    hrEcg: 71,
    rhythmRegular: true,
    spo2: 97,
    perfusion: 2.4,
    skinTemp: 33.8,
    skinTempSteadySince: '08:00',
    activity: 0,
    leadsOff: false,
    skinContact: true,
    optical: 'ok',
    opticalHeld: false,
    ecgUsable: true,
  },
  battery: { percent: 85, hoursLeft: 19, simulated: true },
  simulated: { optical: false, co2: false, pressure: false },
  hrvBaseline: 49,
  hrv: [
    50, 48, 51, 49, 52, 50, 47, 49, 51, 50, 48, 49, 51, 47, 45, 44, 42, 43, 41, 40,
    41, 39, 38, 39, 37, 38, 36, 37, 36, 35, 36, 35, 34, 35, 34, 34, 35, 34, 34, 34,
  ],
  hrvNow: 34,
  stressFrom: '10:40',
  cabin: {
    ppco2,
    ppco2Now: 2.7,
    ppco2Hour: hourAverage(ppco2, 10),
    co2Ppm: 3557,
    pressureKpa: 101.2,
    pressureTrendPaMin: -2,
    tempC: 22.4,
    humidity: 46,
  },
  systems: [
    system('nerves', 'watch', 'HRV 31 % below baseline'),
    system('heart', 'ok', '72 bpm at rest, regular'),
    system('lungs', 'ok', 'SpO2 97 %'),
    system('skin', 'ok', '33.8 °C, steady'),
    system('muscle', 'ok', 'Exercise 1:05 of 2:30 h'),
  ],
  alerts: [
    { id: 's1', code: 10, time: '10:40', text: 'Stress rising', severity: 'warning', raisedBy: 'Dashboard', resolution: null },
    { id: 's2', code: 1, time: '13:58', text: 'CO2 above 3 mmHg, peak 3.04', severity: 'warning', raisedBy: 'Wrist', resolution: 'Cleared 14:06' },
    { id: 's3', code: 5, time: '12:15', text: 'ECG electrode loose', severity: 'info', raisedBy: 'Wrist', resolution: 'Fixed 12:17' },
    { id: 's4', code: 7, time: '09:12', text: 'Shock detected, 3.4 g', severity: 'warning', raisedBy: 'Wrist', resolution: 'Seen by you' },
    { id: 's5', code: null, time: '07:05', text: 'Check-in completed', severity: 'info', raisedBy: 'You', resolution: '' },
  ],
  checkIn: {
    dummy: true,
    doneAt: '07:05',
    sleepMinutes: 370,
    sleepGoalMinutes: 420,
    mood: 3,
    moodNote: 'A bit tense',
    systolic: 118,
    diastolic: 76,
    nextBloodPressure: '19:00',
    glucose: 96,
    glucoseNote: 'Before breakfast',
    lastDays: [true, true, false, true, true, true, true, true, true, true, true, true, true, true],
  },
};
