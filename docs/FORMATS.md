# Note·Tiles data formats

Two interchange formats describe a sheet: the **tiles JSON** file (download/upload)
and the **URL hash** encoding (share/embed links). Both carry the same core
artifact — a `SheetDoc`.

## Tiles JSON

A tiles JSON file is a `SheetDoc` object (see `src/designer/sheetModel.ts`). On
**export** (`serializeDoc`, `src/designer/json.ts`) a derived, read-only `midi`
array is appended for convenience; on **import** (`parseSheetJson`) the `midi`
field is stripped and any missing fields are filled from `defaultDoc()`, so older
or partial files still load.

### SheetDoc fields

| Field | Type | Notes |
|-------|------|-------|
| `part` | string | Header: part label (e.g. "LH"). |
| `title` | string | Song title. |
| `subtitle` | string | Header subtitle. |
| `composer` | string | Header composer. |
| `tempoStyle` | string | Free-text tempo/style (e.g. "Allegro"). Not the numeric BPM. |
| `songKey` | `{ root: string \| null; quality: 'major' \| 'minor' \| null }` | `root` is a note id; `null` = no key set. |
| `tilesPerRow` | `number \| 'auto'` | Wrap width; `'auto'` fits to page. |
| `size` | number | Tile size in px. |
| `paper` | `'A4' \| 'A3' \| 'Letter' \| 'Legal'` | Page size. |
| `orientation` | `'portrait' \| 'landscape'` | Page orientation. |
| `accidentalStyle` | `'sharp' \| 'flat'` | How accidentals are spelled. |
| `bpm` | number | Playback tempo, 20–300. Defaults to 120 on files without it. |
| `items` | `Item[]` | The sheet content, in order (see below). |

### Item types

Each entry in `items` is one of:

| `type` | Shape | Meaning |
|--------|-------|---------|
| `note` | `{ type: 'note'; noteId: string }` | A pitch-class tile. Octave is derived at playback, not stored. |
| `arrow` | `{ type: 'arrow'; dir: 'up' \| 'down' }` | Sets the melodic run direction for following notes. |
| `pause` | `{ type: 'pause' }` | A rest (sounds as silence during playback). |
| `break` | `{ type: 'break' }` | Forces a new row; no sound. |
| `section` | `{ type: 'section'; text: string }` | A labelled section header; no sound. |

`noteId` values come from the tile set (`src/notes.ts`); accidentals use an `s`
suffix internally (e.g. `Cs` = C♯).

### Derived `midi` (export only)

`serializeDoc` adds `midi: { index, midi, name }[]` — the playable melody with
concrete octaves resolved (same logic as playback). It is informational and is
discarded on import; it never round-trips into the model.

### Minimal example

```json
{
  "part": "", "title": "Scale", "subtitle": "", "composer": "", "tempoStyle": "",
  "songKey": { "root": null, "quality": null },
  "tilesPerRow": "auto", "size": 64, "paper": "A4", "orientation": "portrait",
  "accidentalStyle": "sharp", "bpm": 120,
  "items": [
    { "type": "note", "noteId": "C" },
    { "type": "note", "noteId": "D" },
    { "type": "pause" },
    { "type": "note", "noteId": "E" }
  ]
}
```

## URL hash encoding

Share/embed links carry a sheet in the URL **hash fragment**, base64url-encoded
(see `src/quiz/encode.ts`). Encoding: JSON → UTF-8 bytes → base64 →
URL-safe (`+`→`-`, `/`→`_`, trailing `=` stripped). Because the payload lives in
the hash, it never reaches the server; there is no length limit beyond the
browser's URL cap, so very large sheets make very long links.

| Hash key | Payload (decoded JSON) | Opens | Producer / consumer |
|----------|------------------------|-------|---------------------|
| `#edit=` | a `SheetDoc` | the designer, seeded with the sheet | `encodeSheet` / `readEditFromHash` |
| `#view=` | a `SheetDoc` | the read-only `SheetPlayer` (full-screen) | `encodeSheet` / `readViewFromHash` |
| `#quiz=` | `{ doc: SheetDoc, quiz: { knownPct, seed } }` | the standalone quiz player | `encodeQuiz` / `readQuizFromHash` |

Notes:
- `#edit=` and `#view=` share the **same payload** (a bare `SheetDoc`); only the
  surface that opens differs.
- A bare `#view` with no/invalid payload opens the player empty so a local JSON
  file can be loaded.
- `#quiz=` also accepts a bare `SheetDoc` (no `quiz` addon), which decodes with the
  default difficulty preset.
- The `quiz` addon stores difficulty *parameters* (`knownPct`, `seed`), not fixed
  blanks, so a taker can adjust difficulty from the shared starting point.

### Link shape

```
https://<host>/<path>#view=<base64url(JSON.stringify(sheetDoc))>
```
