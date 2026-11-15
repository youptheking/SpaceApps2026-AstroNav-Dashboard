import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { sample } from '../data/sample';
import type { LinkStatus } from '../lib/packets';
import type { Telemetry } from '../lib/useTelemetry';
import { LinkControl } from './LinkControl';

const telemetry = (link: LinkStatus, over: Partial<Telemetry> = {}): Telemetry => ({
  data: { ...sample, source: 'live' },
  link,
  error: null,
  connect: vi.fn(),
  disconnect: vi.fn(),
  sendAlert: vi.fn(async () => true),
  markHandled: vi.fn(),
  ecgSamples: null,
  ...over,
});

test('a lost link says it is reconnecting and keeps the last values marked', () => {
  const t = telemetry({ state: 'reconnecting', name: 'AstroNav-Wrist', attempt: 3, reason: 'The connection to the watch was lost.' });
  render(<LinkControl telemetry={t} clock="12:00" />);
  expect(screen.getByText('Signal lost')).toBeInTheDocument();
  expect(screen.getByText(/Reconnecting, attempt 3/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Connect watch' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(t.disconnect).toHaveBeenCalledOnce();
});

test('a scan can be cancelled', () => {
  const t = telemetry({ state: 'scanning' });
  render(<LinkControl telemetry={t} clock="12:00" />);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(t.disconnect).toHaveBeenCalledOnce();
});

test('after a disconnect the watch can be connected again', () => {
  const t = telemetry({ state: 'disconnected', reason: null }, { data: sample });
  render(<LinkControl telemetry={t} clock="12:00" />);
  fireEvent.click(screen.getByRole('button', { name: 'Connect watch' }));
  expect(t.connect).toHaveBeenCalledOnce();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
