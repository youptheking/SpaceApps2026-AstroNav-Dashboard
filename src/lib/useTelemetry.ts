import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Snapshot } from '../types';
import { sample } from '../data/sample';
import { DEMO_TICK_MS, DemoWatch } from './demo';
import { LiveModel } from './live';
import { CONNECTION_CANCELLED, type LinkStatus, type Packet } from './packets';
import { decode, dummyHistory, firstMissing, HISTORY_MINUTES, type HistoryFrame, type HistoryMinute } from './history';

// The watch's minute history as the console has it. `dummy` is generated on this laptop.
export interface HistoryView {
  minutes: HistoryMinute[];
  source: 'watch' | 'dummy';
  status: 'idle' | 'loading' | 'done' | 'none' | 'unsupported';
  received: number;
  total: number;
}

// a top-up of the newest minutes while connected
const HISTORY_REFRESH_MS = 5 * 60_000;
// the old firmware has no history; if nothing answers within this time, say so
const HISTORY_ANSWER_MS = 4000;
// The watch sends records every 20 ms. A notification can get lost, mostly right after
// connecting when the live stream starts too; after this much silence, ask again from the
// first missing record instead of waiting for an end that never comes.
const HISTORY_STALL_MS = 2500;
const HISTORY_RETRIES = 5;

const inTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const REFRESH_MS = 250;
const CODE_KEY = 'astronav.unlockCode';

// the code belongs to the watch and never changes, so typing it once is enough
export function rememberedCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? '';
  } catch {
    return '';
  }
}

function rememberCode(code: string) {
  try {
    localStorage.setItem(CODE_KEY, code);
  } catch {
    // private mode or blocked storage: the user types it again next time
  }
}

export interface Telemetry {
  data: Snapshot;
  link: LinkStatus;
  error: string | null;
  // a pretend watch on this laptop, for showing the console without hardware
  demo: boolean;
  setDemo: (on: boolean) => void;
  // the 6-digit code from the watch's screen; it unlocks the watch on every connect
  connect: (code: string) => void;
  disconnect: () => void;
  sendAlert: (code: number, severity: number, messageId: number) => Promise<boolean>;
  markHandled: (id: string, code: number | null) => void;
  // stops the buzzer on the watch for this code without marking the alert handled; false when not connected
  silence: (code: number) => Promise<boolean>;
  ecgSamples: (() => number[]) | null;
  history: HistoryView;
}

export function useTelemetry(): Telemetry {
  const model = useRef(new LiveModel());
  const [link, setLink] = useState<LinkStatus>(inTauri() ? { state: 'disconnected', reason: null } : { state: 'unavailable' });
  const [data, setData] = useState<Snapshot>(sample);
  const [error, setError] = useState<string | null>(null);
  const [demoWanted, setDemo] = useState(false);
  // history from the watch, filled while connected
  const minutes = useRef(new Map<number, HistoryMinute>());
  const range = useRef<{ oldest: number; newest: number } | null>(null);
  const phase = useRef<'idle' | 'range' | 'records'>('idle');
  // the download in progress: from which record, when the last frame came, how often re-asked
  const fetch = useRef({ from: 0, lastFrameAt: 0, retries: 0 });
  const [watchHistory, setWatchHistory] = useState<Omit<HistoryView, 'source'>>({ minutes: [], status: 'idle', received: 0, total: 0 });
  const live = link.state === 'connected';
  // a short dropout keeps the history and the screen; only a new session starts from zero
  const session = live || link.state === 'reconnecting';
  // the real watch wins over the pretend one
  const demo = demoWanted && !session;

  // history download, shared by the frame listener and the stall check (refs only, so safe in both)
  const finishHistory = () => {
    phase.current = 'idle';
    const list = [...minutes.current.values()].sort((a, b) => a.seq - b.seq);
    setWatchHistory({ minutes: list, status: 'done', received: list.length, total: list.length });
  };
  // asks again from the first missing record; false when nothing is missing or it gave up
  const resumeHistory = () => {
    const r = range.current;
    const missing = r ? firstMissing(minutes.current, fetch.current.from, r.newest) : null;
    if (missing === null || fetch.current.retries >= HISTORY_RETRIES) return false;
    fetch.current = { ...fetch.current, lastFrameAt: Date.now(), retries: fetch.current.retries + 1 };
    invoke('ble_history', { from: missing }).catch(() => { phase.current = 'idle'; });
    return true;
  };

  const showError = useCallback((e: unknown) => {
    const msg = String(e);
    if (msg !== CONNECTION_CANCELLED) setError(msg);
  }, []);

  useEffect(() => {
    if (!inTauri()) return;
    const unlisten = [
      listen<Packet>('telemetry', (e) => model.current.apply(e.payload)),
      listen<HistoryFrame>('history', (e) => {
        const f = e.payload;
        if (f.kind === 'records') {
          const r = range.current;
          const now = Date.now();
          for (const raw of f.records) minutes.current.set(raw.seq, decode(raw, r?.newest ?? raw.seq, now));
          fetch.current.lastFrameAt = now;
          // everything asked for is here: done, also when the watch's closing range frame got lost
          if (phase.current === 'records' && r && firstMissing(minutes.current, fetch.current.from, r.newest) === null) finishHistory();
          return;
        }
        if (phase.current === 'range') {
          range.current = { oldest: f.oldest, newest: f.newest };
          const have = Math.max(0, ...minutes.current.keys());
          const from = Math.max(f.oldest, f.newest - HISTORY_MINUTES + 1, have + 1);
          if (f.newest === 0 || from > f.newest) {
            phase.current = 'idle';
            setWatchHistory((h) => ({ ...h, status: f.newest === 0 ? 'none' : 'done' }));
            return;
          }
          phase.current = 'records';
          fetch.current = { from, lastFrameAt: Date.now(), retries: 0 };
          setWatchHistory((h) => ({ ...h, status: 'loading', total: f.newest - from + 1 + h.received }));
          invoke('ble_history', { from }).catch(() => { phase.current = 'idle'; });
        } else if (phase.current === 'records') {
          // the watch says it is done; fill in anything that went missing on the way
          if (!resumeHistory()) finishHistory();
        }
      }),
      listen<LinkStatus>('ble-status', (e) => {
        setLink(e.payload);
        if (e.payload.state === 'disconnected' && e.payload.reason) setError(e.payload.reason);
        if (e.payload.state === 'connected' || e.payload.state === 'reconnecting') setError(null);
      }),
    ];
    return () => unlisten.forEach((p) => p.then((off) => off()));
  }, []);

  useEffect(() => {
    if (!demo) return;
    model.current = new LiveModel();
    const watch = new DemoWatch();
    for (const [packet, at] of watch.history(new Date())) model.current.apply(packet, at);
    const id = setInterval(() => {
      const now = new Date();
      for (const p of watch.tick()) model.current.apply(p, now);
    }, DEMO_TICK_MS);
    return () => clearInterval(id);
  }, [demo]);

  // a new watch session starts from zero; a reconnect within the session keeps the history
  useEffect(() => {
    if (session) model.current = new LiveModel();
  }, [session]);

  // a new session from zero also starts the history from zero (before the fetch below, effects run in order)
  useEffect(() => {
    if (!session) return;
    minutes.current = new Map();
    range.current = null;
    phase.current = 'idle';
    setWatchHistory({ minutes: [], status: 'idle', received: 0, total: 0 });
  }, [session]);

  // on a new session: ask the watch for its range, then for the last 7 days; top up every few minutes
  useEffect(() => {
    if (!live) return;
    const ask = () => {
      if (phase.current !== 'idle') return;
      phase.current = 'range';
      invoke('ble_history', { from: 0 }).catch(() => { phase.current = 'idle'; });
      setTimeout(() => {
        if (phase.current === 'range') {
          phase.current = 'idle';
          setWatchHistory((h) => (h.received ? h : { ...h, status: 'unsupported' }));
        }
      }, HISTORY_ANSWER_MS);
    };
    ask();
    const id = setInterval(ask, HISTORY_REFRESH_MS);
    // while records stream in, show the count now and then rather than on every packet,
    // and pick a stalled download up again where it stopped
    const progress = setInterval(() => {
      if (phase.current !== 'records') return;
      setWatchHistory((h) => ({ ...h, received: minutes.current.size }));
      if (Date.now() - fetch.current.lastFrameAt > HISTORY_STALL_MS && !resumeHistory()) finishHistory();
    }, 500);
    return () => {
      clearInterval(id);
      clearInterval(progress);
    };
  }, [live]);

  // without a watch (example screen or demo) the history is a dummy week made here
  const [dummy] = useState(() => dummyHistory(Date.now()));
  const history = useMemo<HistoryView>(
    () => (session
      ? { ...watchHistory, source: 'watch' }
      : { minutes: dummy, source: 'dummy', status: 'done', received: dummy.length, total: dummy.length }),
    [session, watchHistory, dummy],
  );

  // packets arrive ~40 times a second; the screen redraws a few times a second
  useEffect(() => {
    if (!session && !demo) {
      setData(sample);
      return;
    }
    const id = setInterval(() => {
      if (model.current.packets === 0) return;
      const snap = model.current.snapshot({ crew: sample.crew, checkIn: sample.checkIn });
      setData(demo ? { ...snap, source: 'demo' } : snap);
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [session, demo]);

  const connect = useCallback((code: string) => {
    setError(null);
    invoke<string>('ble_connect', { code: Number(code) })
      .then(() => rememberCode(code))
      .catch(showError);
  }, [showError]);

  const disconnect = useCallback(() => {
    invoke('ble_disconnect').catch(showError);
  }, [showError]);

  const sendAlert = useCallback(async (code: number, severity: number, messageId: number) => {
    if (!session) return true; // sample data: nothing to send to
    if (!live) {
      setError('The watch is reconnecting. Try again in a moment.');
      return false;
    }
    try {
      await invoke('ble_send_alert', { code, severity, messageId });
      return true;
    } catch (e) {
      showError(e);
      return false;
    }
  }, [session, live, showError]);

  const markHandled = useCallback((id: string, code: number | null) => {
    if (!session) return;
    model.current.markHandled(id);
    // while reconnecting the watch keeps beeping; the handled mark stays on the dashboard
    if (code !== null && live) invoke('ble_clear_alert', { code }).catch(showError);
  }, [session, live, showError]);

  const silence = useCallback(async (code: number) => {
    if (!live) return false;
    try {
      await invoke('ble_clear_alert', { code });
      return true;
    } catch (e) {
      showError(e);
      return false;
    }
  }, [live, showError]);

  const ecgSamples = useCallback(() => model.current.ecgSamples(), []);

  return {
    data,
    link,
    error,
    demo,
    setDemo,
    connect,
    disconnect,
    sendAlert,
    markHandled,
    silence,
    ecgSamples: session ? ecgSamples : null,
    history,
  };
}
