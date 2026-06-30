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

// Auto up/down is on by default; turn it off in tests that count plain notes.
const disableAuto = () => userEvent.click(screen.getByRole('button', { name: 'Auto up/down arrows' }));

test('the accidental toggle flips spelling with one button', async () => {
  render(<DesignerHarness />);
  const acc = document.querySelector('.palette-acc-toggle') as HTMLElement;
  expect(acc.textContent).toBe('♯');
  await userEvent.click(acc);
  expect(acc.textContent).toBe('♭');
  await userEvent.click(acc);
  expect(acc.textContent).toBe('♯');
});

test('the layout view toggle swaps the A4 page for the mobile reflow', async () => {
  render(<DesignerHarness />); // jsdom default is the A4 page preview
  expect(document.querySelector('.sheet')).toBeTruthy();
  expect(document.querySelector('.sheet-mobile')).toBeNull();
  await userEvent.click(screen.getByRole('tab', { name: /layout/i }));
  // Scope to the view group — 'A4' also names the paper-size button.
  const viewToggle = within(screen.getByRole('group', { name: /editing view/i }));
  await userEvent.click(viewToggle.getByRole('button', { name: 'Mobile' }));
  expect(document.querySelector('.sheet-mobile')).toBeTruthy();
  expect(document.querySelector('.sheet')).toBeNull();
  await userEvent.click(viewToggle.getByRole('button', { name: 'A4' }));
  expect(document.querySelector('.sheet')).toBeTruthy();
  expect(document.querySelector('.sheet-mobile')).toBeNull();
});

test('palette tap then tiles-per-row control re-wraps', async () => {
  render(<DesignerHarness />);
  await disableAuto();
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
  await disableAuto();
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
  await disableAuto();
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

// Arrow tiles render as vector SVGs labelled by direction, in melodic order.
const arrowGlyphs = () =>
  Array.from(document.querySelectorAll('.row-tiles .tile-arrow'))
    .map(e => e.getAttribute('aria-label') === 'down arrow' ? '↓' : '↑');

async function enableAutoAndEnter(letters: string) {
  render(<DesignerHarness />); // auto up/down is on by default
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

// Click a sequence of piano keys by their aria-label (note id + octave, e.g. 'E4').
// Scope to the keyboard group so a key like 'A4' can't collide with the 'A4'
// paper-size button in the (always-mounted) layout panel.
async function enterKeys(labels: string[]) {
  render(<DesignerHarness />); // auto up/down on by default
  await userEvent.click(screen.getByRole('button', { name: 'Keyboard' }));
  const keyboard = within(screen.getByRole('group', { name: /note keyboard/i }));
  for (const l of labels) await userEvent.click(keyboard.getByRole('button', { name: l }));
}

test('keyboard entry points the auto arrow at the entered pitch across an octave', async () => {
  // E4 → C5 climbs a sixth. The pitch classes alone (E→C) read as a step *down*;
  // the real octaves make it an ascending leap, so the arrow must be ↑.
  await enterKeys(['E4', 'C5']);
  expect(arrowGlyphs()).toEqual(['↑']);
});

test('keyboard entry marks a descending octave even within one pitch class', async () => {
  // C5 → C4 is the same pitch class (no chromatic move) but a real drop, so the
  // entered pitch must still produce a ↓.
  await enterKeys(['C5', 'C4']);
  expect(arrowGlyphs()).toEqual(['↓']);
});

test('a keyboard run that keeps rising gets a single arrow, not a zigzag', async () => {
  // C4 → A4 → C5 all climb. By pitch class alone C→A reads as a step *down* and
  // A→C as a turn back up, which would scatter ↓/↑; the entered octaves make it
  // one ascending run, so it must open with a single ↑ and add nothing after.
  await enterKeys(['C4', 'A4', 'C5']);
  expect(arrowGlyphs()).toEqual(['↑']);
});

test('the input-mode toggle swaps the tile palette for the colour-coded keyboard', async () => {
  render(<DesignerHarness />);
  // Tiles mode is the default: the 6-col palette grid is shown, no keyboard.
  expect(screen.getByRole('button', { name: 'C' })).toBeInTheDocument();
  expect(screen.queryByRole('group', { name: /note keyboard/i })).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: 'Keyboard' }));
  // Keyboard mode: piano keys appear (G3 key), and tapping one adds a tile.
  expect(screen.getByRole('group', { name: /note keyboard/i })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'G4' }));
  expect(document.querySelector('.row-tiles .tile')).toBeTruthy();

  // Back to tiles mode restores the palette.
  await userEvent.click(screen.getByRole('button', { name: 'Tiles' }));
  expect(screen.queryByRole('group', { name: /note keyboard/i })).toBeNull();
});
