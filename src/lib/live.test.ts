import { describe, expect, test } from 'vitest';
import { LiveModel } from './live';
import type { Packet } from './packets';
import { sample } from '../data/sample';

const header = { seq: 1, tMs: 0 };
const base = { crew: sample.crew, checkIn: sample.checkIn };
const at = (min: number, sec = 0) => new Date(Date.UTC(2026, 10, 15, 14, min, sec));

const event = (code: number, active: boolean, severity = 1, value = 0, source = 0): Packet =>
  ({ kind: 'event', header, code, active, severity, value, source });

describe('LiveModel', () => {
  test('vitals and air come through in physical units', () => {
    const m = new LiveModel();
    m.apply({
      kind: 'vitals', header, hrPpg: 72, hrEcg: 71, spo2: 97, perfusion: 2.4, skinTemp: 33.8, activity: 0,
      tremorHz: null, tremorAmp: 0, skinContact: true, motionArtifact: false, leadsOff: false, shock: false,
    }, at(30));
    m.apply({ kind: 'air', header, co2Ppm: 3557, tempC: 22.4, humidity: 46, ppco2: 2.7, ppco2Hour: 2.41, nasaStatus: 1 }, at(30));
    const s = m.snapshot(base, at(30, 5));
    expect(s.source).toBe('live');
    expect(s.vitals.spo2).toBe(97);
    expect(s.cabin.ppco2Hour).toBe(2.41);
    expect(s.cabin.ppco2.at(-1)).toBe(2.7);
    expect(s.systems.find((x) => x.id === 'lungs')?.state).toBe('SpO2 97 %');
  });

  test('optical values taken during movement or with a weak pulse are not shown or acted on', () => {
    const m = new LiveModel();
    m.apply({
      kind: 'vitals', header, hrPpg: 130, hrEcg: null, spo2: 91, perfusion: 0.2, skinTemp: 34.1, activity: 0,
      tremorHz: null, tremorAmp: 0, skinContact: true, motionArtifact: true, leadsOff: false, shock: false,
    }, at(30));
    const s = m.snapshot(base, at(30, 5));
    expect(s.vitals.spo2).toBeNull();
    expect(s.vitals.hrPpg).toBeNull();
    expect(s.vitals.optical).toBe('motion');
    expect(s.vitals.perfusion).toBe(0.2);
    expect(s.systems.find((x) => x.id === 'lungs')?.status).toBe('ok');
  });

  test('mains hum on the ECG marks it unusable', () => {
    const m = new LiveModel();
    for (let i = 0; i < 30; i++) m.apply({ kind: 'ecg', header, mv: Array.from({ length: 25 }, (_, j) => [2175, 3159, 2450, 150, 0][j % 5]!) }, at(30));
    expect(m.snapshot(base, at(30, 1)).vitals.ecgUsable).toBe(false);
  });

  test('an alert opens, gets worse in place and clears', () => {
    const m = new LiveModel();
    m.apply(event(2, true, 1, 93), at(10));
    m.apply(event(2, true, 2, 89), at(11));
    let s = m.snapshot(base, at(11));
    expect(s.alerts).toHaveLength(1);
    expect(s.alerts[0]).toMatchObject({ time: '14:10', severity: 'alarm', text: 'Blood oxygen low, 89 %', resolution: null });
    m.apply(event(2, false), at(14));
    s = m.snapshot(base, at(14));
    expect(s.alerts[0]?.resolution).toBe('Cleared 14:14');
  });

  test('a double tap on the watch marks the alert as seen', () => {
    const m = new LiveModel();
    m.apply(event(7, true, 1, 3400), at(5));
    m.apply(event(11, true, 0, 7, 2), at(6));
    expect(m.snapshot(base, at(6)).alerts[0]?.resolution).toBe('Seen by you');
  });

  test('stress start time follows event code 10', () => {
    const m = new LiveModel();
    m.apply(event(10, true), at(40));
    expect(m.snapshot(base, at(41)).stressFrom).toBe('14:40');
    m.apply(event(10, false), at(50));
    expect(m.snapshot(base, at(50)).stressFrom).toBeNull();
  });

  test('HRV baseline needs five minutes of beats', () => {
    const m = new LiveModel();
    for (let min = 0; min < 5; min++) {
      m.apply({ kind: 'rr', header, intervalsMs: [800, 850, 800, 850, 800] }, at(min));
      expect(m.snapshot(base, at(min)).hrvBaseline).toBe(min < 4 ? null : 50);
    }
  });

  test('SIM bits mark simulated values', () => {
    const m = new LiveModel();
    m.apply({ kind: 'sim', header, demo: true, simulated: 0b0010_1000, batterySimulated: true }, at(0));
    const s = m.snapshot(base, at(0));
    expect(s.demoMode).toBe(true);
    expect(s.simulated).toEqual({ optical: false, co2: true, pressure: false });
    expect(s.battery.simulated).toBe(true);
  });
});
