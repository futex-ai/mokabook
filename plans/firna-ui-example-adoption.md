# Firna UI Example Adoption

## Summary

Use `@firna/ui` components wherever the repository owns product-style UI, so
the bundled consumer proves Mokly's rendering, link-control, and registered
component contracts against the real Firna stack. Today only three controls
are used (`Button` in Action, `Badge` and `Input` in the Welcome and Details
screens). This plan adopts Firna typography, list rows, badges, fields, and a
richer Action across the example catalogue, and registers the new controls as
Mokly components with saved variants and editable props.

Where `@firna/ui` is applicable:

- `examples/basic/entries/catalogue.mockup.tsx` product screens (Welcome,
  Details) and the registered Example components under
  `examples/basic/entries/components/`.
- `tests/fixtures/large` and `tests/browser/link_controls_fixture.ts`, which
  mirror the example stack and should keep covering the same Firna subpaths.

Where `@firna/ui` is not applicable, by contract:

- Mokly's own Browse shell under `src/server/shell` and `src/client`. The
  [package boundary](../docs/architecture/package-boundary.md) and the
  [package protocol](../docs/protocol/mokly-package.md#rendering-boundary)
  forbid a dependency on `@firna/ui` or React Native Web inside the package.
- The `Design` catalogue under `examples/basic/entries/design/**`, including
  the miniature Welcome/Details depictions in `parts/mini_screens.tsx`. Those
  artboards depict the package-owned shell, which is plain HTML and CSS, and
  the [shell design contract](../docs/protocol/mokly-shell-design.md) requires
  them to stay aligned with it.
- The complete handbook document in `examples/basic/entries/document.tsx`. It
  demonstrates the plain complete-document API without the renderer adapter,
  so it keeps plain HTML.

Decisions:

- Adoption targets the pinned `@firna/ui` 0.14.0 API. The latest release is
  3.0.0, a major version; upgrading is separate work with its own plan. If the
  user wants the upgrade, land it before Milestone 2 of this plan so the new
  components are written once against the final API.
- Visible copy on Welcome and Details stays unchanged ("Welcome to Mokly",
  "Example catalogue details", "View details", "Return to welcome") so the
  design miniatures, browser tests, and link tests keep matching.
- New components use the shared `example-components.css` ownership pattern
  already used by Action and Toolbar; no per-component stylesheet is added.
- Firna controls that need client runtime (dropdowns, modals, sheets, toasts,
  date fields, data grid, drag select, calendar, workflow) are out of scope for
  a static catalogue and are not adopted.

Related contracts: [components](../docs/protocol/mokly-components.md),
[link controls](../docs/protocol/mokly-link-controls.md),
[design components](../docs/protocol/mokly-design-components.md),
[package rendering boundary](../docs/protocol/mokly-package.md#rendering-boundary).

## Milestone 1: Documentation and contract updates

Define the complete inventory of Firna usage in the example and the contracts
for the new registered components before any entry changes.

- [ ] Update `examples/basic/README.md`: list every `@firna/ui` subpath the
      example imports (`badge`, `button`, `input`, `list`, `theme`,
      `typography`), describe the new Status, Field, and Related screens
      components with their ids, routes, props, controls, and variants, and
      state which example surfaces intentionally stay plain HTML (handbook
      document, design artboards).
- [ ] Update `docs/protocol/mokly-design-components.md` Delivery Status so the
      "separate Example Action and Toolbar" statement lists the full Example
      component set.
- [ ] Update the `examples/basic` paragraph in the root `README.md` to state
      that the example exercises Firna typography, fields, badges, list rows,
      and buttons through the renderer adapter.
- [ ] Add a short "Firna usage" note to `tests/fixtures/large/README.md`
      stating the large fixture mirrors the example's Firna subpaths.
- [ ] Record any gap found in `docs/protocol/mokly-link-controls.md` for
      `MockLink asChild` around a Firna `ListItem` (a Pressable row), and
      document the expected generated markup if the contract does not already
      cover non-button pressables.
- [ ] Validate changed Markdown with `npx prettier --check` and review the
      diff.

## Milestone 2: Example screens and registered components adopt Firna

Tags: mockup

The basic example is the repository's mockup catalogue, so this milestone is
the design change. Every screen and component keeps mobile and desktop
variants through the existing entry definitions.

- [ ] Replace raw headings and paragraphs in Welcome, Details, and Toolbar
      with `@firna/ui/typography` (`H1`, `H2`, `Body`, `Caption`) while
      keeping the existing visible copy and the `example-head` layout.
- [ ] Extend the Action component: add `size` (`sm`/`md`/`lg`) and `busy`
      props with controls, add a `Busy` saved variant, and keep the existing
      Default, Disabled, and Secondary variants and the `radius` CSS hook.
- [ ] Add `examples/basic/entries/components/status.tsx` registering
      `example-status` (route `components/status.html`) around Firna `Badge`
      with `label`, `tone` (`neutral`/`primary`/`warning`/`danger`), and
      `variant` (`outline`/`soft`/`solid`) controls and three saved variants.
- [ ] Add `examples/basic/entries/components/field.tsx` registering
      `example-field` (route `components/field.html`) around Firna `Input`
      with `label`, `placeholder`, `hint`, optional `error`, `required`, and
      `size` (`sm`/`md`/`lg`) controls and Default, Error, and Required saved
      variants, using no-op change handlers so the control renders enabled.
- [ ] Add `examples/basic/entries/components/related.tsx` registering
      `example-related` (route `components/related.html`) that renders Firna
      `ListItem` rows wrapped in `MockLink asChild`, with a `title` control and
      a slot for caller-supplied rows; one saved variant links to Welcome and
      the handbook.
- [ ] Use Status in place of the inline `Badge` in both screens, Field in
      place of the inline `Input` on Welcome, and Related on Details so both
      product screens record the new component instances.
- [ ] Register the new components in `catalogue.mockup.tsx`, add them to the
      `example-components` collection `childIds`, and add their shared
      `example-components.css` styles.
- [ ] Rebuild with `npm run build && npm run example:build`, run
      `npm run example:check`, and visually smoke-test Welcome, Details, and
      each new component page in light and dark through `npm run dev` on
      mobile and desktop.

## Milestone 3: Tests and mirrored fixtures

Keep the existing 100% pass rate and prove the new Firna surfaces through the
same tests that guard Action and Toolbar.

- [ ] Extend `tests/example_links.test.ts` so the Related rows are verified as
      styled portable link controls with the promised destinations in every
      viewport and scheme.
- [ ] Update `tests/component_design_attribution.test.ts` and any other test
      that enumerates the Example component ids (`example-action`,
      `example-toolbar`) to include `example-status`, `example-field`, and
      `example-related`.
- [ ] Add a browser test in `tests/browser/link_controls.spec.ts` (or the
      example spec) proving a `ListItem` wrapped in `MockLink asChild`
      navigates in Browse and stays styled, alongside the existing Button
      cases.
- [ ] Add a component workspace assertion that the new Status, Field, and
      Action `size`/`busy` controls render through the local rendering service
      without warnings.
- [ ] Mirror the typography, badge, and list usage in
      `tests/fixtures/large/screens.tsx` and `components.tsx` so the large
      fixture and `npm run fixture:large` cover the same subpaths.
- [ ] Run `npm test`, `npm run test:browser`, `npm run example:check`, and
      `npm run package:smoke`; fix every failure.

## Milestone 4: Verification, commit, push, and review

- [ ] Run `cargo xtask check`.
- [ ] Run `git add -A`, commit with a Conventional Commits message, and push
      the branch; confirm the new entry modules and any regenerated committed
      files are tracked.
- [ ] After the push, review the complete local diff against `origin/main`
      using `docs/implementation-review-prompt.md`. Report each finding with
      a number, severity, impact, lettered options, and a recommendation
      without changing the implementation.

## Post-merge follow-up (non-blocking)

- Decide whether to open a separate plan to upgrade `@firna/ui` from 0.14.0 to
  3.x and re-verify every adopted subpath against that API.
