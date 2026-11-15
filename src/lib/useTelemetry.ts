import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Snapshot } from '../types';
import { sample } from '../data/sample';
import { LiveModel } from './live';
import type { LinkStatus, Packet } from './packets';

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

  // packets arrive ~40 times a second; the screen redraws a few times a second
  useEffect(() => {
    if (!live) return;
    model.current = new LiveModel();
    const id = setInterval(() => {
      if (model.current.packets > 0) setData(model.current.snapshot({ crew: sample.crew, checkIn: sample.checkIn }));
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [live]);

  useEffect(() => {
    if (!live) setData(sample);
  }, [live]);

  const connect = useCallback(() => {
    setError(null);
    invoke<string>('ble_connect').catch((e) => setError(String(e)));
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
    if (!live) return;
    model.current.markHandled(id);
    if (code !== null) invoke('ble_clear_alert', { code }).catch((e) => setError(String(e)));
  }, [live]);

  const ecgSamples = useCallback(() => model.current.ecgSamples(), []);

  return {
    data,
    link,
    error,
    connect,
    disconnect,
    sendAlert,
    markHandled,
    ecgSamples: live ? ecgSamples : null,
  };
}
