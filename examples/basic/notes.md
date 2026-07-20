# Basic Example Notes

These screens are synthetic fixtures for exercising Mokabook. They are not
application product designs.

## Design Catalogue Notes

The `Design` navigation group holds the approved mockups for Mokabook's own
Browse and Review shell. Implementation notes for those mockups live here and
in each entry's description and rationale, never inside the rendered screens:

- The depicted catalogue content is this example's own Welcome, Details, and
  Example tour entries, so no product data appears in any shell design.
- The `Farewell` screen shown in Review mockups is sample comparison data that
  deliberately has no standalone entry: it depicts a screen that was removed
  on a branch.
- Links inside the design screens are drawn as styled text because the mockups
  are static pictures of the shell; real navigation behavior is specified in
  the runtime protocol.
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
- Static Review artifact pages omit the Browse/Review mode pills because the
  artifact stands alone without a running Browse server; the served `/review`
  route keeps the full shell. The artifact keeps its own `mb-*` page
  structure: it inherits the ported palette and typography through the shared
  stylesheet tokens, while adopting the mockups' full browser-frame compare
  chrome is deferred to a follow-up milestone.
