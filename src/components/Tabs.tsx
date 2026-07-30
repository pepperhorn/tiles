import type { ReactNode } from 'react';
import type { TabDef } from './tabPanel';

/**
 * Tab bar for the mobile/tablet tools panel. Hidden at lg+, where every panel is
 * shown at once (sidebar mode), so the same markup serves both layouts.
 */
export function TabBar({ tabs, active, onSelect, className = '', actions }: {
  tabs: TabDef[];
  active: string;
  onSelect: (id: string) => void;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={`tab-bar ${actions ? 'flex' : 'lg:hidden flex'} items-center gap-2 p-2 border-b border-slate-200 bg-white ${className}`}>
      <div className={`tab-list min-w-0 flex-1 gap-1 ${actions ? 'flex lg:hidden' : 'flex'}`} role="tablist">
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
      {actions && <div className="tab-bar-actions shrink-0">{actions}</div>}
    </div>
  );
}
