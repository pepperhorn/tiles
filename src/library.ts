import { parseSheetValue } from './designer/json';
import type { SheetDoc } from './designer/sheetModel';

// The song library lives in the crf-admin Directus `tiles` collection
// (read-only from the app; the Public role exposes published items). The
// base URL can be overridden at build time via VITE_LIBRARY_URL.
const LIBRARY_URL = (
  (import.meta.env as Record<string, string | undefined>).VITE_LIBRARY_URL
  ?? 'https://admin.creativeranges.org'
).replace(/\/$/, '');

/** One published song's metadata, as shown in the library overlay list. */
export type LibraryEntry = {
  id: string;
  title: string;
  subtitle: string | null;
  keyRoot: string | null;
  keyQuality: 'major' | 'minor' | null;
  bpm: number | null;
};

// Lightweight metadata list (no documents): one request for the whole library,
// searched client-side in the overlay. Sorted server-side by title.
export async function fetchLibraryList(): Promise<LibraryEntry[]> {
  const url = `${LIBRARY_URL}/items/tiles`
    + '?fields=id,title,subtitle,key_root,key_quality,bpm'
    + '&filter[status][_eq]=published&sort=title&limit=-1';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Library request failed (${res.status})`);
  const body: unknown = await res.json();
  const data = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) throw new Error('Malformed library response');
  return data.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    title: row.title == null || row.title === '' ? 'Untitled' : String(row.title),
    subtitle: row.subtitle == null ? null : String(row.subtitle),
    keyRoot: row.key_root == null ? null : String(row.key_root),
    keyQuality: row.key_quality === 'major' || row.key_quality === 'minor' ? row.key_quality : null,
    bpm: typeof row.bpm === 'number' ? row.bpm : null,
  }));
}

// Fetch one song's full document. `sheetdoc_json` is stored verbatim as the
// source of truth, but it still goes through parseSheetValue so a malformed
// row is rejected/backfilled exactly like a JSON file import.
export async function fetchLibraryDoc(id: string): Promise<SheetDoc> {
  const res = await fetch(`${LIBRARY_URL}/items/tiles/${encodeURIComponent(id)}?fields=sheetdoc_json`);
  if (!res.ok) throw new Error(`Library request failed (${res.status})`);
  const body: unknown = await res.json();
  return parseSheetValue((body as { data?: { sheetdoc_json?: unknown } } | null)?.data?.sheetdoc_json);
}
