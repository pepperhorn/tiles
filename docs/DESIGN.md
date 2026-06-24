# Note·Tiles — Design System

The UI is a **neo-brutalist** frame around colourful note tiles: high contrast,
square corners, hard offset shadows, no soft/rounded "web app" styling. Every new
component must match this language. The source of truth is `src/index.css`
(`:root` tokens + the labelled style blocks). **Reuse the existing classes — do
not hand-roll one-off Tailwind for things the system already defines.**

## Tokens (`src/index.css :root`)

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#141210` | All borders, text, shadows |
| `--paper` | `#fdfcf9` | Page / surface background |
| `--shadow` | `5px 5px 0 var(--ink)` | Primary buttons, pressed tabs, overlays |
| `--shadow-sm` | `3px 3px 0 var(--ink)` | Standard buttons, tabs, toolbar |
| `--t1…--t12` | 12 tile colours | The note palette + spectrum stripe |
| `--accent` | `--t5` (yellow) | Active/selected fills |
| `--primary` | `--t8` (green) | Go / confirm buttons |

Shadows are **hard and offset** (no blur, no alpha). Corners are **square**
(`border-radius: 0`). Borders are **solid `var(--ink)`**, 2–3px.

## Typography

- **Body:** Poppins (`400–700`).
- **Brand mark:** Archivo Black, uppercase, tight tracking.
- **Labels / tabs / section titles:** Space Mono, uppercase, wide tracking
  (`.lbl`, `.brut-tab`, `.section-title`).

## Interaction (the brutalist press)

Every interactive control uses the same motion so the whole UI feels one piece:

```css
box-shadow: var(--shadow-sm);
transition: transform .08s ease, box-shadow .08s ease;
/* hover  */ transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--ink);
/* active */ transform: translate(2px, 2px);  box-shadow: 1px 1px 0 var(--ink);
```

Selected/pressed state = **fill with `--accent`** (or keep the segmented group's
fill), never a colour-only/underline treatment.

### Two tiers of emphasis

Buttons come in two deliberate tiers so the UI has hierarchy:

- **Tier 1 — full brutalist** (primary creative tools): square corners, 2px ink
  border, hard `--shadow-sm`/`--shadow` offset, the translate press above. Toolbar,
  transport, key, transpose, primary/go.
- **Tier 2 — softer** (utility / file & export actions): rounded corners (`8px`),
  hairline border (`1.5px rgba(ink,.28)`), a gentle **blurred** shadow, and a quiet
  press (no hard translate). Used for Save / Load / Import-Export / Print / Email.
  Keep tier 2 reserved for secondary actions — it should never out-shout tier 1.

## Button & control families (pick one, don't invent)

| Family | Classes (examples) | Look |
| --- | --- | --- |
| **Tier 1 outline action** | `.btn-play .btn-new-sheet .btn-key .btn-undo …` | 2px ink border, square, `--shadow-sm`, hard press |
| **Tier 2 soft action** | `.btn-save .btn-load .btn-pdf .btn-print .btn-email …` | Rounded 8px, 1.5px hairline border, soft blurred shadow, quiet press |
| **Primary / go** | `.btn-download-pdf .btn-submit` | 2.5px border, `--primary` fill, `--shadow`, uppercase |
| **Masthead tab** | `.brut-tab` | 2.5px border, Space Mono, `--accent` fill when `aria-pressed` |
| **Segmented toggle** | `.btn-size .btn-paper .btn-orient .btn-type .btn-mode .palette-sharp-toggle .palette-flat-toggle .palette-autoupdown` | Square, 2px border; **selected fills `--accent`** purely via `[aria-pressed='true']` in `index.css` — the component only sets `aria-pressed`, never a fill class. Connected groups stay shadow-less |
| **Note / symbol tile** | `.palette-note .palette-up .palette-pause .palette-break …` | Square, 2px border, 2px tile shadow |
| **Notes toolbar** | any `button` inside `.designer-toolbar` | Auto-unified to one outline + `--shadow-sm` (see rule in `index.css`) |
| **Inline mini-action** | `.btn-apply-all .btn-sel-all .btn-sel-none .btn-reset-counts .btn-tpl-save .btn-tpl-load .btn-tpl-del .btn-diff-shuffle` | Space Mono uppercase ink text trigger, underline on hover (no box). For small in-group actions — **not** web-link blue |
| **Input** | `.input-name .input-email .overlay-input .num .tpl-* …` | Square, 2px ink border, white fill |
| **Overlay card** | `.overlay-card` + `.overlay-pop` | 3px border, `--shadow`, pop-in animation (square — never add `rounded-*`/`shadow-2xl`) |
| **Overlay action** | `.overlay-done .confirm-ok` (dark `--ink` fill) · `.overlay-clear .confirm-cancel` (paper) | Square 2px ink, hard press; the modal's confirm/cancel pair |

When you add a button, **add its class to the matching selector list** in
`index.css` (or place it inside an already-styled container like
`.designer-toolbar`) instead of styling it inline. A button that only has
Tailwind `rounded-* border shadow-*` will look foreign — that is the bug this
doc exists to prevent.

## Checklist for a new component

- [ ] Square corners (`border-radius: 0`), `var(--ink)` borders, **hard** offset shadow.
- [ ] Uses a token (`--ink/--paper/--accent/--primary/--shadow*`), not an ad-hoc hex.
- [ ] Interactive elements reuse an existing button/input/overlay family.
- [ ] Hover/active use the standard press motion; selected state fills with `--accent`.
- [ ] Labels that should read as "system chrome" use Space Mono uppercase.
- [ ] Anything that must not appear in print/export carries `no-print`.
- [ ] Sits correctly in the responsive layout (mobile-first; tools panel ≤45% on small screens).
