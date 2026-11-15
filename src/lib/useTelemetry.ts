import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Snapshot } from '../types';
import { sample } from '../data/sample';
import { DEMO_TICK_MS, DemoWatch } from './demo';
import { LiveModel } from './live';
import type { LinkStatus, Packet } from './packets';

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
  ecgSamples: (() => number[]) | null;
}

export function useTelemetry(): Telemetry {
  const model = useRef(new LiveModel());
  const [link, setLink] = useState<LinkStatus>(inTauri() ? { state: 'disconnected', reason: null } : { state: 'unavailable' });
  const [data, setData] = useState<Snapshot>(sample);
  const [error, setError] = useState<string | null>(null);
  const [demoWanted, setDemo] = useState(false);
  const live = link.state === 'connected';
  // the real watch wins over the pretend one
  const demo = demoWanted && !live;
  const streaming = live || demo;

  useEffect(() => {
    if (!inTauri()) return;
    const unlisten = [
      listen<Packet>('telemetry', (e) => model.current.apply(e.payload)),
      listen<LinkStatus>('ble-status', (e) => {
        setLink(e.payload);
        if (e.payload.state === 'disconnected' && e.payload.reason) setError(e.payload.reason);
        if (e.payload.state === 'connected') setError(null);
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

  // packets arrive ~40 times a second; the screen redraws a few times a second
  useEffect(() => {
    if (!streaming) return;
    if (live) model.current = new LiveModel();
    const id = setInterval(() => {
      if (model.current.packets === 0) return;
      const snap = model.current.snapshot({ crew: sample.crew, checkIn: sample.checkIn });
      setData(demo ? { ...snap, source: 'demo' } : snap);
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [streaming, live, demo]);

  useEffect(() => {
    if (!streaming) setData(sample);
  }, [streaming]);

  const connect = useCallback((code: string) => {
    setError(null);
    invoke<string>('ble_connect', { code: Number(code) })
      .then(() => rememberCode(code))
      .catch((e) => setError(String(e)));
  }, []);

  const disconnect = useCallback(() => {
    invoke('ble_disconnect').catch((e) => setError(String(e)));
  }, []);

  const sendAlert = useCallback(async (code: number, severity: number, messageId: number) => {
    if (!live) return true;
    try {
      await invoke('ble_send_alert', { code, severity, messageId });
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    }
  }, [live]);

  const markHandled = useCallback((id: string, code: number | null) => {
    if (!streaming) return;
    model.current.markHandled(id);
    if (live && code !== null) invoke('ble_clear_alert', { code }).catch((e) => setError(String(e)));
  }, [streaming, live]);

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
    ecgSamples: streaming ? ecgSamples : null,
  };
}
