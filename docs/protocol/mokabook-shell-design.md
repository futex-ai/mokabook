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
| `design/review/outcomes/changed.html`     | Changed screen, side-by-side compare  |
| `design/review/outcomes/added.html`       | Added screen with missing base pane   |
| `design/review/outcomes/removed.html`     | Removed screen with missing head pane |
| `design/review/outcomes/difference.html`  | Tinted in-place difference mode       |
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

The shell is light-only (`color-scheme: light`) with the neutral sage-tinted
chrome family:

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
  a centred search field (max-width 440px, `⌕` glyph), and a right-aligned
  Browse/Review segmented mode switch. Below the breakpoint a menu button
  precedes the brand and opens the navigation drawer.
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
- **Details inspector** — collapsible `<details>` bottom panel, open by
  default: a bar with a rotating chevron, `Details`, and a muted hint; a
  two-column body (`1.35fr / 1fr`) with description and `Why this screen —`
  rationale on the left and uppercase-labelled metadata rows (Source,
  Generated, Related docs, Dependencies, Used by) on the right. Paths render
  as monospace chips; use cases render as pill chips with the flow icon.

## Device Chrome

- **Phone frame** — 390×844, 12px bezel padding, `#171a18` body,
  46px radius, floating notch (108×30 at top 22px), 36px-radius white screen,
  and a bottom home pill (128×4). The embedded mobile fragment fills the
  screen with a matching 36px radius.
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

## Responsive Behavior

The shell has one breakpoint at **56.25rem (900px)**:

- At or above it, the navigation column is persistent and the layout is the
  fixed two-column split above.
- Below it, the navigation becomes a scrimmed overlay drawer (82% width, max
  20rem) opened by the top-bar menu button; the phone frame scales via
  `aspect-ratio: 390 / 844` within available width, the browser frame drops
  to 560px height, flow connector lines hide, and the details body stacks to
  one column. When a screen head cannot fit its title and viewport control on
  one row, the control wraps beneath the title and spans the available width.

`prefers-reduced-motion: reduce` disables shell transitions.

## Review Artifact Legacy Styles

The static Review artifact pages inline the shell stylesheet and keep their
existing `mb-*` markup. The stylesheet therefore must keep:

- The `--mb-*` token set (`--mb-bg`, `--mb-surface`, `--mb-border`,
  `--mb-text`, `--mb-muted`, `--mb-radius`, `--mb-shadow`) mapped onto the
  chrome palette, plus the review classification pairs: added
  `#1d7a3d`/`#e3f0e7`, changed `#9a6b00`/`#f6ecd4`, removed
  `#b3261e`/`#f7e2e0`, ignored `#6c6862`/`#edebe8`.
- The legacy class subset the artifact markup uses (`mb-empty`, `mb-code`,
  `mb-title-row`, `mb-viewswitch`, `mb-viewswitch-option`, `mb-frag`,
  `mb-nav-group`, `mb-nav-list`) alongside the review-specific classes in the
  review stylesheet module.

## Related Docs

- [Build, Browse, and Review runtime](./mokabook-runtime.md)
- [Package and authoring contract](./mokabook-package.md)
