import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PianoKeyboard } from './PianoKeyboard';

test('renders G3..E5 — 13 white keys and 9 black keys, colour-coded', () => {
  render(<PianoKeyboard onAction={() => {}} />);
  // First and last white keys of the range.
  const g3 = screen.getByRole('button', { name: 'G3' });
  expect(g3).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'E5' })).toBeInTheDocument();
  // Keys are filled with their tile colour (G = #6bc6a0).
  expect(g3.querySelector('rect')!.getAttribute('fill')).toBe('#6bc6a0');
  // 13 white + 9 black (sharps after G A C D F G A C D; B/E have none) = 22 keys.
  expect(screen.getAllByRole('button').filter(b => /^[A-G]/.test(b.getAttribute('aria-label') ?? ''))).toHaveLength(22);
});

test('tapping a key inserts that pitch class (A♯ uses id Bb)', async () => {
  const onAction = vi.fn();
  render(<PianoKeyboard onAction={onAction} />);
  // The action carries the key's real octave so auto arrows can follow pitch.
  await userEvent.click(screen.getByRole('button', { name: 'C4' }));
  expect(onAction).toHaveBeenCalledWith({ type: 'insertNote', noteId: 'C', octave: 4 });
  await userEvent.click(screen.getByRole('button', { name: 'Bb3' }));
  expect(onAction).toHaveBeenCalledWith({ type: 'insertNote', noteId: 'Bb', octave: 3 });
});

test('black-key labels follow the accidental spelling toggle', () => {
  const { rerender } = render(<PianoKeyboard onAction={() => {}} accidentalStyle="sharp" />);
  expect(screen.getByRole('button', { name: 'Cs4' }).querySelector('.piano-key-label')!.textContent).toBe('C♯');
  rerender(<PianoKeyboard onAction={() => {}} accidentalStyle="flat" />);
  expect(screen.getByRole('button', { name: 'Cs4' }).querySelector('.piano-key-label')!.textContent).toBe('D♭');
});

test('the keys slider narrows the span, staying centred on F4', () => {
  render(<PianoKeyboard onAction={() => {}} />);
  const slider = screen.getByRole('slider', { name: /number of keys/i });
  // Default (wide) spans G3–E5; narrowing to 9 keys re-centres to B3–C5.
  expect(screen.getByRole('button', { name: 'G3' })).toBeInTheDocument();
  fireEvent.change(slider, { target: { value: '9' } });
  expect(screen.getByRole('button', { name: 'B3' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'C5' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'G3' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'E5' })).toBeNull();
});

test('the section button still adds a section from keyboard mode', async () => {
  const onAction = vi.fn();
  render(<PianoKeyboard onAction={onAction} />);
  await userEvent.click(screen.getByRole('button', { name: /section/i }));
  expect(onAction).toHaveBeenCalledWith({ type: 'newSection' });
});
