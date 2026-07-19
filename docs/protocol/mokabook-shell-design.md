# Mokabook Shell Design Contract

## Scope

This document records the approved neutral design for the package-owned Browse
and Review shell before the UI milestone implements it. The visual source of
truth is the design catalogue in the basic example under the `design/` routes;
this contract fixes the tokens and responsive behavior that implementation and
tests must preserve. Runtime behavior stays in
[mokabook-runtime.md](./mokabook-runtime.md).

## Design Mockups

The approved screens are authored in
`examples/basic/entries/design/` and generated under
`examples/basic/generated/design/`:

| Route                                     | State                                 |
| ----------------------------------------- | ------------------------------------- |
| `design/browse/views/home.html`           | Catalogue home with navigation tree   |
| `design/browse/views/screen.html`         | Selected screen with framed fragments |
| `design/browse/views/use-case.html`       | Selected use case with ordered steps  |
| `design/browse/states/details.html`       | Expanded details panel                |
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

| Property                     | Default   | Used for                          |
| ---------------------------- | --------- | --------------------------------- |
| `--mokabook-accent`          | `#6f4e37` | Brand mark, active pills and rows |
| `--mokabook-accent-contrast` | `#ffffff` | Text and glyphs on the accent     |
| `--mokabook-accent-soft`     | `#f2eae3` | Active-row and highlight surfaces |

A consumer accent pair must keep at least WCAG AA contrast between
`--mokabook-accent` and `--mokabook-accent-contrast`; the shell does not
recompute contrast at runtime.

## Package-Owned Tokens

The shell is light-only (`color-scheme: light`) with a neutral warm-gray
surface family and the coffee-brown default accent:

| Token          | Value                        | Role                       |
| -------------- | ---------------------------- | -------------------------- |
| `--mb-bg`      | `#f6f5f3`                    | Application background     |
| `--mb-surface` | `#ffffff`                    | Cards, bars, panes         |
| `--mb-border`  | `#ddd8d1`                    | Hairline borders           |
| `--mb-text`    | `#27211b`                    | Primary text               |
| `--mb-muted`   | `#6f675d`                    | Secondary text             |
| `--mb-radius`  | `10px`                       | Card and panel radius      |
| `--mb-shadow`  | `0 1px 2px rgb(39 33 27/8%)` | Elevation for frames/pills |

Review classification colors pair a strong tone for dots/text with a soft tone
for badge and tint backgrounds:

| State        | Strong    | Soft      |
| ------------ | --------- | --------- |
| Added        | `#1d7a3d` | `#e3f0e7` |
| Changed      | `#9a6b00` | `#f6ecd4` |
| Removed      | `#b3261e` | `#f7e2e0` |
| Ignored-only | `#6c6862` | `#edebe8` |

Typography uses the system stack (`system-ui, sans-serif`) at a 14px shell base
with `ui-monospace, monospace` for routes, ids, and paths. The shell ships no
consumer product fonts, and no Accounting or Bookfolio color, name, or route
family may appear in shell styles or copy.

## Layout And Responsive Behavior

The shell has one breakpoint at **56.25rem (900px)**:

- At or above the breakpoint, the shell is a two-column grid: a persistent
  16.25rem navigation column and the main view, under a full-width top bar
  carrying the brand, Browse/Review mode switch, search, and the changed/all
  filter.
- Below the breakpoint, the navigation column collapses. The top bar gains a
  menu button that opens the catalogue tree as an overlay drawer (82% width,
  scrimmed backdrop) over the main view; search and filter fold into the
  drawer.

Within the main view:

- Device frames (phone frame ~15rem wide, browser frame fluid with a minimum
  of 22rem) wrap onto separate rows when the stage is narrow, and sit side by
  side when space allows.
- Review compare panes use a responsive grid (`minmax(16rem, 1fr)`) that shows
  before/after side by side on wide viewports and stacks them vertically on
  narrow ones.
- The details panel spans the main column and stacks its metadata sections
  from a multi-column grid to a single column as space narrows.

Viewport and comparison-mode switches are segmented controls; the active
segment uses the accent pair. Active navigation rows use the soft accent with a
3px inset accent bar. Status dots, badges, and difference tints use only the
state colors above.

## Related Docs

- [Build, Browse, and Review runtime](./mokabook-runtime.md)
- [Package and authoring contract](./mokabook-package.md)
