import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { CREW } from '../lib/crew';
import { CrewSelect } from './CrewSelect';

const members = CREW.map((member, i) => ({ member, status: i === 2 ? ('caution' as const) : null }));

test('the crew list shows every member, marks demo watches, and flags a problem elsewhere', () => {
  const onSelect = vi.fn();
  render(<CrewSelect members={members} selected={CREW[0]!} onSelect={onSelect} />);
  expect(screen.getByTitle(/Another crew member/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Crew member: L. Verhoef/ }));
  const options = screen.getAllByRole('option');
  expect(options).toHaveLength(CREW.length);
  expect(screen.getAllByText('Demo')).toHaveLength(CREW.length - 1);
  expect(screen.getByText('caution open')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('option', { name: /M. Sato/ }));
  expect(onSelect).toHaveBeenCalledWith('demo-2');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});
