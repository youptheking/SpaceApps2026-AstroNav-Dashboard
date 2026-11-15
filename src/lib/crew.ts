import type { AlertEvent, Snapshot } from '../types';
import { cwClass, type CwClass } from './cw';
import type { DemoOptions } from './demo';

// One crew member, each with their own wrist station. Only the first one is a real watch;
// the others are pretend watches on this laptop, to show the console for a whole crew.
export interface CrewMember {
  id: string;
  name: string;
  role: string;
  location: string;
  kind: 'watch' | 'demo';
  demo?: DemoOptions;
}

export const CREW: CrewMember[] = [
  { id: 'watch', name: 'L. Verhoef', role: 'Flight engineer', location: 'Columbus', kind: 'watch' },
  { id: 'demo-1', name: 'A. Okafor', role: 'Commander', location: 'Destiny', kind: 'demo',
    demo: { story: 'co2', startS: 100, restingHr: 64, restingRmssd: 55 } },
  { id: 'demo-2', name: 'M. Sato', role: 'Mission specialist', location: 'Kibo', kind: 'demo',
    demo: { story: 'stress', startS: 75, restingHr: 74, restingRmssd: 42 } },
  { id: 'demo-3', name: 'R. Costa', role: 'Flight engineer', location: 'Harmony', kind: 'demo',
    demo: { story: 'calm', startS: 0, restingHr: 61, restingRmssd: 60 } },
];

const RANK: Record<CwClass, number> = { advisory: 1, caution: 2, warning: 3, emergency: 4 };

// the most serious open alert, for the dot next to a crew member's name
export function worstOpen(alerts: AlertEvent[]): CwClass | null {
  return alerts
    .filter((a) => a.resolution === null && a.code !== null)
    .map(cwClass)
    .sort((a, b) => RANK[b] - RANK[a])[0] ?? null;
}

export const crewOf = (m: CrewMember): Snapshot['crew'] => ({ name: m.name, role: m.role, location: `ISS, ${m.location}` });
