import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from './App';

test('the caution and warning row lights the open stress alert', () => {
  render(<App />);
  const cw = screen.getByRole('navigation', { name: 'Caution and warning' });
  expect(within(cw).getByText('1 caution')).toBeInTheDocument();
  expect(within(cw).getByRole('button', { name: 'Stress' })).toHaveClass('lamp', 'caution');
});

test('a body system opens its explanation in a popup', () => {
  render(<App />);
  const body = screen.getByRole('region', { name: 'Body' });
  fireEvent.click(within(body).getByRole('button', { name: /^Heart/ }));
  const popup = screen.getByRole('dialog', { name: 'Heart' });
  expect(within(popup).getByText(/blood shifts towards the head/)).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('the event log opens from a lamp', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Stress' }));
  expect(screen.getByRole('dialog', { name: 'Event log, today' })).toBeInTheDocument();
});

test('the breathing exercise can be sent once', async () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start on wrist' }));
  expect(await screen.findByRole('button', { name: 'Sent to wrist' })).toBeDisabled();
});

test('without a watch the screen says it shows sample data', () => {
  render(<App />);
  expect(screen.getByText('Sample data')).toBeInTheDocument();
});

test('the ECG leads tab shows where the three electrodes go', () => {
  render(<App />);
  const body = screen.getByRole('region', { name: 'Body' });
  fireEvent.click(within(body).getByRole('tab', { name: 'ECG leads' }));
  expect(within(body).getByRole('img', { name: /three ECG electrodes/ })).toBeInTheDocument();
  expect(within(body).getByText('Right chest, just under the collarbone')).toBeInTheDocument();
});
