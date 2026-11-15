import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Snapshot } from '../types';
import { sample } from '../data/sample';
import { LiveModel } from './live';
import { CONNECTION_CANCELLED, type LinkStatus, type Packet } from './packets';

const inTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const REFRESH_MS = 250;

export interface Telemetry {
  data: Snapshot;
  link: LinkStatus;
  error: string | null;
  connect: () => void;
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
  const live = link.state === 'connected';
  // a short dropout keeps the history and the screen; only a new session starts from zero
  const session = live || link.state === 'reconnecting';

  const showError = useCallback((e: unknown) => {
    const msg = String(e);
    if (msg !== CONNECTION_CANCELLED) setError(msg);
  }, []);

  useEffect(() => {
    if (!inTauri()) return;
    const unlisten = [
      listen<Packet>('telemetry', (e) => model.current.apply(e.payload)),
      listen<LinkStatus>('ble-status', (e) => {
        setLink(e.payload);
        if (e.payload.state === 'disconnected' && e.payload.reason) setError(e.payload.reason);
        if (e.payload.state === 'connected' || e.payload.state === 'reconnecting') setError(null);
      }),
    ];
    return () => unlisten.forEach((p) => p.then((off) => off()));
  }, []);

  // packets arrive ~40 times a second; the screen redraws a few times a second
  useEffect(() => {
    if (!session) {
      setData(sample);
      return;
    }
    model.current = new LiveModel();
    const id = setInterval(() => {
      if (model.current.packets > 0) setData(model.current.snapshot({ crew: sample.crew, checkIn: sample.checkIn }));
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [session]);

  const connect = useCallback(() => {
    setError(null);
    invoke<string>('ble_connect').catch(showError);
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

  const ecgSamples = useCallback(() => model.current.ecgSamples(), []);

  return {
    data,
    link,
    error,
    connect,
    disconnect,
    sendAlert,
    markHandled,
    ecgSamples: session ? ecgSamples : null,
  };
}
