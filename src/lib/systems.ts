import type { BodySystem, Status, Vitals } from '../types';
import { percentFromBaseline, spo2Level } from './health';

type Text = Pick<BodySystem, 'name' | 'what' | 'inSpace' | 'whenToAct' | 'hazard' | 'risks'>;

// Hazards and risk titles as NASA's Human Research Program names them (nasa.gov/hrp/hazards, nasa.gov/hrp/risks).

export const SYSTEM_TEXT: Record<BodySystem['id'], Text> = {
  nerves: {
    name: 'Brain and stress',
    what: 'Heart rate variability and skin conductance show how hard your nervous system is working.',
    inSpace: 'Isolation, a packed schedule and broken sleep keep the stress response switched on. On long missions this is one of the main risks NASA tracks.',
    whenToAct: 'Take a break when HRV stays well below your own baseline for more than 10 minutes. Talk to the flight surgeon if it lasts for days.',
    hazard: 'Isolation and Confinement',
    risks: ['Risk of Behavioral Changes and Psychiatric Disorders', 'Risk of Inadequate Sleep and Irregular Schedules'],
  },
  heart: {
    name: 'Heart',
    what: 'Heart rate from the optical sensor and from the ECG, plus the rhythm between beats.',
    inSpace: 'In weightlessness blood shifts towards the head and the heart has less work to do. Over months it can lose some of its strength.',
    whenToAct: 'A resting heart rate above 120 bpm for 5 minutes, or below 40, raises an alert on your wrist.',
    hazard: 'Gravity Fields',
    risks: ['Risk of Cardiovascular Adaptations'],
  },
  lungs: {
    name: 'Lungs and oxygen',
    what: 'How much of your blood is carrying oxygen.',
    inSpace: 'Cabin air is closed and recycled. A fault in life support shows up here and in the CO2 reading.',
    whenToAct: 'Healthy is 95 % or above. 94 % or below for 30 seconds is a warning, below 90 % an alarm (WHO). Stop exercising and check the cabin air.',
    hazard: 'Hostile/Closed Environments',
    risks: ['Risk of Hypoxia'],
  },
  skin: {
    name: 'Skin and temperature',
    what: 'Temperature measured at the wrist. It follows trends, it is not your core temperature.',
    inSpace: 'The immune system changes in space and infections can start quietly. A slow rise over a day is worth noting.',
    whenToAct: 'Compare with your own normal range rather than a fixed number. Log how you feel in the check-in.',
    hazard: 'Hostile/Closed Environments',
    risks: ['Risk of Altered Immune System Responses'],
  },
  muscle: {
    name: 'Muscles and bones',
    what: 'Movement from the wrist sensor: rest, light or intense activity, and tremor.',
    inSpace: 'Without gravity, bones lose 1 to 1.5 % of their mass per month and muscles shrink. Daily exercise is the main protection.',
    whenToAct: 'Plan the rest of today’s exercise. A new tremor at rest is worth reporting.',
    hazard: 'Gravity Fields',
    risks: ['Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness', 'Risk of Spaceflight-Induced Bone Changes'],
  },
};

const ACTIVITY = ['At rest', 'Light activity', 'Intense activity'];

export function system(id: BodySystem['id'], status: Status, state: string): BodySystem {
  return { id, status, state, ...SYSTEM_TEXT[id] };
}

interface Input {
  vitals: Vitals;
  hrvNow: number | null;
  hrvBaseline: number | null;
  stressActive: boolean;
  activeCodes: Set<number>;
}

// Status per body system from the latest readings and the alerts the watch has raised.
export function deriveSystems({ vitals, hrvNow, hrvBaseline, stressActive, activeCodes }: Input): BodySystem[] {
  const drop = hrvNow !== null && hrvBaseline !== null ? percentFromBaseline(hrvNow, hrvBaseline) : null;
  const nervesState = drop !== null ? `HRV ${Math.abs(drop)} % ${drop < 0 ? 'below' : 'above'} baseline` : 'Learning your baseline';
  const nerves = system('nerves', stressActive || (drop !== null && drop <= -30) ? 'watch' : 'ok', nervesState);

  const hr = vitals.hrEcg ?? vitals.hrPpg;
  const heartStatus: Status = activeCodes.has(3) || activeCodes.has(4) ? 'watch' : 'ok';
  const heart = system('heart', heartStatus, hr === null ? 'No reading' : `${hr} bpm${vitals.activity === 0 ? ' at rest' : ''}${vitals.hrEcg !== null ? `, ${vitals.rhythmRegular ? 'regular' : 'irregular'}` : ''}`);

  const spo2 = vitals.spo2;
  const lungsStatus: Status = ({ ok: 'ok', warning: 'watch', alarm: 'alert' } as const)[spo2Level(spo2)];
  const lungs = system('lungs', activeCodes.has(2) && lungsStatus === 'ok' ? 'watch' : lungsStatus, spo2 === null ? (vitals.skinContact ? 'No reading' : 'No skin contact') : `SpO2 ${spo2} %`);

  const skin = system('skin', 'ok', vitals.skinTemp === null ? 'No reading' : `${vitals.skinTemp.toFixed(1)} °C at the wrist`);

  const muscle = system('muscle', activeCodes.has(7) ? 'watch' : 'ok', vitals.activity === null ? 'No reading' : ACTIVITY[vitals.activity] ?? 'Moving');

  return [nerves, heart, lungs, skin, muscle];
}
