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

test('display mode control dispatches violin and cello layout modes', () => {
  const dispatch = vi.fn();
  render(<DesignerControls doc={defaultDoc()} dispatch={dispatch} view="a4" onView={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Bb' }));
  expect(dispatch).toHaveBeenLastCalledWith({ type: 'setLayout', patch: { displayMode: 'bb' } });
  fireEvent.click(screen.getByRole('button', { name: 'Eb' }));
  expect(dispatch).toHaveBeenLastCalledWith({ type: 'setLayout', patch: { displayMode: 'eb' } });
  fireEvent.click(screen.getByRole('button', { name: 'Violin' }));
  expect(dispatch).toHaveBeenLastCalledWith({ type: 'setLayout', patch: { displayMode: 'violin' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cello' }));
  expect(dispatch).toHaveBeenLastCalledWith({ type: 'setLayout', patch: { displayMode: 'cello' } });
});

test('position toggles show for instrument modes and update the enabled set', () => {
  const dispatch = vi.fn();
  render(<DesignerControls doc={{ ...defaultDoc(), displayMode: 'cello' }} dispatch={dispatch} view="a4" onView={() => {}} />);
  expect(screen.getByRole('group', { name: /cello fingering positions/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'H' }));
  expect(dispatch).toHaveBeenLastCalledWith({
    type: 'setLayout',
    patch: {
      fingeringPositions: {
        violin: [1, 2, 3, 4],
        cello: [1, 1.5, 2, 2.5, 3, 3.5, 4],
      },
    },
  });
});
