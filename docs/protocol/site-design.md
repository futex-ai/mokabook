# Site Design

The public site uses Folio, the design selected for the Mokly product and
marketing on 2026-09-15, so moving from the site to the app feels like one
product. This contract fixes the tokens, type, layout and brand the site must
implement, and the mockups that are its visual source of truth. Routes and
copy are in [Site](./site.md).

## Ownership

Tokens are defined once as CSS custom properties on the document root in one
site stylesheet, `site/src/styles/tokens.css`, as `--site-*` properties.
Every other site stylesheet references those properties; a test fails the
build when any other stylesheet contains a literal color. The site ships light
and dark. Colors follow `prefers-color-scheme`, and the document root's
`data-color-scheme="light" | "dark"` attribute overrides that preference for
deterministic screenshots. The two repositories share Folio by copying these
tables; a published tokens package is not planned.

## Surfaces

| Token             | Light     | Dark      | Use                                |
| ----------------- | --------- | --------- | ---------------------------------- |
| `folio`           | `#fbfaf7` | `#1c1b19` | Page canvas                        |
| `folioMuted`      | `#f0eeea` | `#252420` | Docs sidebar and quiet sections    |
| `folioSurface`    | `#ffffff` | `#211f1b` | Stage, code panels, inset surfaces |
| `folioInk`        | `#2d2b27` | `#efece5` | Headings and body                  |
| `folioInkMuted`   | `#67615a` | `#b9b3a9` | Secondary copy                     |
| `folioLine`       | `#e3dfd8` | `#3c3933` | Decorative hairlines               |
| `folioLineStrong` | `#858077` | `#898276` | Meaningful control boundaries      |

## Accent, Status And Focus

| Token          | Light     | Dark      | Use                              |
| -------------- | --------- | --------- | -------------------------------- |
| `accent`       | `#176b46` | `#91dab0` | Primary actions, links, emphasis |
| `accentHover`  | `#105a39` | `#aeebc7` | Hovered primary actions          |
| `accentActive` | `#0d492f` | `#bdf4d2` | Pressed primary actions          |
| `onAccent`     | `#ffffff` | `#102218` | Text on accent fills             |
| `accentSoft`   | `#e2f2e9` | `#183d29` | Selected or quiet accent areas   |
| `focus`        | `#0b6bcb` | `#83baff` | Keyboard focus indicator         |
| `success`      | `#176b46` | `#91dab0` | Success text                     |
| `successSoft`  | `#e2f2e9` | `#183d29` | Success background               |
| `warning`      | `#80570c` | `#f4cd75` | Warning text                     |
| `warningSoft`  | `#fff2ce` | `#3b3015` | Warning background               |
| `danger`       | `#b42332` | `#ffafb7` | Error text                       |
| `dangerSoft`   | `#ffe9ea` | `#441e28` | Error background                 |
| `info`         | `#175cd3` | `#9fc3ff` | Info text                        |
| `infoSoft`     | `#e8f0ff` | `#182f4f` | Info background                  |

Pair each status color with its soft background. Use `onAccent` on solid
accent fills in every state. Underline links in body text. Never use a
decorative `folioLine` as the sole boundary of a control, and never convey
state by color alone. Normal text needs 4.5:1 contrast; large text, meaningful
boundaries and focus rings need 3:1, checked in both schemes.

## Type

- `font.sans`: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- `font.mono`: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
- `font.display`: `Georgia, "Times New Roman", serif`, used only for the
  wordmark.
- Weights 400, 500, 600, 700. Sizes are rem against a 16px base; respect
  browser text scaling and avoid fixed-height text containers.

| Role       | Mobile size / line | Desktop size / line | Weight |
| ---------- | ------------------ | ------------------- | ------ |
| `caption`  | 12 / 18            | 12 / 18             | 500    |
| `small`    | 14 / 20            | 14 / 20             | 400    |
| `body`     | 16 / 24            | 16 / 24             | 400    |
| `lead`     | 20 / 30            | 20 / 30             | 400    |
| `heading3` | 24 / 32            | 24 / 32             | 600    |
| `heading2` | 28 / 36            | 32 / 40             | 600    |
| `heading1` | 36 / 44            | 48 / 56             | 600    |

Headings use `-0.02em` letter spacing; page headings on document pages use
`-0.045em` and weight 700. The home hero is a semibold sans heading at 64px
desktop and 44px mobile, line height 1.05, letter spacing `-0.05em`, with its
second line in `accent`. Section headings on the home use `heading2` with the
same accent second line. Eyebrows use `small` in `folioInkMuted`. Feature
numbers and closing step markers use `font.mono` in `accent`. Prose stays
within `65ch`.

## Space And Layout

- Spacing scale in pixels: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.
- Breakpoint `768px`; below it use the mobile composition.
- `contentMax` `1120px` centered for marketing content; header and footer
  align to the same measure. Prose measure `65ch`. Form width `440px`.
- Gutters `20px` mobile, `40px` desktop. Section spacing `48px` mobile,
  `80px` desktop.
- Interactive targets at least `44px`. Controls use a 6px radius; panels and
  the stage use 10px.
- Docs layout: 244px left sidebar on `folioMuted`, a document column at most
  976px including 48px side padding, and a 240px on-this-page column; below
  the breakpoint the sidebar becomes a disclosure above the document and the
  on-this-page list moves under the title.
- Layouts remain usable at 320px width and 200% text zoom. Inspection
  viewports are 390px mobile and 1440px desktop.

## Radius, Elevation, Focus And Motion

| Radius   | Pixels | Use                          |
| -------- | ------ | ---------------------------- |
| `small`  | 6      | Controls, badges, code panel |
| `medium` | 10     | Stage and panels             |
| `pill`   | 999    | Status badges                |

Shadows: `medium` is `0 8px 24px rgb(22 33 27 / 10%)` light and
`0 8px 24px rgb(0 0 0 / 32%)` dark, used only on the hero stage. Focus is a
2px solid `focus` outline with 3px offset, never removed; forced-colors mode
keeps a system outline. Transitions use 120ms or 180ms with
`cubic-bezier(0.2, 0, 0, 1)` and honor reduced motion.

## Brand

The mark is the two overlapping rounded rectangles with two short rules, drawn
in `accent` with the rules in `folioSurface`. The wordmark is lowercase
`mokly` in `font.display` at 1.75rem desktop and 1.5rem mobile with the period
in `accent`. The mark and wordmark together link Home.

## Components

- Header and footer: flex rows within `contentMax`; footer has a `folioLine`
  top hairline. Links are `small` in `folioInkMuted`, 44px tall; the current
  route is `folioInk`. The desktop **Get started →** is a small rounded
  secondary button with a `folioLineStrong` boundary; the hero and closing
  **Get started →** are solid `accent` buttons with `onAccent` text; **Read
  the docs** is a quiet button with no fill.
- Stage: `folioSurface` panel with a `folioLine` border, `medium` radius and
  shadow. Head row holds the pull request label (`small`) and the **Ready for
  review** badge (success text on `successSoft`, pill, with a decorative dot).
  Body is 500px tall on desktop and 440px on mobile and clips its content.
  Foot row names the screen.
- Feature grid: three columns on desktop, one on mobile; each article has a
  `folioLine` top hairline, the mono number, a `lead`-sized title and muted
  body.
- Closing: `folioMuted` panel with `medium` radius on desktop (no radius on
  mobile), two columns on desktop, copy and actions left, the ordered steps
  right with accent mono markers.
- Document pages (changelog, terms, privacy, docs): eyebrow, page heading,
  optional lead, then content with `folioLine` section hairlines. Changelog
  entries are two columns on desktop, version and date left, notes right.
  Terms and Privacy use an 840px measure with the placeholder heading and the
  cross-policy link.
- Code panel: `folioSurface` with a `folioLine` border, `small` radius, mono
  text, and a copy control in the top-right corner with a visible label on
  focus and a confirmation after copying.
- Status badges, buttons and the search control keep the shared control
  geometry; no site stylesheet overrides a control's font, radius or colors.

## Mockups

The Folio marketing screens from the cloud repository at commit `47ede2e` are
ported into this repository's example design catalogue under
`examples/basic/entries/design/site/` and generated under
`examples/basic/generated/design/site/`. They are the visual source of truth
for Milestone 4 onward; refinements happen here first, then in the site.

| Entry id                | Route                              | Screen                                            |
| ----------------------- | ---------------------------------- | ------------------------------------------------- |
| `design-site-home`      | `design/site/home.html`            | Home with hero, stage, features and closing       |
| `design-site-docs`      | `design/site/docs.html`            | A docs page with sidebar, on-this-page and search |
| `design-site-changelog` | `design/site/changelog.html`       | Changelog with one release entry                  |
| `design-site-terms`     | `design/site/terms.html`           | Terms placeholder document                        |
| `design-site-privacy`   | `design/site/privacy.html`         | Privacy placeholder document                      |
| `design-site-tour`      | `user-flows/design/site-tour.html` | Home → Docs → Changelog → Terms → Privacy         |

Each screen is one component rendering mobile and desktop variants in light
and dark. Screens compose shared parts under
`examples/basic/entries/design/site/parts/`: brand, header, footer, actions,
stage, feature grid, closing, document page and code panel. Site mockups use
the example's registered `@firna/ui` controls for buttons, badges and inputs.
Folio tokens live in `examples/basic/generated/site-tokens.css`; the site
layout styles in `examples/basic/generated/site.css` reference only those
properties. Mockup copy comes from the approved home copy in
[Site](./site.md#home-copy); mockup release facts come from the real
`CHANGELOG.md` at the time of authoring and are labelled as fixtures in the
entry description, not in the screen. The stage shows the example's Welcome
screen inside the framed panel. Screens contain no implementation notes.
