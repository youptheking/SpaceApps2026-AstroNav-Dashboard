import { useCallback, useEffect, useRef, useState } from 'react';
import type { BodySystem } from '../types';
import type { Telemetry } from '../lib/useTelemetry';
import type { CrewView } from '../lib/useCrew';
import { adviceFor } from '../lib/advice';
import { sampleTimes } from '../lib/health';
import { openExternal } from '../lib/external';
import { lampOf, type LampLabel } from '../lib/lamps';
import { loadMuted, saveMuted } from '../lib/mute';
import { AlertsLog, EventLog } from '../components/AlertsLog';
import { Annunciators } from '../components/Annunciators';
import { CrewStatus, EcgSetup, SystemDetail } from '../components/BodyMap';
import { CabinAir, CabinDetail } from '../components/CabinAir';
import { CheckIn, CheckInBar } from '../components/CheckIn';
import { ConsoleBar } from '../components/ConsoleBar';
import { HrvChart, HrvDetail } from '../components/HrvTrend';
import { LinkControl } from '../components/LinkControl';
import { MuteControl } from '../components/MuteControl';
import { NextStep } from '../components/NextStep';
import { Panel } from '../components/Panel';
import { Popup } from '../components/Popup';
import { VitalsStrip } from '../components/VitalsStrip';

type Pop =
  | { kind: 'link' }
  | { kind: 'system'; id: BodySystem['id'] }
  | { kind: 'ecg' }
  | { kind: 'hrv' }
  | { kind: 'cabin' }
  | { kind: 'log' }
  | { kind: 'checkin' }
  | { kind: 'mute' };

export function Overview({ telemetry, gmt, crew }: { telemetry: Telemetry; gmt: string; crew: CrewView }) {
  const { data, link } = telemetry;
  const [pop, setPop] = useState<Pop | null>(null);
  // handled here right away, so the row changes before the next update from the watch
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const close = useCallback(() => setPop(null), []);
  const [muted, setMutedState] = useState<Set<LampLabel>>(loadMuted);
  const setMuted = (next: Set<LampLabel>) => {
    setMutedState(next);
    saveMuted(next);
  };
  // alerts already silenced on the watch, so each one is sent once
  const silenced = useRef(new Set<string>());
  const { silence } = telemetry;

  // a new alert on a muted lamp: stop the watch's buzzer for it right away; the lamp and the log keep it
  useEffect(() => {
    for (const a of data.alerts) {
      if (a.resolution !== null || a.code === null || silenced.current.has(a.id)) continue;
      const lamp = lampOf(a.code);
      if (!lamp || !muted.has(lamp)) continue;
      const code = a.code;
      silenced.current.add(a.id);
      // not connected right now: try again on the next update
      void silence(code).then((ok) => { if (!ok) silenced.current.delete(a.id); });
    }
  }, [data.alerts, muted, silence]);
  const times = sampleTimes(data.seriesStart, data.hrv.length, data.seriesStepMinutes);
  const linkLost = link.state === 'reconnecting' || (link.state === 'disconnected' && telemetry.error !== null);

  // the link window has done its job once the watch is unlocked
  useEffect(() => {
    if (link.state === 'connected') setPop((p) => (p?.kind === 'link' ? null : p));
  }, [link.state]);

  const markHandled = (id: string, code: number | null) => {
    setHandled((h) => new Set(h).add(id));
    telemetry.markHandled(id, code);
  };

  const popup = (p: Pop) => {
    switch (p.kind) {
      case 'link':
        return <Popup title="Wrist station link" onClose={close}><LinkControl telemetry={telemetry} /></Popup>;
      case 'system': {
        const s = data.systems.find((x) => x.id === p.id);
        return <Popup title={s?.name ?? 'Body system'} onClose={close}><SystemDetail systems={data.systems} id={p.id} /></Popup>;
      }
      case 'ecg':
        return <Popup title="ECG electrode placement" onClose={close}><EcgSetup leadsOff={data.vitals.leadsOff} /></Popup>;
      case 'hrv':
        return (
          <Popup title="Heart rate variability" onClose={close} wide>
            <HrvDetail times={times} hrv={data.hrv} baseline={data.hrvBaseline} stressFrom={data.stressFrom} />
          </Popup>
        );
      case 'cabin':
        return (
          <Popup title="Cabin air" onClose={close} wide>
            <CabinDetail cabin={data.cabin} simulated={data.simulated} times={times} />
          </Popup>
        );
      case 'log':
        return (
          <Popup title="Event log, today" onClose={close} wide>
            <AlertsLog alerts={data.alerts} handled={handled} onHandled={markHandled} />
          </Popup>
        );
      case 'checkin':
        return <Popup title="Daily check-in" onClose={close}><CheckIn data={data.checkIn} /></Popup>;
      case 'mute':
        return <Popup title="Alarm sound" onClose={close}><MuteControl muted={muted} onChange={setMuted} /></Popup>;
    }
  };

  return (
    <div className="console">
      <ConsoleBar
        data={data}
        link={link}
        gmt={gmt}
        demo={telemetry.demo}
        onDemo={telemetry.setDemo}
        onLink={() => setPop({ kind: 'link' })}
        crew={crew}
      />
      <Annunciators alerts={data.alerts} vitals={data.vitals} link={link} linkLost={linkLost} muted={muted} onOpen={() => setPop({ kind: 'log' })} />

      <main className="deck">
        <VitalsStrip
          vitals={data.vitals}
          battery={data.battery}
          simulated={data.simulated}
          hrvNow={data.hrvNow}
          hrvBaseline={data.hrvBaseline}
          ecgSamples={telemetry.ecgSamples}
          onLeads={() => setPop({ kind: 'ecg' })}
        />
        <CrewStatus
          systems={data.systems}
          leadsOff={data.vitals.leadsOff}
          onSystem={(id) => setPop({ kind: 'system', id })}
          onLeads={() => setPop({ kind: 'ecg' })}
        />
        <CabinAir cabin={data.cabin} simulated={data.simulated} onMore={() => setPop({ kind: 'cabin' })} />
        <NextStep advice={adviceFor(data)} onSend={telemetry.sendAlert} />
        <Panel
          title="HRV today"
          className="hrv-panel"
          meta={data.hrvBaseline !== null ? `baseline ${data.hrvBaseline} ms` : 'Since connecting'}
          more="More"
          onMore={() => setPop({ kind: 'hrv' })}
        >
          <HrvChart times={times} hrv={data.hrv} baseline={data.hrvBaseline} stressFrom={data.stressFrom} xLabels={5} />
        </Panel>
        <EventLog alerts={data.alerts} handled={handled} onMore={() => setPop({ kind: 'log' })} />
      </main>

      <CheckInBar
        data={data.checkIn}
        onOpen={() => setPop({ kind: 'checkin' })}
        end={
          <>
            <a
              className="foot-link"
              href="https://youpspace.com"
              onClick={(e) => {
                e.preventDefault();
                void openExternal('https://youpspace.com');
              }}
            >
              youpspace.com
            </a>
            <button className={`foot-mute${muted.size ? ' on' : ''}`} onClick={() => setPop({ kind: 'mute' })} title="Mute the alarm sound per parameter">
              {muted.size ? `${muted.size} muted` : 'Sound on'}
            </button>
          </>
        }
      />
      {pop && popup(pop)}
    </div>
  );
}
