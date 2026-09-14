# CSS Change Attribution

## Status And Outcome

Milestones 1 and 2 (protocol and mockups) are complete and awaiting user
approval before implementation milestones begin.

A single edit to a shared stylesheet currently marks every screen that links
that stylesheet as a dependency change, and a broad `review.sharedImpact` glob
marks every entry in the catalogue. The accounting consumer showed 1,382
Changes for a branch whose real diff was 98 files and three moved guide routes.
The Mokly side of that count came from two sources: a blanket
`docs/mockups/*.css` shared-impact glob in the consumer configuration, and
file-level attribution of the guide additions in `docs/mockups/home.css` to
every screen that loads it.

This plan makes CSS dependency evidence rule-aware. A changed stylesheet stays
conservative evidence for a screen only when at least one changed rule could
apply to that screen's document. When no changed rule can match, the screen is
reported as unaffected by that stylesheet. Selector matchability is a sound
exclusion, not a visual proof: the analysis never claims a screen is unchanged
when a rule matches, and it treats every construct it cannot resolve as a
potential match. Browser-verified refinement is deferred to a later plan.

Language stays TypeScript. Rust is not adopted; the review pipeline has no
measured hot spot, and CSS parsing is delegated to `lightningcss`, whose core is
already native. Milestone 3 records timings so that decision rests on evidence.

Related contracts:

- [Changes and screen comparisons](../docs/protocol/mokly-changes.md)
- [Component change attribution](../docs/protocol/mokly-component-changes.md)
- [Component comparison v3 schema](../docs/protocol/mokly-component-review.md)
- [Startup diagnostics and scale fixtures](../docs/protocol/mokly-timings.md)

## Scope

In scope:

- Rule-level diffing of before/after CSS reachable from a screen's document.
- Selector matchability of changed rules against the before and after
  documents of each view.
- Conservative handling of unresolvable constructs.
- New evidence shape that distinguishes matched-rule impact from plain
  dependency impact, and a Changes membership rule that uses it.
- Timing spans and a scale fixture variant with shared stylesheets.
- Protocol, README, and example documentation updates.

Out of scope, tracked as follow-up plans:

- Browser-backed matched-rule and computed-style refinement.
- Import-graph ownership inference for CSS Modules or CSS-in-JS.
- Mapping bundled stylesheet output back to source modules.
- Pixel or screenshot comparison.
- Any change to the accounting consumer; it only needs the glob removed.

## Design Summary

Attribution for a changed CSS resource on one view proceeds in three stages.

1. Parse both sides with `lightningcss` and produce an ordered list of rules,
   each carrying its selector list, declarations, and enclosing conditions
   (`@media`, `@container`, `@supports`, `@layer`, nesting parents). Diff the
   two lists into changed, added, and removed rules, ignoring whitespace and
   comments. A stylesheet whose only differences are formatting produces no
   changed rules.
2. For each changed rule, test its selectors against the view's before
   document and after document using `css-select` over the existing parse5
   tree. A match on either side keeps the rule.
3. Reduce. If any kept rule exists, the resource remains dependency evidence
   and the view records the rule selectors that matched. If no rule matched,
   the resource is recorded as examined-and-excluded and does not contribute
   to Changes membership for that view.

Every uncertain case resolves to "keep":

- A selector `css-select` cannot parse.
- `:host`, `::part`, `::slotted`, and other shadow-scoped selectors.
- Universal, `:root`, `html`, and `body` selectors.
- Custom property declarations (`--*`) changed anywhere, because inheritance
  can reach any descendant.
- `@font-face`, `@keyframes`, `@property`, `@counter-style`, and other rules
  without selectors.
- Changed `@import` or `url()` references (already handled by the resource
  graph; the new analysis must not weaken that path).
- A parse failure on either side of the stylesheet.

Conditions such as `@media` and `@container` are not evaluated; a rule inside a
condition is treated exactly like a rule outside it. Evaluating conditions
needs a viewport and element sizes, which belongs to the deferred browser
refinement.

The analysis runs only on CSS resources that are already in `changedPaths`
and already reachable through the resource graph. It never widens the set of
examined files, so unreferenced public files continue to add nothing.

## Evidence schema

A dependency reason gains an optional `analysis` record:

```ts
{
  kind: "dependency";
  path: string;
  analysis?: {
    status: "matched" | "unresolved";
    selectors: readonly string[]; // matched or kept selectors, sorted
  };
}
```

Excluded resources are recorded on the view, not as reasons:

```ts
excludedResources: readonly { path: string; reason: "no-matching-rule" }[];
```

## Baseline timings

Measured on 2026-09-14 in the Amazon Linux 2023 x86_64 cloud sandbox
(8 CPUs, approximately 16 GiB RAM, Node v24.14.1), with other heavy checks idle.
These are single diagnostic runs before rule-aware attribution, not performance
thresholds or statistical estimates.

`npm run fixture:large` prepared the full default fixture in 80,329 ms:
30 areas, 40 screens per area (1,200 screens), 60 registered components with
three saved variants each, 12 records per screen, 1,410 routed entries and
5,550 documents. Four shared stylesheets are each linked by the first 20
screens per area: 600 screens, or 50%, in all viewport/scheme documents.
The existing catalogue stylesheet and its imported tokens sheet are additional
(two more CSS files). Setup commits the unedited stylesheets, then adds an
unrelated rule only to `assets/shared-1.css`.

`npm run benchmark:large` completed at full size. Cold/warm usable startup was
4,139 / 4,100 ms, both below five seconds. Complete Changes reached Browse at
147,173 / 146,663 ms, with 660 changed routes in both runs: 600 linked screens
and 60 flows. No smaller benchmark fallback was needed. Cold means a fresh
application process, without flushing OS caches.

Serve classification does not write artifacts. A supplementary full-size
`node --max-old-space-size=12288 dist/cli/bin.js export --config <full-config> --base main --out .context/site --debug-timings`
failed with JavaScript heap exhaustion after approximately 481 seconds, before
the artifact-write span began. Review comparison had completed; complete-site
assembly/validation remains outside those review spans. No export optimization
is part of this milestone.

The separately labelled small Export used
`npm run fixture:large -- --areas 2 --screens 10 --rows 6`, then
`node dist/cli/bin.js export --config <small-config> --base main --out .context/site --debug-timings`.
It has 20 screens, four components with three variants each, six records per
screen, 28 routed entries and 130 documents; each of four shared stylesheets
is linked by ten screens (50%). It uses the default Node heap allowance.
This is a control measurement for the artifact-write stage, not a claim of the
largest export that fits or an estimate for the full-size export.

Durations below are milliseconds. For repeated stage names, each cell is the
union of `[end.elapsedMs - end.durationMs, end.elapsedMs]` intervals within one
session, so overlapping viewport traversals count once. Parent rows include children; do not sum rows
or compare elapsed clocks across sessions. Each full Serve run has three
comparison-loop spans and 22,110 resource traversals. Small Export has three
changed-path spans, two manifest reads, three comparison loops, and 516 resource
traversals (including the two snapshot-copy closures). A dash means that stage
did not run in that command.

| Span                     | Full Serve cold (ms) | Full Serve warm (ms) | Small Export (ms) |
| ------------------------ | -------------------: | -------------------: | ----------------: |
| `review.base-commit`     |                10.13 |                 9.56 |              7.41 |
| `review.changed-paths`   |             1,293.63 |             1,344.31 |             79.90 |
| `review.base-manifest`   |               971.23 |               983.36 |            102.94 |
| `review.base-documents`  |             1,760.44 |             1,920.90 |             39.19 |
| `review.compare-screens` |            43,411.58 |            43,579.36 |            808.19 |
| `review.resource-graph`  |            23,825.88 |            23,860.31 |            934.41 |
| `review.write-artifact`  |                    — |                    — |             97.99 |
| `changes.classify`       |            47,975.63 |            48,354.97 |                 — |
| `export`                 |                    — |                    — |          6,895.22 |

## Milestone 1: Define the rule-aware attribution contract

Documentation-only milestone. The protocol must be complete and approved by
the user before mockups or code land.

Completed. Added `docs/protocol/mokly-css-attribution.md` and updated the
changes, component-changes, component-review, and index docs.

- [x] Add `docs/protocol/mokly-css-attribution.md` covering: the three
      stages in the Design Summary, the exact keep-list of unresolvable constructs, the rule
      that conditions are not evaluated, the invariant that the analysis only
      narrows existing dependency evidence and never adds files, and the
      statement that a matched rule is potential impact rather than visual
      proof.
- [x] Define the evidence schema extension described under "Evidence schema"
      above, in both the v2 `ReviewResult` and v3 `ReviewResultV3` contracts.
      Absent fields mean the analysis did not run, so historical results
      without them remain valid.
- [x] Update `docs/protocol/mokly-changes.md` and
      `docs/protocol/mokly-component-changes.md` so the dependency and
      shared-impact paragraphs reference the new contract and state that a
      CSS dependency edit keeps a view in Changes only when analysis matched
      or was unresolved.
- [x] Update `docs/protocol/mokly-component-review.md` with the schema
      change and the validation rule that `analysis.selectors` is sorted and
      duplicate-free, and that an `excludedResources` path must be in
      `changedPaths`.
- [x] Add the new document to `docs/protocol/README.md`.
- [x] Validate Markdown with `npm run format:check` and check every relative
      link resolves.

## Milestone 2: Surface the evidence in the shell

Tags: mockup

Completed. Delivered as the `design/review/impact/stylesheets/` sub-page with
`design-review-style-matched`, `design-review-style-unresolved`, and
`design-review-style-excluded`, each with mobile and desktop variants. The
impact group was split into a child collection to respect the five-screen
limit. The contract's Shell Presentation section now names the owning screens.

Design the inspector evidence before any implementation so the user can
approve the visible outcome. Show examined-and-excluded resources and matched selectors in the inspector so
a reviewer can see why a screen stayed out of Changes.

- [x] Read `docs/protocol/mokly-shell-design.md` and the existing evidence
      designs under `examples/basic/entries/design/`.
- [x] Add mobile and desktop screens to the design catalogue showing a screen
      with a dependency reason carrying matched selectors, and a screen with
      an excluded resource. Keep the owning page within the five-screen limit
      and reuse the existing inspector components.
- [x] Copy must read as product language: "This stylesheet changed but none
      of the changed styles apply to this screen", not selector or parser
      terms in the headline. Selectors may appear in the details list.
- [x] Build and check the example, run the design tests, and open each changed
      page from disk in both variants.
- [x] Delegate this milestone to an Opus 5 agent at maximum reasoning effort;
      the main session reviews the result against the protocol before
      continuing.

## Milestone 3: Measure the current review pipeline

Establish where review time goes before changing attribution, so the
language decision and later performance claims rest on data.

Completed. Spans, fixture options, tests, and the recorded baseline above
were delivered by a Codex session and verified by the coordinator.

- [x] Add `review.*` timing spans under the existing `--debug-timings`
      contract for base-commit resolution, changed-path discovery, base
      manifest read, base document batch read, per-screen comparison loop,
      resource graph traversal, and artifact write. Follow the span rules in
      `docs/protocol/mokly-timings.md`.
- [x] Extend the large fixture generator under `tests/fixtures/large` with a
      configurable number of shared stylesheets linked by a configurable share
      of screens, and record a baseline in which one shared stylesheet gains
      an unrelated rule.
- [x] Run `benchmark:large` against that fixture and record per-span timings
      in this plan under a "Baseline timings" heading, with fixture sizes.
- [x] Add tests for the new spans in the existing timings test file, and
      update `docs/protocol/mokly-timings.md` with the new stage names.
- [x] Run `npm run test`, `npm run typecheck`, `npm run lint`, and
      `npm run format:check`.

## Milestone 4: Rule diffing

Add the CSS parsing and diff layer with no change to classification yet.

Completed. `src/review/css/` (types, rules, diff, source, serialization) and
its tests were delivered by a Codex session and verified by the coordinator.
Lightning CSS ships native binaries without a WASM fallback, so CI gained a
cross-platform parse check.

- [x] Add `lightningcss` with `npm install` (no pinned version) and confirm the
      package installs on the CI platform matrix used by
      `docs/protocol/npm-release.md`.
- [x] Create `src/review/css/` with `rules.ts` (parse a stylesheet into the
      ordered rule list with enclosing conditions), `diff.ts` (changed, added,
      removed rules), and `types.ts`. Keep each file under 300 lines.
- [x] Put the parser behind a small interface so tests can inject fixtures
      without a real parse, consistent with the existing reader interfaces in
      `src/review`.
- [x] Tests under `tests/review_css_rules.test.ts` and
      `tests/review_css_diff.test.ts`: whitespace-only edits yield no rules;
      comment-only edits yield no rules; added rule; removed rule; changed
      declaration; rule moved without change yields no rules; nested rules;
      `@media`, `@container`, `@supports`, and `@layer` preserved as
      conditions; parse failure surfaces as an unresolved result rather than a
      thrown error.
- [x] Run tests, typecheck, lint, format check.

## Milestone 5: Selector matchability

Add the document matching layer, still without changing classification.

- [ ] Add `css-select` with `npm install`. It operates on the parse5 tree via
      `domhandler` adapters; confirm the adapter works with the tree shape
      produced by the existing `parse5` usage in `src/html_references.ts`, or
      add a thin adapter in `src/review/css/document.ts`.
- [ ] Create `src/review/css/match.ts`: given changed rules and a document,
      return the kept rules with the reason (`matched` or `unresolved`).
      Implement the keep-list from Milestone 1 exactly.
- [ ] Tests under `tests/review_css_match.test.ts`: unused class selector
      excluded; matching class kept; matching only in the after document kept;
      universal selector kept; `:root` kept; custom property change kept;
      `@font-face` kept; unparseable selector kept; shadow-scoped selector
      kept; rule inside `@media` treated identically to one outside.
- [ ] Run tests, typecheck, lint, format check.

## Milestone 6: Integrate with classification

Wire the analysis into both classification paths so Changes membership uses it.

- [ ] In `src/review/component_view.ts`, before pushing a dependency reason
      for a CSS resource, run the analysis against the view's before and after
      documents and either attach `analysis` or record the resource under
      `excludedResources`. Non-CSS resources are unchanged.
- [ ] Apply the same rule in the v2 path in `src/review/screen_compare.ts` so
      catalogues without registered components get identical behaviour.
- [ ] Apply the same rule in the live Serve membership calculation in
      `src/server/changed.ts` so the Changes count, background classification,
      and complete comparison agree.
- [ ] Ensure the analysis reads base CSS through the existing batched Git
      reader and never falls back to individual reads for the CSS pass.
- [ ] Update `src/review/result_records.ts` and `result_validation.ts` for
      the new fields; reject unsorted or duplicate selectors and excluded
      paths absent from `changedPaths`.
- [ ] Re-examine `tests/server_changed_assets.test.ts`. The case that appends
      a newline to a CSS file currently asserts the consumers are in Changes.
      Under this plan a newline-only edit yields no changed rules and the
      consumers are excluded. Rewrite that case to append a rule whose
      selector matches, and add a sibling case for a newline-only edit that
      asserts exclusion.
- [ ] Add end-to-end tests under `tests/changes_css_attribution.test.ts` using
      an isolated Git fixture: a guide-only rule added to a shared stylesheet
      leaves an unrelated auth screen out of Changes and in
      `excludedResources`; a rule matching the auth screen keeps it in; a
      custom property edit keeps every consumer in with `unresolved`; a font
      or image edit still keeps consumers through the existing resource path;
      a broad `sharedImpact` glob continues to add nothing on its own.
- [ ] Run the existing review, component, publication, and export test suites
      and the browser suite; both viewports and colour schemes must produce
      the same exclusions.
- [ ] Run tests, typecheck, lint, format check, and `cargo xtask check`.

## Milestone 7: Implement the shell evidence

Tags: ui

- [ ] Extend `src/client/workspace_evidence.ts` and the inspector rendering to
      show matched selectors under a dependency reason and to list excluded
      resources in a secondary details section.
- [ ] Add client tests and a browser spec under `tests/browser` asserting the
      copy and that excluded resources never appear as Changes rows.
- [ ] Run tests, typecheck, lint, format check, browser tests, and
      `cargo xtask check`.

## Milestone 8: Documentation, examples, and timings

- [ ] Update `README.md`, `examples/basic/README.md`, and
      `docs/protocol/mokly-package.md` so guidance on `review.sharedImpact`
      describes it as a fallback for files the resource graph cannot see, and
      states that linked stylesheets are attributed by rule.
- [ ] Update `src/review/README.md` (create it if absent) with the CSS module
      layout and the keep-list.
- [ ] Re-run `benchmark:large` on the Milestone 3 fixture and record the new
      timings beside the baseline. If the CSS pass exceeds ten percent of
      total review time on the full-size fixture, open a follow-up plan for
      caching parsed rules per blob id before considering a native module.
- [ ] Add `CHANGELOG.md` entry under the unreleased heading.
- [ ] Run `git add -A`, commit using Conventional Commits, and push the branch.
- [ ] Review the complete local diff against `origin/main` using
      `docs/implementation-review-prompt.md` after the push. Report findings
      with severity, context, impact, lettered options, and a recommendation;
      do not change the implementation.

## Follow-up plans (not part of this change)

- Browser-backed refinement: use Chrome's matched-rules and computed-style
  data through the existing Playwright dependency to evaluate conditions,
  specificity, and inheritance for views the static pass kept.
- Ownership inference: derive `ownedDependencies` from component modules that
  import CSS Modules or define styles inline.
- Bundle mapping: attribute compiled stylesheet output back to source modules
  for consumers who ship a single built CSS file.
