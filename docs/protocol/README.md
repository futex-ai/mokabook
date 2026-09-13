# Protocol

These documents define Mokabook's implementation contract. They describe
implemented pre-release behavior unless a document's Delivery Status explicitly
labels an approved target that is still tracked by an active plan. Package,
authoring, static build/check, responsive Browse, watched development, on-demand comparisons,
packed consumer verification, CI, and npm release automation are implemented.
The first public release and downstream Accounting cutover remain external
delivery steps.

## Supported Formats

| Catalogue                     | Generated manifest | Comparison result |
| ----------------------------- | ------------------ | ----------------- |
| Without registered components | 5                  | 2                 |
| With registered components    | 5                  | 3                 |

All current catalogues emit manifest v5 with explicit pages, the complete
source inventory and declared dependencies. Component catalogues also include
saved variants and complete per-view usage. Comparisons use v3 whenever either
side contains registered components, including when the last component is removed;
otherwise they use v2. Pages participate in Browse Changes without visual comparisons.

The current primary file requires v5. Git baseline readers accept v3 and both
historical v4 formats: pages with `sourceFiles`, or components with `legacyPages`.
These envelopes are disjoint; combining them is invalid. Explicit
`compatibility.readManifestV2` permits the old Accounting-format fallback only
when the historical primary file is absent, never when it is invalid.

## Contracts

- [Package and authoring contract](./mokabook-package.md)
- [Build and Browse runtime](./mokabook-runtime.md)
- [On-demand Serve](./mokabook-on-demand.md)
- [Selected live comparisons](./mokabook-selected-comparisons.md)
- [Live catalogue evidence updates](./mokabook-live-evidence.md)
- [Startup diagnostics and scale fixtures](./mokabook-timings.md)
- [Pages in the catalogue](./mokabook-pages.md)
- [Source protection](./mokabook-source-protection.md)
- [Catalogue change metadata](./mokabook-catalogue-changes.md)
- [Breaking page migration](./mokabook-page-migration.md)
- [Optional changes in publication](./mokabook-publication.md)
- [Changes and screen comparisons](./mokabook-changes.md)
- [Derived baselines](./mokabook-derived-baselines.md) — approved target:
  uncommitted generated output with per-commit rebuilt baselines.
- [Registered components](./mokabook-components.md)
- [Component runtime prop schema](./mokabook-component-props.md)
- [Current manifest v5 schema](./mokabook-component-manifest.md)
- [Component comparison v3 schema](./mokabook-component-review.md)
- [Component change attribution](./mokabook-component-changes.md)
- [Component pages and screen inspection](./mokabook-component-explorer.md)
- [Component explorer design catalogue](./mokabook-component-design.md)
- [Component icon inspector design](./mokabook-component-inspector-design.md)
- [Component controls design catalogue](./mokabook-component-controls-design.md)
- [Component workspace design](./mokabook-component-workspace-design.md) (view controls, resizing, and comparison eligibility)
- [Component controls](./mokabook-component-controls.md)
- [Consumer static export](./mokabook-export.md) — consumer CLI and
  transactional artifact-generation contract.
- [Static export delivery](./mokabook-export-delivery.md) — portable
  hosting, navigation, and comparison behavior.
- [Export recovery](./mokabook-export-recovery.md) — backup ownership,
  concurrent destination changes, bounded cleanup, and failure reporting.
- [Watched development](./mokabook-watch.md)
- [Catalogue navigation contract](./mokabook-navigation.md)
- [Styled catalogue link controls](./mokabook-link-controls.md)
- [Shell design contract](./mokabook-shell-design.md)
- [Design mockup links](./mokabook-design-links.md)
- [Registered components in Mokabook's design catalogue](./mokabook-design-components.md)
  — implemented shared design components and ownership rules, with the
  [component library inventory](./mokabook-design-component-library.md).
- [CI and npm release contract](./npm-release.md)
- [Dependency security](./dependency-security.md) — advisory gates, targeted
  updates, temporary overrides, and packed-consumer audit coverage.
