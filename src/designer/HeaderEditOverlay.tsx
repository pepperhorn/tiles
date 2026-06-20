import { EditOverlay } from './EditOverlay';
import { ucfirst } from '../text';
import type { HeaderField } from './sheetModel';

const LABELS: Record<HeaderField, string> = {
  part: 'Part / instrument',
  tempoStyle: 'LH: tempo · style',
  title: 'Title',
  subtitle: 'Subtitle',
  composer: 'RH: composer',
};

export function HeaderEditOverlay({ field, value, onChange, onClose }: {
  field: HeaderField; value: string; onChange: (v: string) => void; onClose: () => void;
}) {
  return (
    <EditOverlay
      label={LABELS[field]}
      value={value}
      onChange={v => onChange(ucfirst(v))}
      onClose={onClose}
    />
  );
}
