# Site Directions

Five candidate directions for a more refined public site, each applied
consistently to the home, a documentation page and the changelog. They extend
the baseline Folio mockups in [Site design](./site-design.md) so the user can
compare complete directions rather than isolated pages. Every direction keeps
the routes, header and footer destinations, approved copy, real changelog
facts and accessibility rules of [Site](./site.md); it changes composition,
hierarchy, density and rhythm, not the product story.

## Delivery Status

Exploration tracked by [Public Site And Docs](../../plans/public-site-and-docs.md)
Milestone 2A. One direction is selected by the user afterwards; the selected
direction replaces the baseline screens in `design/site/` and the others are
retired. Until then the baseline remains the implementation reference.

## Shared Rules

- Each direction lives under `examples/basic/entries/design/site/variants/<slug>/`
  with one component per screen, mobile and desktop variants, light and dark.
- Each direction owns one stylesheet, `examples/basic/generated/site-<slug>.css`,
  matched by a `design/site/<slug>/**` rule ahead of the baseline rule. It
  references only the `--site-*` properties from `site-tokens.css` and holds no
  literal color. A direction may import `site.css` for shared parts.
- Directions reuse the baseline parts (brand, links, metadata, code panel,
  docs section data) where their composition allows; a direction that needs a
  different header or footer composes its own parts under its folder.
- The Mokly catalogue chrome is the reference for controls, density and
  hierarchy: the same mark, the 6px control geometry, hairline separators,
  quiet filled current-state backgrounds and the green accent. A direction
  should feel like the marketing face of the product the catalogue shell
  belongs to.
- The stage on the home shows the example Welcome screen in a framed panel
  with the real merged pull request label and the Ready for review status.
- Screens carry no notes, labels or annotations about the direction itself.

## Directions

| Slug        | Title     | Intent                                                                                             |
| ----------- | --------- | -------------------------------------------------------------------------------------------------- |
| `editorial` | Editorial | Large serif-free type set on a strict baseline; magazine hierarchy with wide margins and hairlines |
| `product`   | Product   | The catalogue shell as hero: a full-width framed Browse with the top bar, navigation and stage     |
| `grid`      | Grid      | A visible 12-column system with aligned modules, dense feature cards and a bordered docs frame     |
| `minimal`   | Minimal   | Sparse, centered, generous white space; single-column docs with a floating on-this-page rail       |
| `bands`     | Bands     | Alternating full-bleed canvas and muted bands; sticky docs sidebar and a timeline changelog        |

## Inventory

| Entry id                          | Route                                  | Screen                       |
| --------------------------------- | -------------------------------------- | ---------------------------- |
| `design-site-editorial-home`      | `design/site/editorial/home.html`      | Editorial home               |
| `design-site-editorial-docs`      | `design/site/editorial/docs.html`      | Editorial documentation page |
| `design-site-editorial-changelog` | `design/site/editorial/changelog.html` | Editorial changelog          |
| `design-site-product-home`        | `design/site/product/home.html`        | Product home                 |
| `design-site-product-docs`        | `design/site/product/docs.html`        | Product documentation page   |
| `design-site-product-changelog`   | `design/site/product/changelog.html`   | Product changelog            |
| `design-site-grid-home`           | `design/site/grid/home.html`           | Grid home                    |
| `design-site-grid-docs`           | `design/site/grid/docs.html`           | Grid documentation page      |
| `design-site-grid-changelog`      | `design/site/grid/changelog.html`      | Grid changelog               |
| `design-site-minimal-home`        | `design/site/minimal/home.html`        | Minimal home                 |
| `design-site-minimal-docs`        | `design/site/minimal/docs.html`        | Minimal documentation page   |
| `design-site-minimal-changelog`   | `design/site/minimal/changelog.html`   | Minimal changelog            |
| `design-site-bands-home`          | `design/site/bands/home.html`          | Bands home                   |
| `design-site-bands-docs`          | `design/site/bands/docs.html`          | Bands documentation page     |
| `design-site-bands-changelog`     | `design/site/bands/changelog.html`     | Bands changelog              |

The directions collection `design-site-variants` is a child of `design-site`
and holds one collection per direction. Each direction collection holds its
three screens in the order home, documentation, changelog.
