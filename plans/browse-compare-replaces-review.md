# Browse Compare Replaces Review

Remove the standalone Review surface — the Browse/Review mode pills, the served
`/review` mode with its generation lifecycle, the static Review artifact, and
the `mokabook review` CLI command — and fold change comparison into Browse
itself. The All/Changed catalogue filter stays the way people find changes; a
new per-screen compare segment (`Current | Base | Overlay | Difference`) in the
screen head renders diffs on demand only, for any screen, against the
branch-point base version served straight from Git.

Approved decisions (owner sign-off recorded 2026-08-13):

1. No CLI replacement for CI artifact generation. Consumers review changes via
   committed generated-HTML diffs and the served Browse compare view. Juno's
   `mokabook-review` CI job is retired on the juno side (out of scope here).
2. Change detection gets more accurate while Review's classification surface
   goes away: fragment-byte evidence is confirmed with review-ignore
   normalization before a route counts as changed, and `sharedImpact` paths
   remain change evidence so stylesheet-only edits still surface.
3. The `review` config section becomes `changes: { base, sharedImpact }`
   (`outDir` is deleted with the artifact). The authoring API keeps its
   `ReviewIgnore` / `ReviewIgnoreScope` / `reviewMaterialKey` names.
4. Removed screens are no longer visible anywhere in the product; Git history
   and PR diffs of committed fragments cover that need.

Deliberate feature removals versus `origin/main` are authorized by the owner
per the decisions above; each milestone's commit message must list the
removals it lands. The design contract intentionally leads the implementation:
between Milestone 1 and Milestone 3 the contract already describes the
Review-free shell while the code still serves Review.

Out of scope (juno repository follow-ups, tracked there): delete the
`mokabook-review` CI job, the `mockups:review` npm script, the `/review`
snapshot and internal imports in `ts/scripts/mokabook_deployment/build.mjs`,
rename the config section, and update juno's mockup docs.

## Milestone 1 — Design contract and mockups for in-Browse compare

Tags: mockup

Rewrite the shell design contract and the example Design catalogue so the
approved design no longer contains a Review mode and instead specifies the
per-screen compare segment. New compare panes use `mbk-*` class names; the
legacy `mb-*` compare contract is dropped from the spec.

- [x] Rewrite `docs/protocol/mokabook-shell-design.md`: remove the Review
      pill from the top-bar spec and the whole Review Pages section; respec
      the screen head to carry the compare segment
      (`Current | Base | Overlay | Difference`) ahead of the viewport control
      when Git change detection is available; update the responsive wrap rules
      for three head-band controls; spec compare-pane stacking inside the
      existing phone/browser chrome via `data-compare` states (opacity
      overlay, blend-mode difference), the added-screen "no base version"
      placeholder pane, and dark-scheme composition.
- [x] Update the mockup table in the contract: drop the eight
      `design/review/**` states, add the compare states
      (`design/browse/compare/{base,overlay,difference,added,dark}`), and
      show the compare segment on the standard screen state.
- [x] Delete `examples/basic/entries/design/review_outcome_screens.tsx`,
      `review_impact_screens.tsx`, and `parts/review.tsx`; repurpose
      `parts/compare.tsx` into the head-band segment depiction; add the five
      compare-state screens; update `design.mockup.tsx` registrations,
      `examples/basic/notes.md`, the design stylesheets
      (`examples/basic/generated/design*.css`), and the example config's
      `design/review/**` stylesheet rule.
- [x] Update browser regressions that assert the removed `design/review/**`
      mockup routes (`tests/browser/review.spec.ts:193` area) to target the
      new compare-state mockups.
- [x] Rebuild the example catalogue and commit regenerated fragments; run
      `cargo xtask check`; commit (Conventional Commits) and push.

## Milestone 2 — Remove Review entry points from the served shell

Tags: ui

Take Review out of the Browse chrome so the served product is Browse-only.
The `/review` HTTP surface keeps working unlinked until Milestone 3; the only
non-shell edit is deleting the dead launcher dispatch glue.

- [x] Remove the Browse/Review mode nav from
      `src/server/shell/document.tsx` (the `.mbk-mode*` and `.mbk-basewatch`
      CSS rules stay until Milestone 3 because generated static artifacts
      still inline `SHELL_CSS` and use those classes).
- [x] Remove `ReviewLauncherView` and the `{ kind: "review" }` shell view from
      `src/server/shell/views.tsx`, `reviewPage` from `src/server/pages.ts`,
      and `mode` from `src/server/shell/context.ts` (the All/Changed filter
      renders whenever `changedRoutes` is defined).
- [x] Delete the launcher fallback branch in `src/server/http.ts` so an
      unprovisioned `/review` request 404s like any unknown route.
- [x] Stop snapshotting `/review` in `scripts/preview/build.mjs`: the preview
      captured the launcher page, which no longer exists (moved forward from
      Milestone 3).
- [x] Update `tests/shell.test.ts` (launcher and mode-pill assertions),
      `tests/server_review.test.ts` (unprovisioned `/review` now 404s),
      `tests/server_live_updates.test.ts` (route list), and the runtime
      protocol's Browse Shell and launcher statements.
- [x] Run `cargo xtask check`; commit and push.

## Milestone 3 — Delete the Review artifact, served mode, and CLI command

Remove the batch-comparison product: the static artifact renderer, the served
`/review` generation lifecycle, and the CLI command, plus their config, tests,
scripts, and docs. The comparison core (Git client, batch reads, base
manifest, ignore normalization, compare kernel) stays for the Changed filter.

- [ ] Delete `src/review/artifact.ts`, `artifact_pages.tsx`,
      `artifact_shell.tsx`, `artifact_navigation.tsx`, `write.ts`, `paths.ts`,
      `run.ts`, and the snapshot-copying portion of `assets.ts`
      (`FileSystemReviewAssetReader`, `copySnapshotDependencies`,
      `referencedRoutes`, `resolveReference`), keeping `GitReviewAssetReader`.
- [ ] Delete `src/server/review_routes.ts` and
      `src/server/review_generations.ts`; strip their wiring from
      `src/server/http.ts`, `serve.ts`, and `child.ts`; drop the
      `review.outDir` pruning in `src/server/watch_events.ts:197` (keep the
      `.mokabook-review-` temp-prefix ignore until Milestone 4 renames it).
- [ ] Remove the `review` command from `src/cli/arguments.ts`, `run.ts`, and
      `help.ts` (`--base` stays for serve).
- [ ] Remove `outDir` from the review config schema
      (`src/config/types.ts`, `validate.ts`) and delete `validateReviewOut`
      from `src/config/path_validation.ts`; update `tests/helpers/fixture.ts`.
- [ ] Delete `src/server/shell/css_review.ts` and the deletable portion of
      `css_review_shell.ts` (keep `.mbk-status`, `.mbk-cmp-toolbar`,
      `.mbk-rvw-stage` only if the Milestone 1 contract reuses them; otherwise
      delete and re-add fresh in Milestone 6); also delete the `.mbk-mode*`
      and `.mbk-basewatch` rules deferred from Milestone 2; update `css.ts`
      assembly.
- [ ] Delete the dedicated test files: `tests/review.test.ts`,
      `tests/browser/review.spec.ts`, `tests/review_performance.test.ts`,
      `tests/review_artifact_ui.test.ts`, `tests/server_review.test.ts`,
      `tests/review_regressions.test.ts`,
      `tests/server_review_generation_safety.test.ts`,
      `tests/review_assets.test.ts`, `tests/review_safety.test.ts`,
      `tests/server_review_shutdown.test.ts`; move still-relevant comparison
      and Git-batch coverage into kept suites first
      (`tests/server_changed.test.ts` or a new `tests/changes.test.ts`).
- [ ] Update `scripts/package/consumer_cases.mjs` to drop the packed review
      smoke cases; update `tests/preview.test.ts`, `tests/deployment.test.ts`,
      `tests/package.test.ts`, `tests/watch_boundaries.test.ts`, and
      `tests/config.test.ts`. The `tests/server.test.ts` config-reload probe
      polls `/review` for the reloaded base ref and must switch to a
      different reload-visible signal.
- [ ] Update docs: `docs/protocol/mokabook-runtime.md` (drop Review
      Comparison, Served Review, `review.json`, CI Review Integration
      sections; keep Review Ignore semantics under change detection),
      `docs/protocol/mokabook-package.md` (CLI table, config), `README.md`,
      `docs/architecture/package-boundary.md`, `docs/protocol/npm-release.md`
      gate descriptions.
- [ ] Mark plan `accounting-shell-design-parity.md` Milestone 6 as obsolete
      with a pointer to this plan (do not re-open or edit its history
      otherwise).
- [ ] Run `cargo xtask check`; commit (breaking-change footer for the CLI
      removal) and push.

## Milestone 4 — Rename to `changes` and upgrade change detection

Rehome the kept comparison core under the new name and make the Changed
filter's evidence accurate per decision 2.

- [ ] Rename the config section `review` → `changes` (`base`,
      `sharedImpact`), breaking-change commit; update `defineConfig` types,
      validation defaults, `src/index.ts` exports (`ReviewConfig` →
      `ChangesConfig`), the example config, and the consumer fixtures under
      `tests/fixtures/consumers/{esm,accounting,juno}`.
- [ ] Move the kept modules from `src/review/` to `src/changes/` (`git.ts`,
      `git_batch.ts`, `base_manifest.ts`, `changed_paths.ts`, `ignore.ts`,
      `screen_views.ts`, `compare.ts`, `types.ts`, `materiality.ts`, and the
      `GitReviewAssetReader` as `base_assets.ts`); update importers
      (`src/server/changed.ts`, `src/build/compile.ts`) and delete the empty
      `src/review/` directory. Rename the watcher temp-prefix ignore to a
      neutral name alongside.
- [ ] Slim `src/changes/compare.ts` to a pure comparison kernel: drop
      artifact snapshot emission (`beforePath`/`afterPath`, seed files) and
      return per-view classification plus base/head bytes on request.
- [ ] Upgrade `computeChangedRoutes` in `src/server/changed.ts`: when a
      route's only evidence is generated-fragment path changes, read the base
      fragments (bounded batch), normalize both sides with the review-ignore
      rules, and drop the route when every view is byte-equal after
      normalization; manifest-metadata differences and declared-dependency
      hits keep counting without byte reads.
- [ ] Add `sharedImpact` evidence to `computeChangedRoutes`: a changed path
      matching a `changes.sharedImpact` glob marks a route changed when that
      path is one of the route's configured stylesheets (per the config
      `stylesheets` rules); a sharedImpact path that is no route's stylesheet
      marks every route changed.
- [ ] Cover the new semantics in `tests/server_changed.test.ts` (ignored-only
      fragment churn stays unchanged; stylesheet-only edits mark their
      routes; metadata-only changes need no Git byte reads).
- [ ] Update `docs/protocol/mokabook-runtime.md` change-detection section and
      `docs/protocol/mokabook-package.md` config docs; refresh crate/module
      README references.
- [ ] Run `cargo xtask check`; commit and push.

## Milestone 5 — Served base-fragment subtree

Give Browse an on-demand source of branch-point documents so the compare view
needs no artifact, no snapshot trees, and no retention lifecycle.

- [ ] Pin the merge-base commit once per server child (same startup pass as
      `computeChangedRoutes` in `src/server/child.ts`) and expose it on
      `ServerOptions` / the shell context as `baseCommit`.
- [ ] Add a `src/server/base_routes.ts` handler for
      `/__mokabook/base/<baseCommit>/<repo-path>`: only active when change
      detection resolved; 404 for any commit other than the pinned one; read
      blobs at the pinned commit via the batch Git reader; reject non-regular
      file modes and paths under configured source roots; content-type by
      extension; `Cache-Control: public, max-age=31536000, immutable`.
- [ ] Serve a styled "No base version" placeholder document (per the
      Milestone 1 contract) when a requested base _document_ does not exist
      at the pinned commit; plain 404 for missing non-document resources.
- [ ] Base documents referencing relative CSS/font/image URLs resolve inside
      the subtree automatically; add tests proving a base document renders
      with base-commit stylesheets while the live catalogue serves newer
      ones.
- [ ] Unit-test the handler (pinned-commit guard, confinement, placeholder,
      caching headers) in `tests/server_base_routes.test.ts`.
- [ ] Document the subtree in `docs/protocol/mokabook-runtime.md` (routes,
      lifetime, caching, confinement).
- [ ] Run `cargo xtask check`; commit and push.

## Milestone 6 — Per-screen compare segment in Browse

Tags: ui

Implement the approved compare design in the served shell: on-demand only,
any screen, both viewports, dark-aware.

- [ ] Add the compare segment to the screen head via
      `src/server/shell/views.tsx` `HeadActions` and a new `CompareSwitch` in
      `src/server/shell/head.tsx`, rendered for screen routes when
      `baseCommit` is present; stage markup in `src/server/shell/stages.tsx`
      gains `data-compare="current"` plus per-frame base-document URLs as
      data attributes (no base iframe server-rendered).
- [ ] Add compare CSS per the contract (new module in `src/server/shell/`,
      `mbk-*` classes): stacked base/head documents inside the existing
      phone-screen and browser viewports for `data-compare` values `base`,
      `overlay` (head at 0.5 opacity over base), and `difference`
      (blend-mode), plus the placeholder pane styling.
- [ ] Add `src/client/browse_compare.ts` (register in
      `src/server/client_modules.ts`): delegated segment clicks, lazy base
      iframe injection on first non-`current` activation, scheme-switch
      integration (swap base and head sources together), viewport
      independence, reset to `current` on route navigation, and a `compare`
      field in `BrowseRecoveryState`
      (`capture`/`restore`/`parse` in `src/client/browse_state.ts`) so the
      mode survives watched reloads.
- [ ] Ensure zero Git reads and zero base requests while the segment stays on
      `Current` (assert no base-subtree fetches in tests).
- [ ] Unit tests in `tests/shell.test.ts` / `tests/client_browse.test.ts`
      (markup, allowlist, recovery state) and Playwright coverage in
      `tests/browser/browse.spec.ts` or a new `tests/browser/compare.spec.ts`
      (mode switching, lazy loading, added-screen placeholder, dark
      composition) matching the approved mockups.
- [ ] Update `docs/protocol/mokabook-runtime.md` Browse Shell section and the
      shell design contract if implementation surfaced deviations; update
      `README.md` feature description.
- [ ] Run `cargo xtask check`; commit and push.

## Milestone 7 — Verification and handoff

- [ ] Run `npm test`, `npm run test:browser`, `npm run example:build`,
      `npm run example:check`, and `npm run preview:build`; smoke-test the
      served shell end to end (serve the example, exercise the Changed
      filter, all four compare modes, dark scheme, added-screen placeholder,
      watched-reload recovery).
- [ ] Sweep `README.md`, `docs/protocol/README.md`, and remaining docs for
      stale Review references; confirm `plans/README.md` reflects this plan's
      completion state.
- [ ] Run `cargo xtask check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Run `cargo xtask review` after the push and report findings with
      numbered items, severities, and recommendations, without auto-fixing.
