# Mokabook Shell Design Contract

## Scope

This document records the approved design for the package-owned Browse shell
and the legacy styling contract the static Review artifact keeps. The design is
the refined Mockbook shell originally shipped inside the Accounting repository,
ported here without any Accounting or Bookfolio content. The visual source of
truth is the design catalogue in the basic example under the `design/` routes;
this contract fixes the tokens, dimensions, and responsive behavior that
implementation and tests must preserve. Runtime behavior stays in
[mokabook-runtime.md](./mokabook-runtime.md).

## Design Mockups

The approved screens are authored in `examples/basic/entries/design/` and
generated under `examples/basic/generated/design/`:

| Route                                     | State                                 |
| ----------------------------------------- | ------------------------------------- |
| `design/browse/views/home.html`           | Catalogue home with navigation tree   |
| `design/browse/views/screen.html`         | Selected screen with framed fragments |
| `design/browse/views/use-case.html`       | Selected use case with ordered steps  |
| `design/browse/states/details.html`       | Expanded details inspector            |
| `design/browse/states/missing-route.html` | Not-found view with navigation        |
| `design/browse/states/navigation.html`    | Collapsed navigation drawer           |
| `design/browse/states/dark-scheme.html`   | Dark selected, dark device screens    |
| `design/browse/states/light-only.html`    | Light-only screen under dark          |
| `design/review/outcomes/changed.html`     | Changed screen, side-by-side compare  |
| `design/review/outcomes/added.html`       | Added screen with missing base pane   |
| `design/review/outcomes/removed.html`     | Removed screen with missing head pane |
| `design/review/outcomes/difference.html`  | Tinted in-place difference mode       |
| `design/review/outcomes/dark-scheme.html` | Dark view compared side by side       |
| `design/review/impact/shared-impact.html` | Summary with shared-impact card       |
| `design/review/impact/ignored-only.html`  | Ignored-region-only classification    |
| `design/review/impact/empty.html`         | Empty comparison result               |

Every screen ships one mobile and one desktop variant. Mockup implementation
notes live in entry descriptions, rationale, and related docs — never inside
the rendered screen area.

## Consumer-Tunable Custom Properties

Consumers may set exactly these CSS custom properties to tune the shell accent.
The shell reads them with the defaults below; every other shell style is
package-owned and not a compatibility surface.

| Property                     | Default                   | Used for                          |
| ---------------------------- | ------------------------- | --------------------------------- |
| `--mokabook-accent`          | `#4f7864`                 | Brand mark, active pills and rows |
| `--mokabook-accent-contrast` | `#ffffff`                 | Text and glyphs on the accent     |
| `--mokabook-accent-soft`     | `rgba(79, 120, 100, 0.1)` | Hover and highlight surfaces      |

A consumer accent pair must keep at least WCAG AA contrast between
`--mokabook-accent` and `--mokabook-accent-contrast`; the shell does not
recompute contrast at runtime.

## Package-Owned Tokens

The shell chrome is light-only (`color-scheme: light`); only the inside of a
device screen follows the selected color scheme (see Color Scheme below). The
chrome family is neutral and sage-tinted:

| Token                    | Value                            | Role                     |
| ------------------------ | -------------------------------- | ------------------------ |
| `--chrome-bg`            | `#f4f4f1`                        | Application background   |
| `--chrome-surface`       | `#ffffff`                        | Cards, bars, panes       |
| `--chrome-ink`           | `#1a1d1c`                        | Primary text             |
| `--chrome-ink-2`         | `#4a4f4d`                        | Secondary text           |
| `--chrome-muted`         | `#7d8480`                        | Tertiary and labels      |
| `--chrome-border`        | `#e3e5e0`                        | Hairline borders         |
| `--chrome-border-strong` | `#c8ccc4`                        | Frame and strong borders |
| `--chrome-accent`        | `#2a4733`                        | Deep-accent prose links  |
| `--chrome-shadow`        | `0 30px 90px rgba(20,28,22,.14)` | Overlay elevation        |

Typography is **Inter** (a variable font packaged with the shell and served at
`/__mokabook/fonts/InterVariable.woff2` under its SIL OFL license) via
`--sans: "Inter", ui-sans-serif, system-ui, …` at a 13px shell base, with
`--mono: "SFMono-Regular", Consolas, …` for routes, ids, addresses, and paths.
The nav indent guides use the faint `--mbk-guide: #dbded8` tint. The shell
ships no consumer product fonts beyond Inter, and no Accounting or Bookfolio
color, name, or route family may appear in shell styles or copy.

## Layout

The shell fills the viewport (`100vh`, document scrolling disabled); every
scrollable region scrolls internally:

- **Top bar** — 48px, surface background, hairline bottom border: brand mark
  (24px rounded square in the accent with the `◫` glyph), the product name,
  a centred search field (max-width 440px, `⌕` glyph), the color-scheme
  control when the catalogue has one, and a right-aligned Browse/Review
  segmented mode switch. Below the breakpoint a menu button precedes the brand
  and opens the navigation drawer.
- **Navigation** — 248px column, `#fbfbfa` background, hairline right border.
  Head row `CATALOGUE` (uppercase, 11px) with a `Collapse all` text button;
  an All/Changed segmented filter (with a monospace changed count) when Git
  change detection is available; then the scrollable tree.
  - Groups are native `<details>` whose summary row shows a closed/open folder
    SVG pair (swapped via the `[open]` state), a bold label, and a monospace
    child count. Leaves show a screen, page, or flow SVG; flow icons read in
    the accent.
  - Rows indent 16px per depth from an 8px root inset and paint one faint
    1px vertical guide per ancestor depth. The hover/active highlight is an
    inset pill starting at the row's indent (`--mbk-indent`), so guides stay
    visible; the active row uses the accent with contrast text.
  - Route navigation opens every collection on the active row's path and
    scrolls that row into view. Search and Changed filtering may stay selected
    only while the active row remains visible.
- **Screen head** — surface band with the breadcrumb trail (11.5px, `›`
  separators; ancestor crumbs that resolve to a viewable route are links) and
  a title row: 19px heading plus a monospace ID button labelled `#<id>`. The
  button uses the standard pointer cursor, moves down 1px with an inset shadow
  while pressed, and copies the unprefixed ID without navigating.
  Screen routes place the right-aligned Mobile/Desktop/Both segmented viewport
  control in this band.
- **Stage** — dotted-grid background (22px radial dots), centred frames with
  40px gap, internal `overflow: auto`, `MOBILE` / `DESKTOP` uppercase frame
  labels, and no separate toolbar above the grid.
- **Details inspector** — collapsible `<details>` bottom panel, open by default
  until the user changes it, after which Browse retains that disclosure across
  routes and reloads: a bar with a rotating chevron, `Details`, and a muted
  hint; a two-column body (`1.35fr / 1fr`) with description and
  `Why this screen —` rationale on the left and uppercase-labelled metadata
  rows (Source, Generated, Schemes, Related docs, Dependencies, Used by) on the
  right. Paths render as monospace chips; use cases render as pill chips with
  the flow icon; the Schemes row is plain text naming the schemes the screen
  renders in (`light, dark`).

## Device Chrome

- **Phone frame** — 390×844, 12px bezel padding, `#171a18` body,
  46px radius, floating notch (108×30 at top 22px), a 36px-radius screen that
  is white unless the dark scheme is selected, and a bottom home pill (128×4).
  The screen is a column: a reserved status band followed by the embedded
  mobile fragment, which takes the remaining height and rounds only its bottom
  corners.
- **Phone status band** — the top 44px of the screen, padded `14px 28px 0` so
  its content clears the notch: a `9:41` clock on the left and cellular, Wi-Fi,
  and battery glyphs on the right. Text is 13.5px/600 in the screen ink
  (`--chrome-ink`, or `--mbk-dark-screen-ink` when the screen is dark) with
  tabular numerals; glyphs are 16×11 except the 22×11 battery, drawn with
  `currentColor` on their own viewBoxes. The band is device chrome, so it
  reserves space above the fragment rather than covering screen content.
- **Browser frame** — width 100%, max-width 1180px, height 760px, strong
  hairline border, 8px radius. Its 40px bar holds three traffic lights
  (`#d9655b`, `#dba43d`, `#50a86d`), a monospace address pill (copies the
  address on click, showing a `URL copied` toast), and the expand toggle.
- **Expand toggle** — a 26px bordered button (`⤢` / `⤡`). Expanding fixes the
  frame to `inset: 2.5vh 2.5vw` at overlay z-index over a scrim
  (`rgba(20, 28, 22, 0.55)`), locks body scroll, and swaps the glyph; Escape
  or clicking outside collapses it. Only one frame expands at a time.
- **Use-case flow** — vertical numbered steps (32px accent number tiles)
  joined by a 2px connector line, each with title, description, a
  `This screen in the catalogue: <title> →` link, and one browser frame
  (height 640px) indented under the step head.
- **Legacy embed** — a bordered, 12px-radius iframe pane on the dotted stage.

## Color Scheme

A catalogue may render dark fragments beside its light ones. The selection
changes only what a device screen shows; every shell surface around the frames
keeps the light chrome palette in both schemes.

| Token                   | Value     | Role                             |
| ----------------------- | --------- | -------------------------------- |
| `--mbk-dark-screen-bg`  | `#121514` | Dark device-screen surface       |
| `--mbk-dark-screen-ink` | `#eef1ef` | Text and glyphs on a dark screen |

There is no third dark token: the secondary dark tones (status-band ink, home
pill, screen hairline, and the depicted screen content) are `color-mix` blends
of those two.

- **Containment** — dark paints the phone screen surface, including its
  status-band ink, its home pill, and the fragment it holds, and the browser
  viewport surface. The phone body and notch, the browser bar with its traffic
  lights and address pill, and every shell surface outside a device screen stay
  light.
- **Screen edge** — a dark screen inside the near-black phone body would lose
  its edge, so the phone screen carries a 1px inset `box-shadow` hairline mixed
  from the two dark tokens, painted on an overlay above the fragment so the
  embedded document cannot occlude it:
  `color-mix(in srgb, var(--mbk-dark-screen-ink) 12%, var(--mbk-dark-screen-bg))`.
  The browser viewport needs none; its light bar already draws that edge.
- **Control** — a `Light | Dark` `mbk-seg`, shown only when the catalogue has
  dark fragments. At or above the breakpoint it sits in the top bar between the
  search field and the mode switch; below it the top bar has no room, so it
  renders in the screen head band under the viewport control at full width.
- **Light-only screens** — a screen with no dark render keeps its light frames
  under a dark selection and states the fallback in its frame label, which
  gains an `mbk-frame-scheme-note` span so the caption reads
  `MOBILE — LIGHT ONLY` or `DESKTOP — LIGHT ONLY`. The note is the
  lighter-weight tail of the same uppercase label, not a separate badge.
  A use-case step frame carries the same fallback state but has no label, so it
  shows no scheme caption.
- **Compare pages** — the comparison band carries the same control as a third
  segment after the comparison-mode and viewport segments, with the viewport
  and scheme pair kept together at the trailing edge. A screen with only light
  views shows no scheme segment, and dark reaches the compared device screens
  only: the changed-screens navigation, head band, classification badge, and
  the segments themselves stay light.

## Responsive Behavior

The shell has one breakpoint at **56.25rem (900px)**:

- At or above it, the navigation column is persistent and the layout is the
  fixed two-column split above.
- Below it, the navigation becomes a scrimmed overlay drawer (82% width, max
  20rem) opened by the top-bar menu button in both Browse and Review; the
  phone frame scales via `aspect-ratio: 390 / 844` within available width, the
  browser frame drops to 560px height, flow connector lines hide, the details
  body stacks to one column, and the color-scheme control moves from the top
  bar into the screen head band. When a screen head cannot fit its title and
  the controls on one row, they wrap beneath the title and span the available
  width, stacking the scheme control under the viewport control.

`prefers-reduced-motion: reduce` disables shell transitions.

## Review Pages

Review pages render in the same shell scaffold as Browse and inline the shell
stylesheet so the static artifact stays viewable from disk. Each page has the
top bar with the drawer button, brand mark, base-comparison indicator, and a
Review pill that returns compare pages to the artifact index. Served pages
also show the Browse pill. Each page has a changed-screens navigation column
using the `mbk-chg-*` classes: group heads with classification dots and
counts, title-and-route rows with the accent active state, and shared-impact
and ignored-region cards. Compare pages reuse the screen head, `mbk-seg`
segments for the comparison-mode, viewport, and color-scheme controls,
`mbk-status` classification badges, and a summary band. The drawer control and
script remain inline so static artifacts retain narrow-viewport navigation
without a running server. The index renders the complete navigation inline. Compare
pages hydrate the same markup from the artifact-root `review-navigation.js`
payload and retain an `Open Review index` fallback in the navigation column
when JavaScript is unavailable, avoiding one full catalogue copy per viewport
page without changing the rendered design.

The compare stage keeps its `mb-*` classes and the `--mb-*` token set
(`--mb-bg`, `--mb-surface`, `--mb-border`, `--mb-text`, `--mb-muted`,
`--mb-radius`, `--mb-shadow`) mapped onto the chrome palette, plus the review
classification pairs: added `#1d7a3d`/`#e3f0e7`, changed `#9a6b00`/`#f6ecd4`,
removed `#b3261e`/`#f7e2e0`, ignored `#6c6862`/`#edebe8`. The pane grid
(`mb-panes`, `mb-pane`, `mb-pane-doc`, `mb-pane-missing`, `mb-frag`) drives
the side-by-side, opacity-overlay, and blend-mode difference modes through
its `data-compare-mode` attribute.

## Related Docs

- [Build, Browse, and Review runtime](./mokabook-runtime.md)
- [Package and authoring contract](./mokabook-package.md)
