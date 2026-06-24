import { useReducer } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignerMode } from './DesignerMode';
import { defaultDoc } from './sheetModel';
import { historyReducer, initHistory } from './history';

// DesignerMode receives doc/dispatch + undo/redo from App; provide them in a harness.
function DesignerHarness() {
  const [history, dispatch] = useReducer(historyReducer, undefined, () => initHistory(defaultDoc()));
  return (
    <DesignerMode
      doc={history.present}
      dispatch={dispatch}
      onUndo={() => dispatch({ type: 'undo' })}
      onRedo={() => dispatch({ type: 'redo' })}
      canUndo={history.past.length > 0}
      canRedo={history.future.length > 0}
    />
  );
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

test('undo and redo from the toolbar step through note edits', async () => {
  render(<DesignerHarness />);
  await userEvent.click(screen.getByRole('button', { name: 'C' }));
  await userEvent.click(screen.getByRole('button', { name: 'E' }));
  expect(document.querySelectorAll('.row-tiles .tile')).toHaveLength(2);

  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(document.querySelectorAll('.row-tiles .tile')).toHaveLength(1);

  await userEvent.click(screen.getByRole('button', { name: 'Redo' }));
  expect(document.querySelectorAll('.row-tiles .tile')).toHaveLength(2);
});

test('undo is disabled until there is history', async () => {
  render(<DesignerHarness />);
  expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'C' }));
  expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
});

// The arrow tiles render their glyph in .tile-main, in melodic order.
const arrowGlyphs = () =>
  Array.from(document.querySelectorAll('.row-tiles .tile-main'))
    .map(e => e.textContent)
    .filter(t => t === '↑' || t === '↓');

async function enableAutoAndEnter(letters: string) {
  render(<DesignerHarness />);
  await userEvent.click(screen.getByRole('button', { name: 'Auto up/down arrows' }));
  for (const ch of letters) await userEvent.click(screen.getByRole('button', { name: ch }));
}

test('auto up/down marks the start of an ascending run with a single ↑', async () => {
  await enableAutoAndEnter('CEG'); // all ascending
  expect(arrowGlyphs()).toEqual(['↑']); // one arrow at the start, none within the run
});

test('auto up/down adds a ↓ only where the line turns around', async () => {
  await enableAutoAndEnter('CED'); // up to E, then down to D
  expect(arrowGlyphs()).toEqual(['↑', '↓']);
});
