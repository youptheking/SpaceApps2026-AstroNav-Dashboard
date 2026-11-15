import type { Snapshot } from '../types';
import { EVENT_CODE, WRIST_MESSAGE } from './packets';
import { PPCO2_LIMIT } from './health';

export interface Advice {
  title: string;
  why: string;
  // what to send to the watch with control 0x04, if anything
  wrist?: { code: number; severity: number; messageId: number; label: string };
}

// The most urgent thing to do now. Advice, not a diagnosis.
export function adviceFor(s: Snapshot): Advice {
  const { vitals, cabin } = s;
  const active = (code: number) => s.alerts.some((a) => a.code === code && a.resolution === null);

  if (cabin.pressureTrendPaMin !== null && cabin.pressureTrendPaMin <= -50 || active(EVENT_CODE.pressureDrop)) {
    return {
      title: 'Check the cabin for a leak',
      why: `Cabin pressure is falling by ${Math.abs(cabin.pressureTrendPaMin ?? 0)} Pa per minute. Follow the depress procedure and tell the ground.`,
      wrist: { code: EVENT_CODE.pressureDrop, severity: 2, messageId: WRIST_MESSAGE.pressureDrop, label: 'Alert on wrist' },
    };
  }
  if (vitals.spo2 !== null && vitals.spo2 < 94) {
    return {
      title: 'Stop and rest, oxygen is low',
      why: `Your SpO2 is ${vitals.spo2} %. Stop exercising, breathe calmly and check the cabin air. Below 90 % for long, contact the flight surgeon.`,
      wrist: { code: EVENT_CODE.spo2Low, severity: vitals.spo2 < 90 ? 2 : 1, messageId: WRIST_MESSAGE.oxygenLow, label: 'Alert on wrist' },
    };
  }
  if ((cabin.ppco2Hour ?? 0) > PPCO2_LIMIT || (cabin.ppco2Now ?? 0) > PPCO2_LIMIT) {
    return {
      title: 'Check the ventilation',
      why: (cabin.ppco2Hour ?? 0) > PPCO2_LIMIT
        ? 'The 1-hour CO2 average is over the NASA limit of 3 mmHg. Headaches start around this level. Move to a ventilated module and check the CO2 scrubber.'
        : `CO2 where you are is ${cabin.ppco2Now?.toFixed(2)} mmHg, above the 3 mmHg NASA allows over an hour. Air does not mix on its own in weightlessness; move to where the fans are or check the scrubber.`,
      wrist: { code: EVENT_CODE.co2Limit, severity: 1, messageId: WRIST_MESSAGE.co2High, label: 'Alert on wrist' },
    };
  }
  if (s.stressFrom) {
    return {
      title: 'Take a 2-minute breathing break',
      why: `Your HRV has been low since ${s.stressFrom} and your skin conductance is up. Slow breathing usually brings HRV back within 15 minutes.`,
      wrist: { code: EVENT_CODE.stressHigh, severity: 1, messageId: WRIST_MESSAGE.breathing, label: 'Start on wrist' },
    };
  }
  if (vitals.leadsOff) {
    return {
      title: 'Reattach the ECG electrode',
      why: 'One of the chest electrodes is loose, so heart rhythm and HRV are not measured.',
      wrist: { code: EVENT_CODE.leadsOff, severity: 0, messageId: WRIST_MESSAGE.electrodeLoose, label: 'Remind on wrist' },
    };
  }
  return {
    title: 'Nothing to do right now',
    why: 'All readings are in range. Keep to your exercise plan and do the check-in tonight.',
  };
}
