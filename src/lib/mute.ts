import type { LampLabel } from './lamps';

// Which lamps have their sound muted. Muting silences the watch's buzzer for that parameter;
// the lamp stays lit, so a muted problem is never hidden.
const KEY = 'astronav.muted';

export function loadMuted(): Set<LampLabel> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as LampLabel[]) : []);
  } catch {
    return new Set();
  }
}

export function saveMuted(muted: Set<LampLabel>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...muted]));
  } catch {
    // private mode or blocked storage: the choice lasts until the app closes
  }
}
