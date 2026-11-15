import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { sample } from '../data/sample';
import { Annunciators } from './Annunciators';
import { MuteControl } from './MuteControl';

test('a muted lamp stays lit and shows that its sound is off', () => {
  const alerts = [{ id: 'a1', code: 2, time: '14:00', text: 'SpO2 low', severity: 'alarm' as const, raisedBy: 'Wrist' as const, resolution: null }];
  render(
    <Annunciators alerts={alerts} vitals={sample.vitals} link={{ state: 'unavailable' }} linkLost={false} muted={new Set(['SpO2'])} onOpen={() => {}} />,
  );
  const lamp = screen.getByRole('button', { name: /SpO2/ });
  expect(lamp).toHaveClass('warning');
  expect(lamp).toHaveClass('muted');
  expect(screen.getByRole('img', { name: 'muted' })).toBeInTheDocument();
});

test('the sound panel mutes one lamp or all of them', () => {
  const onChange = vi.fn();
  const { rerender } = render(<MuteControl muted={new Set()} onChange={onChange} />);
  fireEvent.click(screen.getByRole('switch', { name: 'Sound for Stress' }));
  expect([...onChange.mock.calls[0]![0]]).toEqual(['Stress']);

  fireEvent.click(screen.getByRole('button', { name: 'Mute all' }));
  expect(onChange.mock.calls[1]![0].size).toBe(10);

  rerender(<MuteControl muted={onChange.mock.calls[1]![0]} onChange={onChange} />);
  expect(screen.getByRole('button', { name: 'Unmute all' })).toBeInTheDocument();
});
