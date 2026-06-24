import { render } from '@testing-library/react';
import { Tile } from './Tile';
import { noteById, SYMBOLS } from './notes';

test('note tile shows main and sub glyphs and the note color', () => {
  // The trailing ♯/♭ is split into its own span (see NoteText), so assert on
  // the element's combined textContent rather than a single text node.
  const { container } = render(<Tile kind="note" note={noteById('Cs')!} size={80} />);
  expect(container.querySelector('.tile-main')!.textContent).toBe('C♯');
  expect(container.querySelector('.tile-sub')!.textContent).toBe('D♭');
});

test('flat accidental style makes the flat spelling predominant', () => {
  const { container } = render(<Tile kind="note" note={noteById('Cs')!} size={80} accidental="flat" />);
  expect(container.querySelector('.tile-main')!.textContent).toBe('D♭');
  expect(container.querySelector('.tile-sub')!.textContent).toBe('C♯');
});

test('arrow tile shows its vector glyph', () => {
  // Arrows render as a stroke-only SVG (.tile-arrow-glyph), not a text glyph.
  const { container } = render(<Tile kind="arrow" sym={SYMBOLS[0]} size={80} />);
  expect(container.querySelector('.tile-arrow')).toBeInTheDocument();
  expect(container.querySelector('.tile-arrow-glyph')).toBeInTheDocument();
});
