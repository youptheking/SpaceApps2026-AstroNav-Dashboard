import { EVENT_CODE } from './packets';

// One caution and warning lamp per parameter, in the order they sit along the top of the console.
export const LAMPS = [
  { label: 'ppCO2', codes: [EVENT_CODE.co2Limit, EVENT_CODE.co2Early] },
  { label: 'Cabin press', codes: [EVENT_CODE.pressureDrop] },
  { label: 'SpO2', codes: [EVENT_CODE.spo2Low] },
  { label: 'Heart rate', codes: [EVENT_CODE.hrHigh, EVENT_CODE.hrLow] },
  { label: 'Stress', codes: [EVENT_CODE.stressHigh] },
  { label: 'ECG leads', codes: [EVENT_CODE.leadsOff] },
  { label: 'Skin contact', codes: [EVENT_CODE.noSkinContact] },
  { label: 'Shock', codes: [EVENT_CODE.shock] },
  { label: 'Climate', codes: [EVENT_CODE.cabinClimate] },
  { label: 'Wrist batt', codes: [EVENT_CODE.batteryLow] },
] as const;

export type LampLabel = (typeof LAMPS)[number]['label'];

export const lampOf = (code: number): LampLabel | null =>
  LAMPS.find((l) => (l.codes as readonly number[]).includes(code))?.label ?? null;
