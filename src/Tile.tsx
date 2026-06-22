import { displayNote, type Note, type Sym, type AccidentalStyle } from './notes';

type TileProps =
  | { kind: 'note'; note: Note; size: number; accidental?: AccidentalStyle; onClick?: () => void }
  | { kind: 'arrow'; sym: Sym; size: number; onClick?: () => void }
  | { kind: 'pause'; size: number; onClick?: () => void };

const shadow = { textShadow: '0 1px 0 rgba(0,0,0,.22), 0 2px 4px rgba(0,0,0,.38)' } as const;

// A pause/rest tile: a warm-grey square carrying a white animal paw print.
export const PAUSE_HEX = '#a8a29e';

/** A simple paw print — one large pad and four toe beans — drawn in white. */
export function PawIcon({ size }: { size: number }) {
  return (
    <svg className="tile-paw" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <ellipse cx="12" cy="16" rx="5" ry="4" />
      <circle cx="6" cy="11" r="2.1" />
      <circle cx="10" cy="7.5" r="2.1" />
      <circle cx="14" cy="7.5" r="2.1" />
      <circle cx="18" cy="11" r="2.1" />
    </svg>
  );
}

export function Tile(props: TileProps) {
  const { size, onClick } = props;
  const common = {
    className: 'tile flex flex-col items-center justify-center text-white leading-none text-center select-none',
    onClick,
    role: onClick ? ('button' as const) : undefined,
  };
  if (props.kind === 'pause') {
    return (
      <div {...common} style={{ width: size, height: size, background: PAUSE_HEX, cursor: onClick ? 'pointer' : 'default' }}>
        <div className="tile-pause" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))' }}>
          <PawIcon size={size * 0.56} />
        </div>
      </div>
    );
  }
  let bg: string, main: string, sub: string;
  if (props.kind === 'note') {
    const disp = displayNote(props.note, props.accidental ?? 'sharp');
    bg = props.note.hex; main = disp.main; sub = disp.sub;
  } else {
    bg = props.sym.hex; main = props.sym.glyph; sub = '';
  }
  return (
    <div {...common} style={{ width: size, height: size, background: bg, cursor: onClick ? 'pointer' : 'default' }}>
      <div className="tile-main font-bold" style={{ ...shadow, fontSize: size * (sub ? 0.4 : 0.46) }}>{main}</div>
      {sub && (
        <div className="tile-sub font-semibold opacity-90" style={{ ...shadow, fontSize: size * 0.22, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}
