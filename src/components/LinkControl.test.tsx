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
  demo: false,
  setDemo: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  sendAlert: vi.fn(async () => true),
  markHandled: vi.fn(),
  silence: vi.fn(async () => true),
  ecgSamples: null,
  ...over,
});

test('a lost link says it is reconnecting and can be stopped', () => {
  const t = telemetry({ state: 'reconnecting', name: 'AstroNav-Wrist', attempt: 3, reason: 'The connection to the watch was lost.' });
  render(<LinkControl telemetry={t} />);
  expect(screen.getByText(/Signal lost/)).toBeInTheDocument();
  expect(screen.getByText(/attempt 3/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Connect watch' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Stop reconnecting' }));
  expect(t.disconnect).toHaveBeenCalledOnce();
});

test('a search can be cancelled', () => {
  const t = telemetry({ state: 'scanning' });
  render(<LinkControl telemetry={t} />);
  expect(screen.getByRole('button', { name: 'Searching' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(t.disconnect).toHaveBeenCalledOnce();
});

test('connecting sends the 6-digit code from the watch', () => {
  const t = telemetry({ state: 'disconnected', reason: null }, { data: sample });
  render(<LinkControl telemetry={t} />);
  const connect = screen.getByRole('button', { name: 'Connect watch' });
  fireEvent.change(screen.getByLabelText('Code on the watch'), { target: { value: '12a345' } });
  expect(connect).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Code on the watch'), { target: { value: '123456' } });
  fireEvent.click(connect);
  expect(t.connect).toHaveBeenCalledWith('123456');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
