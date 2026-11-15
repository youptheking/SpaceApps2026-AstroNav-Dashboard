import type { Snapshot, Status } from '../types';
import { PPCO2_LIMIT } from './health';

// NASA's Human Research Program groups the dangers of spaceflight into five hazards
// (nasa.gov/hrp/hazards). This is what AstroNav does for each, with the HRP risk titles
// from nasa.gov/hrp/risks.

export type Coverage = 'covered' | 'partly' | 'none';

export interface Hazard {
  id: 'radiation' | 'isolation' | 'distance' | 'gravity' | 'environment';
  name: string;
  nasa: string;
  coverage: Coverage;
  measures: string;
  risks: string[];
}

export const HAZARDS: Hazard[] = [
  {
    id: 'isolation',
    name: 'Isolation and Confinement',
    nasa: 'Behavioral responses occur among groups of people far from Earth who are isolated and confined in a small space over a long period of time.',
    coverage: 'covered',
    measures: 'Stress from HRV (chest ECG) and skin conductance, the daily check-in for sleep and mood, and a breathing break sent to the wrist.',
    risks: ['Risk of Behavioral Changes and Psychiatric Disorders', 'Risk of Inadequate Sleep and Irregular Schedules'],
  },
  {
    id: 'gravity',
    name: 'Gravity Fields',
    nasa: 'Astronauts’ entire bodies – muscles, bones, inner ear, and organs – must adjust to the new gravities encountered.',
    coverage: 'covered',
    measures: 'Heart rate and rhythm from ECG and the optical sensor, activity and tremor from the motion sensor, and 7-day trends of both.',
    risks: ['Risk of Cardiovascular Adaptations', 'Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness', 'Risk of Spaceflight-Induced Bone Changes'],
  },
  {
    id: 'environment',
    name: 'Hostile/Closed Environments',
    nasa: 'Maintaining a safe ecosystem inside a spacecraft presents unique challenges, from ensuring optimal temperatures, pressures, and lighting, to … tracking immune responses.',
    coverage: 'covered',
    measures: 'Cabin CO2 against the NASA-STD-3001 limit, cabin pressure and leak detection, temperature and humidity, SpO2, and the skin-temperature trend.',
    risks: ['Risk of Hypoxia', 'Risk of Altered Immune System Responses'],
  },
  {
    id: 'distance',
    name: 'Distance from Earth',
    nasa: 'Instructions, new supplies, medical care, and more become increasingly challenging to receive from Earth as astronauts venture deeper into space.',
    coverage: 'partly',
    measures: 'The watch warns on its own, without this laptop or the ground: alarms on the screen and the buzzer, and 7 days of data kept on the wrist.',
    risks: ['Risk of Inadequate Systems Operations Support'],
  },
  {
    id: 'radiation',
    name: 'Space Radiation',
    nasa: 'Invisible to the human eye, space radiation is not only stealthy but considered one of the most hazardous aspects of spaceflight.',
    coverage: 'none',
    measures: 'Not measured. The watch has no radiation sensor. A next step is a dosimeter, such as the compact neutron spectrometer CANS the Canadian Space Agency is developing.',
    risks: ['Risk of Radiation-Induced Cancers'],
  },
];

// how the hazard looks right now, from the body systems and the cabin air
export function hazardStatus(h: Hazard, s: Snapshot): Status | null {
  if (h.coverage === 'none') return null;
  const sys = (ids: string[]) => s.systems.filter((x) => ids.includes(x.id)).map((x) => x.status);
  const worst = (xs: Status[]): Status => (xs.includes('alert') ? 'alert' : xs.includes('watch') ? 'watch' : 'ok');
  switch (h.id) {
    case 'isolation': return worst(sys(['nerves']));
    case 'gravity': return worst(sys(['heart', 'muscle']));
    case 'environment': {
      const air: Status[] = [];
      if ((s.cabin.ppco2Hour ?? 0) > PPCO2_LIMIT) air.push('alert');
      else if ((s.cabin.ppco2Now ?? 0) > PPCO2_LIMIT) air.push('watch');
      if (s.cabin.pressureTrendPaMin !== null && s.cabin.pressureTrendPaMin <= -50) air.push('alert');
      return worst([...sys(['lungs', 'skin']), ...air]);
    }
    case 'distance': return 'ok';
    default: return null;
  }
}
