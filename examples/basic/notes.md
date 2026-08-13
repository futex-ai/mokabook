# Basic Example Notes

These screens are synthetic fixtures for exercising Mokabook. They are not
application product designs.

## Design Catalogue Notes

The `Design` navigation group holds the approved mockups for Mokabook's own
Browse shell, including its per-screen compare modes. Implementation notes for
those mockups live here and in each entry's description and rationale, never
inside the rendered screens:

- The depicted catalogue content is this example's own Welcome, Details, and
  Example tour entries, so no product data appears in any shell design.
- Links inside the design screens are drawn as styled text because the mockups
  are static pictures of the shell; real navigation behavior is specified in
  the runtime protocol.
- The dark-scheme, light-only, and dark scheme compare screens are light
  documents that draw a shell with dark selected, so they opt out of dark
  generation like every other design screen. Only the depicted device screens
  change; the shell chrome around them stays light in both schemes.
- The `Light | Dark` control sits in the top bar on the wide artboards and in
  the screen head band on the narrow ones: a 390px top bar has no room for
  another control.
- The screen head keeps its compare and viewport segments when the scheme
  segment joins them on a narrow artboard, stacking in compare, viewport,
  scheme order rather than trading one control for another.
- The approved tokens, consumer-tunable accent properties, and responsive
  breakpoints are recorded in `docs/protocol/mokabook-shell-design.md`.

## Intentional Implementation Differences

The shipped shell was visually smoke-tested against these mockups. The
following presentation differences are intentional:

- The details inspector's collapsed bar shows one fixed hint
  ("Description, rationale, source, related docs, and use cases") rather than
  the state-specific hint copy some mockups draw.
- Navigation groups render in deterministic alphabetical order, so the
  `Design` group precedes `Example` when this example is served.
- The Browse changed/all filter appears only when the serve base ref resolves
  in Git; the mockups always show it with a sample count.
- The mockups draw a small-phone artboard variant so a full 390×844 phone fits
  the depicted narrow shells; the served shell always uses the full-size
  phone frame and scales it below the responsive breakpoint.
- The compare segment follows the same availability rule as the changed/all
  filter: it appears only when the serve base ref resolves in Git, while the
  mockups always draw it.
- The compare mockups draw base documents as example content and illustrate
  the difference blend with drawn rows; the served shell loads the real
  branch-point documents on demand and composes the difference as a real
  blend of the two live documents.
