import type { Note, Sym } from './notes';

type TileProps =
  | { kind: 'note'; note: Note; size: number; onClick?: () => void }
  | { kind: 'arrow'; sym: Sym; size: number; onClick?: () => void };

const shadow = { textShadow: '0 1px 0 rgba(0,0,0,.22), 0 2px 4px rgba(0,0,0,.38)' } as const;

export function Tile(props: TileProps) {
  const { size, onClick } = props;
  const bg = props.kind === 'note' ? props.note.hex : props.sym.hex;
  const main = props.kind === 'note' ? props.note.main : props.sym.glyph;
  const sub = props.kind === 'note' ? props.note.sub : '';
  return (
    <div
      className="tile flex flex-col items-center justify-center text-white leading-none text-center select-none"
      style={{ width: size, height: size, background: bg, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="tile-main font-bold" style={{ ...shadow, fontSize: size * (sub ? 0.4 : 0.46) }}>{main}</div>
      {sub && (
        <div className="tile-sub font-semibold opacity-90" style={{ ...shadow, fontSize: size * 0.22, marginTop: '.12em' }}>{sub}</div>
      )}
    </div>
  );
}
