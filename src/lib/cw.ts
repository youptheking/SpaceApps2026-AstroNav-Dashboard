import type { AlertEvent } from '../types';
import { EVENT_CODE } from './packets';

// ISS caution and warning classes; a rapid depress is the one emergency the watch can see
export type CwClass = 'emergency' | 'warning' | 'caution' | 'advisory';

export function cwClass(a: Pick<AlertEvent, 'code' | 'severity'>): CwClass {
  if (a.severity === 'alarm') return a.code === EVENT_CODE.pressureDrop ? 'emergency' : 'warning';
  return a.severity === 'warning' ? 'caution' : 'advisory';
}

