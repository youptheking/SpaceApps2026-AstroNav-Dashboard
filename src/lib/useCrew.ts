import { useCallback, useEffect, useState } from 'react';
import type { Snapshot } from '../types';
import { sample } from '../data/sample';
import { CREW, crewOf, worstOpen, type CrewMember } from './crew';
import type { CwClass } from './cw';
import { DEMO_TICK_MS, DemoWatch } from './demo';
import { LiveModel } from './live';
import { dummyHistory } from './history';
import type { Telemetry } from './useTelemetry';

const REFRESH_MS = 250;

interface DemoCrew {
  member: CrewMember;
  watch: DemoWatch;
  model: LiveModel;
  history: ReturnType<typeof dummyHistory>;
}

export interface CrewEntry {
  member: CrewMember;
  status: CwClass | null;
}

export interface CrewView {
  members: CrewEntry[];
  selected: CrewMember;
  select: (id: string) => void;
  // what the console shows: the real watch, or a pretend watch of another crew member
  telemetry: Telemetry;
}

function startDemos(now = new Date()): DemoCrew[] {
  return CREW.filter((m) => m.kind === 'demo').map((member) => {
    const watch = new DemoWatch(member.demo);
    const model = new LiveModel();
    for (const [p, at] of watch.history(now)) model.apply(p, at);
    // each demo crew member gets their own dummy week; Okafor's has a CO2 day, like their story
    const seed = [...member.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
    const history = dummyHistory(now.getTime(), {
      restingHr: member.demo?.restingHr,
      seed,
      co2Peak: member.demo?.story === 'co2' ? 6 * 24 + 10 : 2 * 24 + 15,
    });
    return { member, watch, model, history };
  });
}

const snapshotOf = (d: DemoCrew): Snapshot => ({
  ...d.model.snapshot({ crew: crewOf(d.member), checkIn: sample.checkIn }),
  source: 'demo',
});

// The whole crew. The pretend watches keep running while another crew member is on screen,
// so their alerts show up in the crew list straight away.
export function useCrew(real: Telemetry): CrewView {
  const [demos] = useState(startDemos);
  const [snaps, setSnaps] = useState<Record<string, Snapshot>>(() =>
    Object.fromEntries(demos.map((d) => [d.member.id, snapshotOf(d)])));
  const [selectedId, setSelectedId] = useState(CREW[0]!.id);

  useEffect(() => {
    const tick = setInterval(() => {
      const now = new Date();
      for (const d of demos) for (const p of d.watch.tick()) d.model.apply(p, now);
    }, DEMO_TICK_MS);
    const refresh = setInterval(() => {
      setSnaps(Object.fromEntries(demos.map((d) => [d.member.id, snapshotOf(d)])));
    }, REFRESH_MS);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [demos]);

  const select = useCallback((id: string) => setSelectedId(id), []);

  const members: CrewEntry[] = CREW.map((member) => ({
    member,
    status: worstOpen(member.kind === 'watch' ? real.data.alerts : snaps[member.id]?.alerts ?? []),
  }));

  const selected = CREW.find((m) => m.id === selectedId) ?? CREW[0]!;
  const demo = demos.find((d) => d.member.id === selected.id);
  const telemetry: Telemetry = demo
    ? {
      ...real,
      data: snaps[demo.member.id]!,
      // a pretend watch has nothing to send to; handling an alert closes it in its model
      sendAlert: async () => true,
      markHandled: (id) => demo.model.markHandled(id),
      silence: async () => true,
      ecgSamples: () => demo.model.ecgSamples(),
      history: { minutes: demo.history, source: 'dummy', status: 'done', received: demo.history.length, total: demo.history.length },
    }
    : real;

  return { members, selected, select, telemetry };
}
