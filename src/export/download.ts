/**
 * Trigger a browser download for a Blob. Lives in its own dependency-free module
 * so lightweight callers (e.g. JSON export) can use it without pulling in the
 * heavy raster/PDF export stack (html2canvas, jspdf).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  // Defer revoke so the browser can start the download — revoking immediately
  // can cancel it, especially when several downloads fire in quick succession.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
