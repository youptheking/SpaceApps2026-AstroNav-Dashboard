import { expect, test } from 'vitest';
import { sample } from '../data/sample';
import { HAZARDS, hazardStatus } from './hazards';

test('all five NASA HRP hazards are listed, radiation honestly as not measured', () => {
  expect(HAZARDS.map((h) => h.name)).toEqual([
    'Isolation and Confinement', 'Gravity Fields', 'Hostile/Closed Environments', 'Distance from Earth', 'Space Radiation',
  ]);
  const radiation = HAZARDS.find((h) => h.id === 'radiation')!;
  expect(radiation.coverage).toBe('none');
  expect(hazardStatus(radiation, sample)).toBeNull();
});

test('a cabin over the NASA CO2 limit turns the closed-environment hazard red', () => {
  const env = HAZARDS.find((h) => h.id === 'environment')!;
  const over = { ...sample, cabin: { ...sample.cabin, ppco2Hour: 3.2 } };
  expect(hazardStatus(env, over)).toBe('alert');
  const leak = { ...sample, cabin: { ...sample.cabin, ppco2Hour: 2.4, ppco2Now: 2.4, pressureTrendPaMin: -80 } };
  expect(hazardStatus(env, leak)).toBe('alert');
});
