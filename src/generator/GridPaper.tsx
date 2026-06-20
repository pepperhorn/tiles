import { PAD } from '../geometry';

export function GridPaper({ size, clearance, pageW, pageH }: { size: number; clearance: number; pageW: number; pageH: number }) {
  const pitch = size + clearance;
  const innerW = pageW - PAD * 2, innerH = pageH - PAD * 2;
  const c = Math.max(1, Math.floor(innerW / pitch));
  const r = Math.max(1, Math.floor(innerH / pitch));
  const gw = c * pitch, gh = r * pitch;
  const vlines = Array.from({ length: c + 1 }, (_, i) => i * pitch);
  const hlines = Array.from({ length: r + 1 }, (_, j) => j * pitch);
  return (
    <svg className="grid-svg block" width={gw} height={gh} viewBox={`0 0 ${gw} ${gh}`}>
      {vlines.map((x, i) => (
        <line key={`v${i}`} x1={x} y1={0} x2={x} y2={gh} stroke="#d6d4e0" strokeWidth={0.75} strokeDasharray="1 5" />
      ))}
      {hlines.map((y, j) => (
        <line key={`h${j}`} x1={0} y1={y} x2={gw} y2={y} stroke="#b3b1c0" strokeWidth={0.9} />
      ))}
    </svg>
  );
}
