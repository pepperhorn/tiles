import { render, screen } from '@testing-library/react';
import { Tile } from './Tile';
import { noteById, SYMBOLS } from './notes';

test('note tile shows main and sub glyphs and the note color', () => {
  render(<Tile kind="note" note={noteById('Cs')!} size={80} />);
  expect(screen.getByText('C♯')).toBeInTheDocument();
  expect(screen.getByText('D♭')).toBeInTheDocument();
});

test('arrow tile shows its glyph', () => {
  render(<Tile kind="arrow" sym={SYMBOLS[0]} size={80} />);
  expect(screen.getByText('↑')).toBeInTheDocument();
});
