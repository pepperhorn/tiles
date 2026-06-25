import type { TabDef } from './tabPanel';

/**
 * Tab bar for the mobile/tablet tools panel. Hidden at lg+, where every panel is
 * shown at once (sidebar mode), so the same markup serves both layouts.
 */
export function TabBar({ tabs, active, onSelect, className = '' }: {
  tabs: TabDef[];
  active: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={`tab-bar lg:hidden flex gap-1 p-2 border-b border-slate-200 bg-white ${className}`} role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className="tab-btn flex-1 px-2 py-1.5 text-xs font-semibold"
          onClick={() => onSelect(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
