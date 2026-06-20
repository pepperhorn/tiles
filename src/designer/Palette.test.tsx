import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Palette } from './Palette';

test('tapping a note button dispatches insertNote', async () => {
  const onAction = vi.fn();
  render(<Palette onAction={onAction} />);
  await userEvent.click(screen.getByRole('button', { name: 'C' }));
  expect(onAction).toHaveBeenCalledWith({ type: 'insertNote', noteId: 'C' });
});

test('tapping line-break dispatches insertBreak', async () => {
  const onAction = vi.fn();
  render(<Palette onAction={onAction} />);
  await userEvent.click(screen.getByRole('button', { name: /line break/i }));
  expect(onAction).toHaveBeenCalledWith({ type: 'insertBreak' });
});

test('there are no sharp/flat action buttons — only the spelling toggle', async () => {
  const onAction = vi.fn();
  const onAccidentalStyle = vi.fn();
  render(<Palette onAction={onAction} accidentalStyle="sharp" onAccidentalStyle={onAccidentalStyle} />);
  // Tapping the Flat toggle changes spelling, it does NOT dispatch a note action.
  await userEvent.click(screen.getByRole('button', { name: /flat spelling/i }));
  expect(onAccidentalStyle).toHaveBeenCalledWith('flat');
  expect(onAction).not.toHaveBeenCalled();
});

test('accidental note tiles show the predominant spelling per the toggle', () => {
  const { rerender } = render(<Palette onAction={() => {}} accidentalStyle="sharp" />);
  // sharp mode: C♯ is predominant (main), D♭ is the small sub
  let cs = screen.getByRole('button', { name: 'Cs' });
  expect(cs.querySelector('.palette-note-main')!.textContent).toBe('C♯');
  expect(cs.querySelector('.palette-note-sub')!.textContent).toBe('D♭');
  // flat mode: D♭ becomes predominant, C♯ the small sub
  rerender(<Palette onAction={() => {}} accidentalStyle="flat" />);
  cs = screen.getByRole('button', { name: 'Cs' });
  expect(cs.querySelector('.palette-note-main')!.textContent).toBe('D♭');
  expect(cs.querySelector('.palette-note-sub')!.textContent).toBe('C♯');
});
