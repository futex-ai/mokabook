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

- The details panel's own summary bar is the disclosure control; the shell
  does not render the separate top-right "Details" button shown in the
  selected-screen mockups.
- Navigation groups render in deterministic catalogue order (sorted by
  route), so the `Design` group precedes `Example` in this example.
- The Browse changed/all filter appears only when the serve base ref resolves
  in Git; the mockups always show it.
- Static Review artifact pages omit the Browse/Review mode pills because the
  artifact stands alone without a running Browse server; the served `/review`
  route keeps the full shell.
