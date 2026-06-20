import { useReducer } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignerMode } from './DesignerMode';
import { reduce, defaultDoc } from './sheetModel';

// DesignerMode now receives doc/dispatch from App; provide them in a harness.
function DesignerHarness() {
  const [doc, dispatch] = useReducer(reduce, undefined, defaultDoc);
  return <DesignerMode doc={doc} dispatch={dispatch} />;
}

test('typing a note letter adds a tile to the canvas', async () => {
  render(<DesignerHarness />);
  await userEvent.keyboard('c');
  expect(document.querySelector('.row-tiles .tile')).toBeTruthy();
});

test('palette tap then tiles-per-row control re-wraps', async () => {
  render(<DesignerHarness />);
  await userEvent.click(screen.getByRole('button', { name: 'C' }));
  await userEvent.click(screen.getByRole('button', { name: 'E' }));
  const tpr = screen.getByLabelText(/tiles per row/i);
  await userEvent.clear(tpr); await userEvent.type(tpr, '1');
  expect(document.querySelectorAll('.row-tiles')).toHaveLength(2); // 1 per row
});
