# crftiles

An embeddable, read-only **Note·Tiles** sheet viewer and player for React. It renders a tiles sheet (the colourful
pitch-class tiles from the Note·Tiles app) fit to its container's width. It can also play the sheet on a piano, with
tempo, loop, metronome and count-in controls. It looks like the app: same neo-brutalist controls, same tiles, same page.

```tsx
import { CrfTiles } from 'crftiles';
import 'crftiles/style.css';

<CrfTiles doc={sheetDoc} />
```

## Install

```sh
npm install crftiles
```

Peer dependencies: `react` and `react-dom` 19 or later. Runtime dependencies:
- `smplr`: the piano, loaded lazily on the first Play.
- `@fontsource/poppins` and `@fontsource/space-mono`: the fonts.

## CSS

Import the stylesheet once, anywhere in your app:

```ts
import 'crftiles/style.css';
```

`style.css` starts with `@import "@fontsource/poppins/…"` and `@import "@fontsource/space-mono/…"`. Your bundler
(Vite, Astro, Next, webpack) resolves these and serves the font files from your own origin. No Google Fonts request
is made.

Every rule is scoped under the root class `.crftiles`. That includes the Tailwind utilities and the scoped Tailwind
preflight reset the component is built with. Nothing styles your page, and your page's element rules (`button {…}`,
`p {…}`, a Tailwind preflight in `@layer base`) don't reach inside: the embed's rules are unlayered and one class more
specific. The one global part is Tailwind's `@property --tw-*` registrations, which can't be scoped and only declare
custom properties.

## Usage

```tsx
// From a SheetDoc object, or tiles JSON text (both are validated like a file import)
<CrfTiles doc={sheet} />
<CrfTiles doc={jsonString} />

// From a URL (fetched on the client)
<CrfTiles src="/sheets/amazing-grace.json" />

// Read-only picture of the sheet: no transport, never loads audio
<CrfTiles doc={sheet} mode="static" chrome="none" />

// Just Play/Stop, a fixed-height box, bigger tiles
<CrfTiles doc={sheet} chrome="minimal" height="420px" tileSize="xl" />
```

## Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `doc` | `SheetDoc \| string` | | The sheet, as an object or as tiles JSON text. Run through `parseSheetJson`: missing fields are filled in, a value without an `items` array is rejected (`onError`). Wins over `src`. An object is keyed by its JSON content, so passing a new object with the same content doesn't reset the view. |
| `src` | `string` | | URL of a tiles JSON file, fetched in the browser. |
| `fetchOptions` | `RequestInit` | | Extra `fetch` options for `src` (headers, credentials). |
| `mode` | `'player' \| 'static'` | `'player'` | `static`: read-only, no transport or tempo, no audio. |
| `chrome` | `'full' \| 'minimal' \| 'none'` | `'full'` | `full`: Play/Stop/Loop/Metronome/Count-in, tempo slider, tile-size buttons. `minimal`: Play/Stop. `none`: the sheet alone. |
| `controls` | `{ tempo?, tileSize?, transport? }` | | Turn single controls on or off over the preset, e.g. `chrome="none" controls={{ tileSize: true }}`. |
| `bpm` | `number` | sheet's `bpm` | Initial tempo (clamped 20–300). The viewer can still change it. |
| `tileSize` | `number \| 'xs' \| 's' \| 'm' \| 'l' \| 'xl' \| 'xxl'` | sheet's `size` | Initial tile size, in px or as a label (xs 40, s 52, m 64, l 80, xl 96, xxl 112). |
| `height` | `string` | natural | Any CSS height. The sheet then scrolls inside. Without it the embed is as tall as its content. |
| `className` | `string` | | Added to the root (next to `crftiles`). |
| `ariaLabel` | `string` | `Note tiles: <title>` | The root is a `role="region"`. |
| `audio` | `boolean` | `true` | `false`: Play still moves the tile highlight, silently. No AudioContext is created and no samples are downloaded. |
| `soundfont` | `{ instrument?, kit?, baseUrl?, instrumentUrl? }` | gleitz MusyngKite piano | Where the piano samples come from. See CSP below. |
| `onReady` | `({ doc }) => void` | | After a sheet is parsed and rendered, and again for each new sheet. |
| `onError` | `(error: Error) => void` | | When the sheet can't be fetched or isn't a valid tiles doc. The embed also shows an inline error. |

Tempo and tile size are view-time overrides. The sheet you pass in is never modified.

### Exports

```ts
import CrfTiles, {
  CrfTiles,
  parseSheetJson,
  version,
  type CrfTilesProps,
  type SheetDoc,
  type Item,
  type ChromePreset,
  type CrfTilesControls,
  type SoundfontSource,
} from 'crftiles';
```

- `parseSheetJson(text)`: validates tiles JSON into a `SheetDoc`, and throws on a non-sheet.
- `version`: the package version.

The tiles JSON / `SheetDoc` format is documented in the app repo's `docs/FORMATS.md`.

## Layout

The sheet is an A4 (or Letter/A3/Legal) page laid out exactly like the app's print/export. It scales down (never up)
to fit the container's width, so it fits any column from a phone to a full-width section. In a narrow container the
tiles get small. Use `tileSize="xl"` / `"xxl"`, or leave the tile-size buttons on so readers can enlarge them. The
toolbar wraps to fit.

## SSR

The package is safe to import and render on the server: nothing touches `window` or `document` at module level.
The server renders the sheet itself. Fitting the page to the container width happens after hydration, in a layout
effect. Audio is only set up on the first Play.

- With `src`, the server renders a loading state; the fetch happens in the browser.
- To get the sheet into the server HTML, pass `doc`.

## CSP

- **Styles and fonts:** `style.css` and the fonts come from your own bundle (`style-src 'self'`, `font-src 'self'`).
  The component sets a few inline styles (tile sizes and colours, the fit-to-width zoom). Rendered in the browser,
  React applies them through the CSSOM, which CSP doesn't restrict. Server-rendered HTML carries them as `style`
  attributes. Under a strict `style-src`, those need `style-src-attr 'unsafe-inline'`, or the sheet looks unstyled
  until it's rendered on the client.
- **Piano samples:** loaded on the first Play by [smplr](https://github.com/danigb/smplr). The default is
  one JavaScript-format soundfont file, fetched with `fetch` and decoded, never executed:
  `https://gleitz.github.io/midi-js-soundfonts/MusyngKite/acoustic_grand_piano-ogg.js` (or `-mp3.js` where Ogg
  Vorbis isn't supported). This needs `connect-src https://gleitz.github.io`.
- **Self-hosting the samples:**
  - Copy the files from [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) and point the embed
    at them:
    ```tsx
    <CrfTiles doc={sheet} soundfont={{ baseUrl: '/soundfonts' }} />
    // fetches /soundfonts/MusyngKite/acoustic_grand_piano-ogg.js (or -mp3.js)

    <CrfTiles doc={sheet} soundfont={{ instrumentUrl: 'https://cdn.example.org/piano-mp3.js' }} />
    ```
  - `instrument` and `kit` pick another General MIDI instrument or the `FluidR3_GM` kit.
- **No audio at all:** `audio={false}` or `mode="static"` makes no network requests beyond your own bundle.
- **Not needed:** no `eval`, no workers, no `blob:` URLs. The metronome click is synthesised with an
  `OscillatorNode`.

## Astro

The component is interactive, so mount it as a React island (with `@astrojs/react` installed):

```astro
---
import { CrfTiles } from 'crftiles';
import 'crftiles/style.css';
import sheet from '../data/amazing-grace.tiles.json';
---
<article>
  <h1>Amazing Grace</h1>
  <CrfTiles client:visible doc={sheet} chrome="full" />
</article>
```

- `client:visible` hydrates the island when it scrolls into view.
- The sheet itself is server-rendered from `doc`, so it shows before hydration.
- For a purely decorative sheet with no controls, render `<CrfTiles doc={sheet} mode="static" chrome="none" />`
  without a `client:` directive. It's server-rendered HTML (fit-to-width scaling needs hydration, so give it a wide
  enough column or use `client:visible`).

## Development

The component reuses the Note·Tiles app's own sources (`../../src`: the sheet layout, tiles, viewer controls and
player) and its brutalist stylesheet (`src/brutalist.css`), so the embed and the app can't drift apart.

```sh
npm ci                  # at the repo root (the package uses the root node_modules)
cd packages/crftiles
npm run dev             # demo page (demo/) with a real sheet, on 0.0.0.0
npm test                # vitest
npm run lint            # eslint
npm run build           # dist/: index.js, style.css, types
npm pack                # builds (prepack) and writes crftiles-<version>.tgz
```

The build fails if `dist/` would contain export/PDF code (jspdf, html2canvas), the crf-admin library fetch, a static
`smplr` import, a remote font import, or a CSS selector outside `.crftiles` (`scripts/finalize-dist.mjs`).

## Licence

MIT © 2026 PepperHorn. Poppins and Space Mono are under the SIL Open Font License 1.1 (via `@fontsource`). smplr is
MIT. The default piano samples (gleitz/midi-js-soundfonts, MusyngKite) are under their own licence (CC BY-SA 3.0), and
are fetched at runtime, not shipped.
