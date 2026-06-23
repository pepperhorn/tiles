import { useReducer } from 'react';
import { render, screen, within } from '@testing-library/react';
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

test('the pause button adds a paw rest tile', async () => {
  render(<DesignerHarness />);
  await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
  expect(document.querySelector('.row-tiles .tile-pause')).toBeTruthy();
});

test('new sheet asks for confirmation before clearing the sheet', async () => {
  render(<DesignerHarness />);
  await userEvent.keyboard('cde');
  expect(document.querySelectorAll('.row-tiles .tile')).toHaveLength(3);

  // Cancelling keeps the work.
  await userEvent.click(screen.getByRole('button', { name: 'New sheet' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
  expect(document.querySelectorAll('.row-tiles .tile')).toHaveLength(3);

  // Confirming clears it.
  await userEvent.click(screen.getByRole('button', { name: 'New sheet' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'New sheet' }));
  expect(document.querySelector('.row-tiles .tile')).toBeFalsy();
});

test('auto up/down inserts an arrow between consecutive notes', async () => {
  render(<DesignerHarness />);
  await userEvent.click(screen.getByRole('button', { name: 'Auto up/down arrows' }));
  await userEvent.click(screen.getByRole('button', { name: 'C' }));
  await userEvent.click(screen.getByRole('button', { name: 'E' }));
  // First note has no preceding arrow; the second one does.
  const tiles = document.querySelectorAll('.row-tiles .tile');
  expect(tiles).toHaveLength(3); // note, arrow, note
});
