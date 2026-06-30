import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignerControls } from './DesignerControls';
import { defaultDoc } from './sheetModel';

test('the BPM input shows the doc tempo and dispatches setBpm', async () => {
  const dispatch = vi.fn();
  render(<DesignerControls doc={{ ...defaultDoc(), bpm: 120 }} dispatch={dispatch} view="a4" onView={() => {}} />);
  const input = screen.getByLabelText(/bpm/i) as HTMLInputElement;
  expect(input.value).toBe('120');
  await userEvent.clear(input);
  await userEvent.type(input, '90');
  expect(dispatch).toHaveBeenLastCalledWith({ type: 'setBpm', bpm: 90 });
});
