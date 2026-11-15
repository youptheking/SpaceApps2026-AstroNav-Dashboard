import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from './App';

test('shows the overview with the finding first', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: 'Health overview' })).toBeInTheDocument();
  expect(screen.getByText(/Stress has been rising since 10:40/)).toBeInTheDocument();
});

test('selecting a body system shows its explanation', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /^Heart/ }));
  expect(screen.getByRole('heading', { level: 3, name: 'Heart' })).toBeInTheDocument();
  expect(screen.getByText(/blood shifts towards the head/)).toBeInTheDocument();
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
