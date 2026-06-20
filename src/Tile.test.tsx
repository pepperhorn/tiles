import { render, screen } from '@testing-library/react';
import { Tile } from './Tile';
import { noteById, SYMBOLS } from './notes';

test('note tile shows main and sub glyphs and the note color', () => {
  render(<Tile kind="note" note={noteById('Cs')!} size={80} />);
  expect(screen.getByText('C♯')).toBeInTheDocument();
  expect(screen.getByText('D♭')).toBeInTheDocument();
});

test('flat accidental style makes the flat spelling predominant', () => {
  const { container } = render(<Tile kind="note" note={noteById('Cs')!} size={80} accidental="flat" />);
  expect(container.querySelector('.tile-main')!.textContent).toBe('D♭');
  expect(container.querySelector('.tile-sub')!.textContent).toBe('C♯');
});

test('arrow tile shows its glyph', () => {
  render(<Tile kind="arrow" sym={SYMBOLS[0]} size={80} />);
  expect(screen.getByText('↑')).toBeInTheDocument();
});
