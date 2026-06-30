import { render, screen } from '@testing-library/react';
import { TempoControl } from './TempoControl';

test('shows current bpm and exposes a 20–300 range', () => {
  render(<TempoControl bpm={120} onBpm={() => {}} />);
  const slider = screen.getByLabelText(/tempo/i) as HTMLInputElement;
  expect(slider.value).toBe('120');
  expect(slider.min).toBe('20');
  expect(slider.max).toBe('300');
  expect(screen.getByText(/120 bpm/i)).toBeInTheDocument();
});
