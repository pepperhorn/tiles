import { defaultDoc, type SheetDoc } from './sheetModel';

export function serializeDoc(doc: SheetDoc): string {
  return JSON.stringify(doc, null, 2);
}

// Parse a sheet-JSON string back into a SheetDoc. Missing fields are filled
// from defaultDoc() so older/partial dumps still load; an object without an
// `items` array is rejected as not-a-sheet.
export function parseSheetJson(text: string): SheetDoc {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) {
    throw new Error('Not a valid sheet JSON (missing items array)');
  }
  return { ...defaultDoc(), ...parsed } as SheetDoc;
}
