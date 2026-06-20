export type TabDef = { id: string; label: string };

/** Visibility for a panel: only the active panel on mobile, all panels at lg+. */
export function tabPanelClass(isActive: boolean): string {
  return isActive ? 'block' : 'hidden lg:block';
}
