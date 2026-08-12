# Rule-Aware Changes and Lazy Browse Comparisons

Replace Mokabook's standalone Review surface with two features that share one
Git comparison model without sharing one eager execution path:

1. a fast, CSS-rule-aware **Changed** filter in Browse; and
2. lazy Current / Side by side / Overlay / Difference modes on individual
   structured screens.

The source proposal for rule-level CSS impact is incorporated here, but its
primary consumer is Browse's Changed filter rather than a generated Review
artifact. The implementation must not copy reduced CSS into committed screen
output. Generated documents continue to link the consumer's complete
stylesheets, while a compact generated impact index makes route classification
cheap and an uncommitted cache retains complete base/head assets only after a
comparison is opened.

## Product Decisions

- Browse remains the only top-level product surface. Remove the Browse/Review
  mode switch, `/review`, and the public `mokabook review` command after the
  replacement comparison modes are complete.
- The normal screen view is **Current** and performs no base-fragment or
  comparison-asset work.
- Every current structured screen can enter Side by side, Overlay, or
  Difference mode, whether or not it appears in Changed.
- Added screens compare an empty base pane with the current screen. Removed
  screens remain reachable from Changed and compare their base pane with an
  empty current pane. Use cases inherit Changed visibility from their steps but
  link to the individual screen comparison instead of becoming aggregate
  comparison targets. Legacy pages remain Current-only in this change.
- Changed classification is ready when Browse starts. It may read the current
  and base manifests, compact impact indexes, changed paths, and changed local
  stylesheet bytes. It must not launch a browser, traverse comparison assets,
  copy snapshot trees, or read every fragment when compatible indexes exist.
- A comparison request prepares only the requested screen view. Complete
  linked stylesheets and transitive local assets are retained in a gitignored,
  content-addressed cache; CSS is never tree-shaken or rewritten per screen.
- Existing Review-ignore markers and authoring helpers remain supported. Their
  neutral materiality behavior now powers Changed and lazy comparisons; do not
  rename the marker syntax and rewrite every consumer fragment as part of this
  change.
- The repository's static preview may prebuild comparison bundles for material
  Changed screens. It must not restore the old all-screen eager artifact.
- Release Please owns the version, changelog, tag, and npm publication. The
  feature commit should cause the appropriate pre-1.0 minor release; do not
  publish manually.

## Configuration Contract

Move branch-impact vocabulary to `changes`:

```ts
changes: {
  base: "origin/main",
  sharedImpact: ["fonts/**"],
  cssImpact: "rules", // "global" (safe default) | "rules"
}
```

- `base` selects the ref whose merge base with `HEAD` is used by both Changed
  and comparison modes. `serve --base` remains the session override.
- `sharedImpact` retains repository-relative glob behavior for resources that
  really can affect the whole catalogue.
- `cssImpact: "rules"` analyzes every changed local stylesheet named by a
  `stylesheets` rule, including `lightStylesheets` and `darkStylesheets`.
  Configured CSS no longer needs to appear in `sharedImpact`.
- `cssImpact: "global"` is the fail-closed/default migration behavior: a
  changed configured sheet affects every view that links it, but link and
  color-scheme scoping still apply.
- Under `rules`, a configured stylesheet also matched by `sharedImpact` uses
  rule analysis, and config diagnostics identify the redundant glob.
- A changed CSS file that is not a configured stylesheet retains ordinary
  `sharedImpact` behavior.
- During one documented migration window, `review.base` and
  `review.sharedImpact` may be accepted as deprecated aliases when `changes`
  is absent. `review.outDir` has no replacement and must produce an actionable
  diagnostic. Supplying both config sections is invalid. Remove the alias at
  the next planned breaking boundary.

## Generated Impact Index

Build and Check own a deterministic internal impact-index directory committed
beside the manifest. It is not a new consumer authoring API. Store one record
per stable screen id, plus a schema marker that changes only when the format
does; do not create one catalogue-wide data file that makes unrelated screen
branches conflict. Records are loaded through bounded filesystem/Git batches.
For every viewport and color-scheme fragment a screen record contains:

- stable screen id, route, fragment route, viewport, and scheme;
- the ordered local/remote stylesheet list resolved by the same function that
  renders `<link>` elements;
- a raw document digest and a material digest that replaces valid ignored
  region bodies with stable sentinels while retaining region ids and material
  signals;
- class and id tokens with occurrence scope: outside an ignored range, only
  inside ignored ranges, or both.

The final rendered document is parsed once to produce this data. A CSS-only
edit does not change any impact record or generated screen HTML, and edits to
different screens touch different records. When the base commit predates the
index or has an incompatible schema, classification falls back conservatively
and reports why; it must never silently narrow impact.

## CSS Rule-Impact Contract

### Rule model and diff

- Parse base and head CSS into a flat ordered multiset of
  `(at-rule context, selector list, declaration block)` entries. Supported
  grouping contexts are `@media`, `@supports`, `@layer`, and `@container`.
- Normalize comments and insignificant whitespace. Rule identity is normalized
  at-rule context plus selector list; declaration equality determines a
  declaration change. Added, removed, and declaration-changed rules are
  affected. Selector edits become removed plus added rules.
- Detect relative-order changes when the rule multiset is otherwise equal and
  fall back globally for that sheet because cascade order may change pixels.
- Parse failure, unsupported nested/at-rule semantics, `@import`, or another
  construct whose effect cannot be bounded falls back globally for that sheet
  with a deterministic diagnostic. `@font-face` also makes the sheet global
  because font metrics can affect any text.

### Required selector tokens

- For each complex selector, collect class (`.foo`) and id (`#bar`) tokens
  outside functional pseudo-class arguments.
- Tokens inside `:not()`, `:is()`, `:where()`, and `:has()` are not required.
  Dropping them is the conservative baseline; expanding `:is()`/`:where()`
  into alternatives is optional only if it remains fail-closed.
- Elements, attributes, combinators, and non-functional pseudo-classes or
  pseudo-elements add no required tokens because ignoring them only widens a
  match.
- A selector with no required class/id token is broad. That rule affects all
  views linking the sheet and is named in diagnostics, but does not turn
  unrelated rules into a whole-sheet fallback.
- Matching uses bag-of-token containment against the union of base and head
  indexes. Removed rules therefore still match markup that existed only in the
  base document. Structure and per-element pairing are deliberately ignored,
  allowing false positives but not false negatives.

### Indirect dependencies

- For an added, removed, or changed custom-property definition, pull in every
  base/head rule whose declarations reference that property through `var()`.
  Chase property-to-property references to a cycle-safe fixpoint. A pure
  `:root --token` edit is matched through consuming selectors rather than
  treating `:root` itself as a broad visual rule.
- A changed or removed `@keyframes` body/name pulls in rules whose `animation`
  or `animation-name` declarations reference that name. Dynamic references the
  analyzer cannot resolve trigger a visible global fallback.
- At-rule prelude changes naturally remove and add the enclosed identities, so
  every rule in that context is affected.

### Link, scheme, and ignore scoping

- A sheet affects only base/head views whose recorded ordered stylesheet list
  includes it. A marketing sheet cannot affect app-only screens.
- Light- or dark-only sheets affect only matching scheme views.
- A selector materially matches when all required tokens occur in the view and
  they can all be satisfied outside ignored regions. If containment is possible
  only by using ignored-only tokens, retain ignored-only evidence but do not
  add the route to the material Changed filter. The canonical owner with the
  same tokens outside its ignored range remains material.
- Broad selectors and sheet-global fallbacks are material for all linking
  views; ignore ranges cannot prove those effects harmless.
- Inline `<style>` content remains part of fragment bytes and material-digest
  comparison rather than configured-stylesheet analysis.

### Evidence

- Route impact records distinguish metadata/fragment changes, declared
  dependencies, shared resources, CSS selector matches, broad rules, and
  conservative fallbacks.
- CSS evidence includes the stylesheet and a bounded selector sample (up to
  five plus a remaining count).
- A Changes details/diagnostics surface reports each analyzed sheet's mode,
  linking and impacted route/view counts, unaffected count, and the exact
  fallback reason or broad selector. Technical selector detail stays secondary
  to user-facing outcome copy.

## Lazy Comparison Contract

- The Change index and comparison service share one resolved `baseCommit`; a
  comparison must never combine classification from one merge base with
  fragments from another.
- Comparison URLs are durable and directly loadable. Current screen routes use
  their existing `/view/<route>` identity plus comparison state; removed
  screens use a dedicated id-based route derived from the base manifest.
- On the first request for one `(screen, viewport, scheme, head generation)`,
  prepare immutable `before` and `after` snapshot trees for that view. Reuse
  the existing safe Git/filesystem readers and transitive HTML/CSS resource
  discovery, but copy only that view's dependency closure.
- Cache promises to coalesce concurrent requests and store identical blobs
  once across screens. Keys include the base commit and head content/version
  fingerprint. A watched update invalidates future lookups without breaking
  in-flight documents; old immutable bundles expire after a bounded idle
  window.
- Snapshot directories require package ownership markers, are excluded from
  changed-path collection independently of consumer ignores, and are drained
  safely on shutdown.
- Current remains usable when comparison preparation fails. The requested mode
  shows a retryable, screen-local error instead of replacing the catalogue with
  a full-page failure.
- Side by side shows base and head panes; Overlay uses aligned opacity layers;
  Difference uses the existing blend/tint treatment. Added/removed views show
  an explicit missing side. Viewport and scheme controls address the matching
  base/head view union.

## Performance Contract

- With compatible indexes, initial Changed computation performs no per-screen
  fragment reads and no comparison asset reads/copies.
- CSS analysis parses only configured local sheets that differ between base
  and head, then performs set containment against compact in-memory indexes.
- Cache rule-analysis results by base commit, stylesheet content hashes, and
  impact-index hashes. A CSS watch update recomputes only invalidated sheets
  before publishing the browser update; it does not rebuild fragments or
  restart solely to refresh Changed metadata.
- Add an instrumented test proving bounded batched index reads and zero
  fragment/asset reads on startup, plus a synthetic 850-view, 6,650-line-sheet
  benchmark with a generous three-second CI ceiling. Record the benchmark
  result in the plan during implementation.
- Add a counter/seam proving no comparison preparation occurs until a
  comparison mode is requested and repeated requests reuse the cached bundle.

## Milestone 1 — Protocol and migration contract

Specify the replacement completely while current behavior still works.

- [ ] Update `docs/protocol/mokabook-runtime.md` around the Change index,
      Changed classifications/evidence, CSS fail-closed matrix, lazy comparison
      lifecycle, removed screens, watch refresh, and static-preview boundary.
- [ ] Update `docs/protocol/mokabook-package.md` with `changes`, the deprecation
      window, defaults, validation, CLI removal, and retained ignore helpers.
- [ ] Update `docs/protocol/mokabook-shell-design.md` to replace the top-level
      Review mode with screen-local comparison controls and Changes details.
- [ ] Update the protocol index and README configuration/user-interface text.
- [ ] Resolve any contract gaps found while writing the specs before code or
      mockup work begins.

## Milestone 2 — Browse comparison mockups

Tags: mockup

Update the example design catalogue before changing product UI.

- [ ] Remove the Browse/Review top-level mode switch from mobile and desktop
      shell mockups and rebalance search/scheme controls.
- [ ] Add screen-local Current, Side by side, Overlay, and Difference states in
      the Browse hierarchy, each as reusable mobile and desktop screen
      components.
- [ ] Add separate lifecycle/evidence states for added, removed, unchanged,
      loading, retryable failure, CSS selector evidence, and CSS fallback
      diagnostics; split pages so no screen-spec page exceeds five screens.
- [ ] Make removed screens reachable from the mockup's Changed flow and link
      every flow step back to its owning standalone screen mockup.
- [ ] Rebuild and validate the generated example HTML, run its mockup checks,
      and visually smoke-test every changed page directly.

## Milestone 3 — Deterministic impact index

Add classification metadata without changing Browse behavior.

- [ ] Extract one shared route/scheme stylesheet resolver used by rendering,
      index generation, validation, and later analysis.
- [ ] Refactor ignore parsing to expose validated material/ignored segments
      without changing marker bytes or public helpers.
- [ ] Build raw/material digests and scoped class/id token indexes from final
      generated documents; cover duplicate tokens, encoded attributes,
      malformed markers, material signals, and light/dark views.
- [ ] Write the versioned per-screen records and stable schema marker
      transactionally, validate them in Check, remove owned orphans, and cover
      stale/missing/schema-mismatch cases.
- [ ] Prove a CSS-only mutation leaves all fragment and impact-index bytes
      unchanged, and unrelated screen edits change disjoint record files.

## Milestone 4 — CSS rule analyzer

Implement the pure fail-closed analysis engine behind unit-test boundaries.

- [ ] Implement the tokenizer/parser, supported at-rule flattening,
      normalization, duplicate-aware rule identity, declaration comparison,
      and reorder detection in short focused modules.
- [ ] Implement required-token extraction with functional-pseudo handling,
      escaped identifiers, selector lists, and broad-selector reporting.
- [ ] Implement declaration-level custom-property propagation, cycle-safe
      var-of-var chasing, keyframe-user propagation, and global fallback
      constructs.
- [ ] Produce deterministic per-view matches, bounded selector evidence, and
      per-sheet summaries from base/head indexes.
- [ ] Unit-test every row of the fallback matrix and fuzz/property-test scanner
      termination across malformed comments, strings, escapes, brackets,
      parentheses, and braces.

## Milestone 5 — Fast Changed classification

Replace the current route-only list with a typed union change model while
leaving standalone Review available until comparisons replace it.

- [ ] Add public/resolved `changes` config types, `global`/`rules` validation,
      default behavior, the temporary `review` alias, redundant-glob
      diagnostics, and focused config tests.
- [ ] Pair current/base structured entries and views, compare metadata and
      raw/material digests, retain added/removed entries, and classify
      material, ignored-only, dependency, and shared-resource evidence.
- [ ] Integrate configured stylesheet detection, link/scheme-scoped rule
      analysis, global mode/fallbacks, redundant-glob diagnostics, and evidence.
- [ ] Propagate material screen changes to use cases without treating a shared
      registry module as a dependency for every sibling route.
- [ ] Render Changed from the typed model, including base-only removed rows and
      an accessible diagnostics disclosure; keep All focused on current routes.
- [ ] Move refreshable Change-index ownership into the server lifecycle and add
      watched CSS refresh/invalidation before live-update publication.
- [ ] Add I/O-boundary, cache, determinism, and target-scale performance tests.

## Milestone 6 — Lazy comparison backend

Build screen-local comparison delivery without changing the Browse design yet.

- [ ] Extract reusable Git merge-base, base-manifest, snapshot-reader, ignore,
      and asset-retention code from `src/review` into neutral `src/changes` and
      `src/comparison` ownership.
- [ ] Implement the immutable content-addressed comparison cache, ownership
      checks, in-flight request coalescing, bounded retention, invalidation,
      and shutdown draining.
- [ ] Add server routes for comparison metadata and retained base/head assets,
      confined to a current or base structured screen view.
- [ ] Cover unchanged, changed, CSS-only, added, removed, dark-only, missing
      base, unsafe asset, concurrent request, watched invalidation, generation
      failure, and shutdown cases.
- [ ] Prove ordinary home/current/view requests never invoke the comparison
      provider.

## Milestone 7 — Comparison modes in Browse

Tags: ui

Ship the mockup-approved comparison controls on top of the completed backend.

- [ ] Remove the top-level Review control and launcher from the shell UI.
- [ ] Add Current / Side by side / Overlay / Difference controls to structured
      screen views, preserving viewport, scheme, details, drawer, search,
      filter, history, and live-reload state.
- [ ] Render lazy loading, missing-side, unchanged, CSS-impact evidence, and
      retryable error states with accessible status announcements.
- [ ] Add base-only removed-screen pages reachable from Changed and keep direct
      comparison URLs, Back/Forward, JavaScript-disabled Current views, and
      progressive navigation coherent.
- [ ] Add unit and Playwright coverage for desktop/mobile layouts, all modes,
      added/removed screens, keyboard use, reduced motion, reload recovery, and
      proof that selecting Current performs no comparison request.

## Milestone 8 — Retire standalone Review

Remove the old implementation only after Browse comparisons cover its retained
product value.

- [ ] Remove the public `review` command, `--out`, help text, CLI dispatch, and
      package tests; keep `--base` for Serve.
- [ ] Remove `/review`, eager artifact rendering/writing, Review generation
      archives, `review.json`, Review-only shell/artifact CSS, and superseded
      tests after migrating reusable safety coverage.
- [ ] Remove deprecated `review` config aliases and runtime dependence on
      `review.outDir`; update every remaining fixture and example to `changes`.
- [ ] Adapt the repository static preview to omit `/review` and prebuild lazy
      bundles only for material Changed screens, with Current-only behavior and
      clear availability metadata elsewhere.
- [ ] Audit watch ignores, package files, exported declarations, docs, and
      generated example routes so no dead Review surface remains and no
      authorized current-screen behavior is lost.

## Milestone 9 — Mutation suite, release readiness, and handoff

Prove safety, performance, compatibility, and the motivating catalogue case.

- [ ] Build a two-sheet, five-screen fixture with light/dark views, ignored
      chrome and an owner, custom properties, animations, added/removed routes,
      and a use case.
- [ ] Assert: unused additive class (zero impact); one-screen class; three-of-
      five declaration edit; removed rule against base; `:root` variable
      consumers; broad `body`; keyframes; `:not(.x)`; sheet link scoping;
      dark-only scoping; parse failure; reorder fallback; ignored chrome owner;
      and global/default compatibility.
- [ ] Assert comparison snapshots preserve complete CSS and transitive assets,
      while Changed startup reads/copies none of them.
- [ ] Run formatting, lint, typecheck, all unit/integration/browser tests,
      package/consumer checks, example Build/Check, preview smoke tests, and a
      manual Serve smoke test covering CSS watch refresh plus lazy comparison.
- [ ] Run `cargo xtask check` with a 100% pass rate and record the performance
      measurements and any environment-specific limitations.
- [ ] Inspect `git diff --name-status origin/main`, all deletions, generated
      output, README/protocol consistency, and package contents.
- [ ] Run `git add -A`, commit all tracked work with an appropriate
      Conventional Commit, and push the current branch.
- [ ] Run `cargo xtask review` after the push. Do not auto-fix its findings;
      report every numbered finding with severity, context, impact, lettered
      options, and the recommended scope.

## Acceptance Criteria

- Adding namespaced CSS plus new screens does not put existing screens in
  Changed when no affected selector can match them.
- A shared selector edit affects exactly the linking views whose base/head token
  indexes satisfy it, subject only to documented conservative widening.
- Custom-property, keyframe, broad-rule, parse, import, font, and reorder cases
  all fail closed and explain their widening.
- Ignored shared chrome is material on its owner and not on consumer screens
  whose only matches are ignored-only.
- Browse starts and renders Changed without preparing any comparison bundle;
  the target-scale CSS analysis remains within the recorded budget.
- Current remains the default for every screen. Opening one comparison prepares
  only that screen view and reuses complete, immutable base/head assets.
- Added and removed screens are inspectable, and Side by side, Overlay, and
  Difference work across viewport and scheme variants.
- No top-level Review UI, `/review` route, public Review CLI command, or eager
  all-catalogue Review artifact remains.
- CSS remains external and complete in committed generated documents; the
  optimization never changes what a browser is capable of rendering.

## Out of Scope

- Exhaustive browser-state exploration for hover, focus, animation time,
  scrolling, dynamic DOM, or arbitrary viewport values.
- Browser screenshot or computed-style execution during Changed
  classification.
- CSS tree-shaking, per-screen stylesheet generation, or committed comparison
  artifacts.
- Aggregate visual comparison of use-case flows or legacy pages.
- Renaming existing Review-ignore marker bytes/public helpers solely to remove
  the word "Review".
