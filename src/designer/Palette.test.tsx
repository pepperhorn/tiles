import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Palette } from './Palette';

test('tapping a note button dispatches insertNote', async () => {
  const onAction = vi.fn();
  render(<Palette onAction={onAction} />);
  await userEvent.click(screen.getByRole('button', { name: 'C' }));
  expect(onAction).toHaveBeenCalledWith({ type: 'insertNote', noteId: 'C' });
});

test('tapping section dispatches newSection', async () => {
  const onAction = vi.fn();
  render(<Palette onAction={onAction} />);
  await userEvent.click(screen.getByRole('button', { name: /section/i }));
  expect(onAction).toHaveBeenCalledWith({ type: 'newSection' });
});

test('spelling toggle and arrow/break keys live in the toolbar, not the palette', () => {
  render(<Palette onAction={() => {}} accidentalStyle="sharp" />);
  expect(screen.queryByRole('button', { name: /flat spelling/i })).toBeNull();
  expect(screen.queryByRole('button', { name: /line break/i })).toBeNull();
  expect(screen.queryByRole('button', { name: /up arrow/i })).toBeNull();
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
