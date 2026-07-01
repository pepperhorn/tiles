import { render, screen, fireEvent } from '@testing-library/react';
import { DesignerControls } from './DesignerControls';
import { defaultDoc } from './sheetModel';

test('the BPM input shows the doc tempo and dispatches setBpm', () => {
  const dispatch = vi.fn();
  render(<DesignerControls doc={{ ...defaultDoc(), bpm: 120 }} dispatch={dispatch} view="a4" onView={() => {}} />);
  const input = screen.getByLabelText(/bpm/i) as HTMLInputElement;
  expect(input.value).toBe('120');
  fireEvent.change(input, { target: { value: '90' } });
  expect(dispatch).toHaveBeenLastCalledWith({ type: 'setBpm', bpm: 90 });
});
