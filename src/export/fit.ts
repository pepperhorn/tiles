/**
 * Prepares the live preview for capture: clears the fit-to-width `zoom`
 * (so html2canvas captures at natural resolution) and hides empty header
 * fields (so null/placeholder text never appears in exports), then restores
 * both afterwards.
 */
export async function withExportReady(
  stage: HTMLElement | null,
  fn: () => Promise<void> | void,
): Promise<void> {
  const sheets = stage ? Array.from(stage.querySelectorAll<HTMLElement>('.sheets')) : [];
  const prevZoom = sheets.map(e => e.style.zoom);
  sheets.forEach(e => { e.style.zoom = '1'; });

  const empties = stage ? Array.from(stage.querySelectorAll<HTMLElement>('.header-field.is-empty')) : [];
  const prevDisplay = empties.map(e => e.style.display);
  empties.forEach(e => { e.style.display = 'none'; });

  try {
    await fn();
  } finally {
    sheets.forEach((e, i) => { e.style.zoom = prevZoom[i]; });
    empties.forEach((e, i) => { e.style.display = prevDisplay[i]; });
  }
}
