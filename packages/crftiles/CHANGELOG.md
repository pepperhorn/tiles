# Changelog

## 0.1.1

### Fixed

- Stop now silences the piano. smplr 1.x queues notes more than 200ms ahead and its `stop()` only ends notes already
  sounding, so after Stop the cursor halted but the rest of the sheet kept playing. Each scheduled note is now
  cancelled through its own stop handle.

## 0.1.0

First release: the Note·Tiles read-only sheet viewer/player as an embeddable React component.

### Added

- `CrfTiles` component (also the default export), with these props:
  - `doc` (a SheetDoc object or tiles JSON text) or `src` (a URL, with `fetchOptions`);
  - `mode` (`player` | `static`), `chrome` (`full` | `minimal` | `none`) and `controls` (`tempo`, `tileSize`, `transport`);
  - `bpm` and `tileSize` (px or `xs`–`xxl`) initial overrides;
  - `height`, `className` and `ariaLabel`;
  - `audio` and `soundfont` (`instrument`, `kit`, `baseUrl`, `instrumentUrl`);
  - `onReady` and `onError`.
- `parseSheetJson`, the `SheetDoc` / `Item` types and a `version` constant.
- `style.css`, with every rule (Tailwind theme, preflight and utilities, the app's brutalist system, the embed layout)
  scoped under `.crftiles`. Poppins and Space Mono come as `@fontsource` imports.
- Server-side rendering is safe: nothing touches the DOM at module level, and smplr is imported only on the first Play.
