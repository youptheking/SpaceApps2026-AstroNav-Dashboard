import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { DataNotice } from './DataNotice';

const handlers = () => ({ onStartDemo: vi.fn(), onStopDemo: vi.fn(), onConnect: vi.fn(), onBackToWatch: vi.fn() });

test('without a watch the console says so and offers the demo with dummy data', () => {
  const h = handlers();
  render(<DataNotice source="sample" demoCrew={null} watchName="L. Verhoef" {...h} />);
  expect(screen.getByText(/No watch connected/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start demo (dummy data)' }));
  expect(h.onStartDemo).toHaveBeenCalledOnce();
});

test('a running demo and a demo crew member are both marked as dummy data', () => {
  const h = handlers();
  const { rerender } = render(<DataNotice source="demo" demoCrew={null} watchName="L. Verhoef" {...h} />);
  expect(screen.getByText(/dummy data/)).toBeInTheDocument();
  rerender(<DataNotice source="demo" demoCrew="M. Sato" watchName="L. Verhoef" {...h} />);
  expect(screen.getByText('Dummy data.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back to L. Verhoef' }));
  expect(h.onBackToWatch).toHaveBeenCalledOnce();
});

test('live data needs no notice', () => {
  const { container } = render(<DataNotice source="live" demoCrew={null} watchName="L. Verhoef" {...handlers()} />);
  expect(container).toBeEmptyDOMElement();
});
