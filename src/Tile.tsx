import { displayNote, type Note, type Sym, type AccidentalStyle } from './notes';

type TileProps =
  | { kind: 'note'; note: Note; size: number; accidental?: AccidentalStyle; onClick?: () => void }
  | { kind: 'arrow'; sym: Sym; size: number; onClick?: () => void }
  | { kind: 'pause'; size: number; onClick?: () => void };

const shadow = { textShadow: '0 1px 0 rgba(0,0,0,.22), 0 2px 4px rgba(0,0,0,.38)' } as const;

/** A simple paw print — one large pad and four toe beans — as a black/white outline (no fill). */
export function PawIcon({ size }: { size: number }) {
  return (
    <svg className="tile-paw" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
      <ellipse cx="12" cy="16" rx="5" ry="4" />
      <circle cx="6" cy="11" r="2.1" />
      <circle cx="10" cy="7.5" r="2.1" />
      <circle cx="14" cy="7.5" r="2.1" />
      <circle cx="18" cy="11" r="2.1" />
    </svg>
  );
}

/** Up/down direction arrow as a stroke-only vector glyph (no fill), matching the paw outline style. */
export function ArrowIcon({ dir, size }: { dir: 'up' | 'down'; size: number }) {
  return (
    <svg className="tile-arrow-glyph" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dir === 'up'
        ? <><path d="M12 20V4" /><path d="M5 11l7-7 7 7" /></>
        : <><path d="M12 4v16" /><path d="M5 13l7 7 7-7" /></>}
    </svg>
  );
}

/** Render a note name, peeling a trailing ♯/♭ into its own span so we can tuck it
 *  tight against the letter (the music-symbol glyphs fall back to a font with a
 *  wide left bearing, which otherwise leaves a strange gap). */
export function NoteText({ text }: { text: string }) {
  const acc = text.slice(-1);
  if (acc !== '♯' && acc !== '♭') return <>{text}</>;
  return <>{text.slice(0, -1)}<span className="note-accidental">{acc}</span></>;
}

export function Tile(props: TileProps) {
  const { size, onClick } = props;
  const common = {
    className: 'tile flex flex-col items-center justify-center leading-none text-center select-none',
    onClick,
    role: onClick ? ('button' as const) : undefined,
  };
  if (props.kind === 'pause') {
    // A rest: an unfilled (white) box carrying a black paw-print outline.
    return (
      <div {...common} className={`${common.className} tile-pause`} style={{ width: size, height: size, background: '#fff', color: 'var(--ink)', border: '2px dashed var(--ink)', cursor: onClick ? 'pointer' : 'default' }}>
        <PawIcon size={size * 0.56} />
      </div>
    );
  }
  if (props.kind === 'arrow') {
    // A direction marker: white box, black dashed border, stroke-only arrow glyph.
    const dir = props.sym.id === 'arrowUp' ? 'up' : 'down';
    return (
      <div {...common} aria-label={`${dir} arrow`} className={`${common.className} tile-arrow`} style={{ width: size, height: size, background: '#fff', color: 'var(--ink)', border: '2px dashed var(--ink)', cursor: onClick ? 'pointer' : 'default' }}>
        <ArrowIcon dir={dir} size={size * 0.56} />
      </div>
    );
  }
  const disp = displayNote(props.note, props.accidental ?? 'sharp');
  const bg = props.note.hex, main = disp.main, sub = disp.sub;
  return (
    <div {...common} style={{ width: size, height: size, background: bg, cursor: onClick ? 'pointer' : 'default' }}>
      <div className="tile-main text-white font-bold" style={{ ...shadow, fontSize: size * (sub ? 0.5 : 0.575) }}><NoteText text={main} /></div>
      {sub && (
        <div className="tile-sub text-white font-semibold opacity-90" style={{ ...shadow, fontSize: size * 0.275, marginTop: 2 }}><NoteText text={sub} /></div>
      )}
    </div>
  );
}
