# Mokly Viewer Library

Extract Browse into a separately published `@mokly/viewer` React package that
Mokly Cloud can mount around cross-origin screen frames, and promote the public
contracts it depends on: component-instance identity, a versioned catalogue read
model, the viewer API, and a frame adapter with an embedded inspector script.
The cloud consumes only published npm packages and documented export artifacts;
this repository gains no cloud-specific mode, flag, or branch.

Milestones follow the requested order. The user has approved all seven decisions
below and the hard constraint; the Milestone 1 confirmation TODOs are satisfied.
Work stops for review after every milestone. No new product screens are designed:
the viewer renders the existing shell design unchanged and pick mode reuses the
Highlight components visuals, so no mockup milestone is planned. If a genuine
visual gap appears, add a `Tags: mockup` milestone before the affected UI work.

## Hard constraint: no visible change to the local product

`mokly serve` and `mokly export` must look and behave exactly as they do
today. The same shell markup, shell CSS, and enhancement runtime ship from the
new package. The read model file, the inert inspector script, source-location
data, and host-only pick mode are invisible locally: nothing new is rendered,
linked, or reachable in the shell. Any milestone that would change a pixel or
an interaction locally stops for user approval first.

## Findings that shape the design

- `src/server/shell/*.tsx` already renders the shell with React
  `renderToStaticMarkup`; `src/client/*.ts` is a vanilla enhancement runtime
  bundled by `scripts/copy-assets.mjs` into `dist/browser/*.js` and published
  under `__mokly/client/`. No React ships to the browser today.
- Same-origin frame access lives in `component_geometry.ts`,
  `component_range_nodes.ts`, `component_occlusion.ts`,
  `component_highlight.ts`, `frame_navigation.ts`, `browse_state.ts`,
  `control_transport.ts`, and `workspace_preview.ts`.
- Instance keys (`src/components/keys.ts`) are SHA-256 digests of
  `["mokabook-instance-v1", owner.kind, ownerInstanceKey|null, slotKey|null, id]`.
  Props and `order` are not part of the key. Boundary markers are rewritten to
  `<!--mokly-component:(start|end):r-<n>-->` comments by `src/components/ranges.ts`.
- The consumer bundle (`src/build/load_graph.ts`) uses esbuild `jsx: "automatic"`
  without `jsxDev`, so no invocation file/line/column is captured anywhere.
- `mokly-manifest.json` is denied at every public boundary
  (`src/config/public_files.ts`), and `mokly-source-protection.md` states no
  public manifest endpoint exists. The export layout, ownership inventory v1,
  `review.json`, and `mokly-upload.json` v1 are pinned by the cloud.
- The repository is one npm package (`@mokly/mokly`, root `package.json`) with
  no workspaces; release-please manages a single component.

## Proposed decisions to confirm with the user

All seven decisions are approved. The precise record/key scope below reflects
the existing implementation and the Milestone 1 contracts, without a key change.

1. **Instance key format is unchanged.** The existing digest already satisfies
   the stability rule: it changes only when the instance's `moklyInstance` id,
   its input owner kind or parent instance key, or its original slot key changes.
   The containing entry id is not hashed; moving entries changes the scoped
   reference even when the digest stays the same.
   Prop edits and sibling reordering keep the key. Duplicate ids in one scope
   remain a build error.
2. **Resolution states** are computed from records only: `present` (same key,
   same `propsKey`, same `order`, same slot), `moved` (same key, different
   `propsKey`, `order`, or normalized slot), `missing` (key absent). Physical
   range placement is not a field in an instance-record pair. Resolution
   is a pure documented function the viewer exports; no comparison data needed.
3. **Source locations need a build-step change.** Proposal: enable esbuild
   `jsxDev: true` for consumer entries and resolve `react/jsx-dev-runtime` to a
   Mokly-owned shim that forwards to `react/jsx-runtime` and attaches the
   `__source` location only for `defineComponent` wrappers, via a reserved
   prop the wrapper strips like `moklyInstance`. Locations are repo-relative
   paths with 1-based line/column, optional, excluded from `propsKey` and from
   change attribution, and never absolute. This adds an optional `source` field
   to `ComponentInstanceRecord` in manifest v5 (additive; readers must accept
   both forms). Alternative: defer locations and ship `source` as absent.
4. **Read model is a public projection, not the manifest.** Export writes
   `__mokly/catalogue.json` (`schemaVersion: 1`) and Serve serves the same
   path. The manifest stays private because it carries the `sourceFiles`
   inventory, dependency evidence, and legacy envelopes; the projection is
   smaller, stable, and public-safe. It includes catalogue identity,
   `deploymentId`, the collections/pages tree, screens with routes, tags,
   viewports, color schemes and per-view fragment paths, use-case flows,
   registered components and variants, per-view instance records, per-entry
   Changes state, and the pinned `review.json` URL. Adding a file does not
   change the ownership v1 or upload v1 schemas; it only appears in their
   inventories.
5. **Viewer architecture: React markup plus framework-neutral enhancement.**
   `<MoklyViewer>` renders the existing shell TSX and boots the existing
   enhancement runtime in an effect. Export keeps SSR-only output with no React
   in the browser, so static output stays functionally identical. Hosts that
   mount the viewer client-side get the same runtime attached to React-owned
   markup; slots are React-owned containers the runtime never touches;
   controlled props and the imperative handle drive the runtime. Alternative:
   full client hydration shipping React into exports (rejected: changes the
   browser module graph and deployment bytes for no local benefit).
6. **Cross-origin frames must have a real origin.** The `postMessageAdapter`
   takes an explicit `frameOrigin`, rejects opaque (`"null"`) origins, and
   requires `sandbox="allow-same-origin allow-scripts"` on the sandboxed
   subdomain. The inspector script learns its expected host origin from a
   `mokly-host` query parameter added by the adapter, and pins the session
   nonce at handshake.
7. **Packages.** Add npm workspaces with `packages/viewer` as `@mokly/viewer`;
   the root stays `@mokly/mokly` and depends on the viewer by version. Packed
   consumer smoke tests install both tarballs. release-please gains a second
   component so both packages release from one merge.

## Milestone 1: Protocol documentation (completed)

Define every contract before code. Approval of the seven decisions and local
invisibility constraint satisfies the confirmation items; later milestones
record any necessary contract clarifications before implementation.

- [x] Add `docs/protocol/mokly-instances.md`: key derivation and preimage,
      stability rule with an explicit list of edits that change or keep a key,
      resolution states and algorithm, optional `source` location fields and
      the build-step proposal, DOM marker attribute names, comment token
      format, and the one-start/one-end-pair-per-view guarantee.
- [x] Stop and confirm the instance contract with the user.
- [x] Add `docs/protocol/mokly-catalogue.md`: `__mokly/catalogue.json` shape
      with `schemaVersion: 1`, projection rules from manifest v5, omitted
      private fields, Changes state per entry, `review.json` pointer,
      additive-versus-breaking versioning, Serve availability, and same-origin
      and cross-origin fetch rules (public paths, required CORS and
      `nosniff` headers, no credentials).
- [x] Stop and confirm the catalogue contract with the user.
- [x] Add `docs/protocol/mokly-viewer.md`: `<MoklyViewer>` props, catalogue
      sources (object, URL, fetcher), controlled and uncontrolled selection,
      rendered feature inventory cross-referenced to `mokly-runtime.md`,
      slots, events, imperative handle, CSS variable prefix and theming
      boundary, SSR requirement, and host-independence constraints (no host
      knowledge, no network beyond the source, no cookies, no `window.top`).
- [x] Add `docs/protocol/mokly-frame-adapter.md`: `FrameAdapter` interface,
      `sameOriginAdapter` behavior, `postMessageAdapter` and inspector script
      protocol (`mokly-inspector` channel, version 1, handshake, nonce, exact
      origins, `event.source` check, bounded discriminated message shapes with
      unknown keys rejected, keys and boxes only, in-frame overlay, no
      top-window effects), the query-parameter host-origin rule, inertness
      without a handshake, and the script size budget.
- [x] Stop and confirm the viewer and frame-adapter contracts with the user.
- [x] Update overlapping docs: `mokly-export.md` (new public files, the
      Mokly-owned inspector script versus unchanged consumer content, the
      viewer package as a public API), `mokly-export-delivery.md` (routes
      table, cross-origin headers, sandbox attributes), `mokly-source-protection.md`
      (public read model beside the private manifest), `mokly-component-manifest.md`
      (optional `source` field), `mokly-component-explorer.md` and
      `mokly-navigation.md` (frame boundary through the adapter),
      `mokly-runtime.md` (Browse is the viewer), and `docs/protocol/README.md`.
- [x] Update `docs/architecture/package-boundary.md`, the root README, and
      `plans/README.md`; validate Markdown with Prettier and review the diff.
- [x] After Markdown checks pass, `git add -A`, commit with Conventional
      Commits, and push the documentation.
- [x] After the push, use [the implementation review prompt](../docs/implementation-review-prompt.md)
      to review the complete local diff against `origin/main`; report
      findings with severity, options and recommendations without changing
      the implementation, then stop before Milestone 2.

## Milestone 2: Instance identity implementation (completed)

Deliver the confirmed instance contract in the renderer, manifest, and tests
while keeping generated output for unchanged catalogues byte-identical apart
from the new optional field.

- [x] Add failing tests for key stability across prop edits, reorders,
      id changes, and re-parenting, plus resolution fixtures for `present`,
      `moved`, and `missing`.
- [x] Add a pure, exported instance resolution function under
      `src/components` with typed inputs from `ComponentInstanceRecord`.
- [x] Implement the confirmed source-location capture: esbuild `jsxDev`
      setting, the Mokly dev-runtime shim in the consumer React plugin,
      wrapper stripping, repo-relative path normalization, and rejection of
      absolute or escaping paths.
- [x] Extend manifest v5 validation and serialization with the optional
      `source` field; keep historical readers accepting records without it.
- [x] Exclude `source` from `propsKey`, change attribution, and the Changes
      calculation; add regression tests proving line shifts are not material.
- [x] Make structural Changes projections select their identity fields
      explicitly so invocation metadata cannot become comparison input.
- [x] Expose resolution through the consumer's attributed authoring facade
      as well as the public package entrypoint.
- [x] Update packed-consumer API allowlists and exercise exported instance
      records, resolution types, and source capture from the installed package.
- [x] Add a marker conformance test: every recorded range in each view has
      exactly one matched start/end comment pair in the rendered document,
      including replayed slots that give one instance several ranges.
- [x] Regenerate the example catalogue, run relevant tests and
      `cargo xtask check`, and update READMEs.
- [x] After checks pass, `git add -A`, commit the completed work with
      Conventional Commits, push, and stop for review.
- [x] After the push, use [the implementation review prompt](../docs/implementation-review-prompt.md)
      against the complete local diff from `origin/main`; report findings
      without changing the implementation, then stop before Milestone 3.

Verification notes: the example retains its existing `generatedOutput: "derived"`
configuration. Its generated HTML and manifest remain ignored local artifacts;
tracking them would fail `example:check`. Regeneration produced 278 files:
all 277 HTML documents are byte-identical to the pre-milestone output, and the
manifest differs only by 1,911 optional instance source records. Authored CSS
is unchanged. The mobile and desktop Serve smoke checks passed after replacing
an unsuitable network-idle wait with explicit frame readiness. The 169 focused
component tests passed. The first full gate stopped on a test assertion lint
error; that assertion was corrected and the gate restarted.
The next run passed all 1,532 unit/integration tests and reached the packed ESM
API allowlist, which needed the new resolver export. The updated ESM, NodeNext,
clean-cache npx, Accounting and Juno consumers passed independently, including
installed-package source capture.
The final `cargo xtask check` passed: 1,532 unit/integration tests, 274 Chromium
tests, all five packed-consumer scenarios and three Rust tests, plus dependency
audits, formatting, lint, typechecking, example validation, package checks,
Clippy and the Rust file-length audit. No tests were skipped and no browser
retries were needed. Protocol edits only update the two source/identity delivery
statuses; the normative contract is unchanged.

Post-push review: implementation commit `1662441` was reviewed using the required
prompt against the complete branch diff from `origin/main`. No new findings were
identified and no implementation changes were made during review. The earlier
Milestone 1 marker-pair finding was addressed by `21f0cb2`. Residual test risk:
browser coverage is Chromium-only; programmatic or already-transformed calls
intentionally omit source when invocation information is unavailable.

## Milestone 3: Catalogue read model implementation (completed)

Write and serve the confirmed read model from the same projection code.

- [x] Add failing tests for projection shape, omitted private fields,
      deterministic serialization, schema-version fixture, and rejection of
      absolute paths or manifest-internal data.
- [x] Implement the projection module under `src/catalogue` behind a typed
      interface shared by Serve and export; add public fixtures under
      `docs/protocol/fixtures`.
- [x] Export writes `__mokly/catalogue.json` through the normal stage,
      inventory, collision, and deployment-identity flow; Serve serves it at
      the same path and refreshes it on watched updates.
  - [x] Exercise the real watched child and background evidence lifecycle
        through validated public snapshots and content/evidence revisions.
- [x] Add cross-origin fetch coverage: a static fixture server sending the
      documented headers and a browser test fetching the read model from a
      second origin.
- [x] Verify upload archives and ownership inventories include the file
      without schema changes; update packed-consumer and release fixtures.
- [x] Extend the bootstrap package fixture and keep simulated legacy previews
      free of the new catalogue file before testing their migration.
- [x] Retain exact screen-only per-view attribution for the public model,
      alongside existing resource evidence, without another comparison pass.
- [x] Give complete live comparisons a content-addressed public alias; leave
      selected-only generations unpinned and reject stale completion results.
- [x] Validate known usage union fields while tolerating additive fields;
      retain historical usage when current component props or slots change.
- [x] Include the read model in repository preview capture and prove shell
      HTML remains byte-identical apart from the stamped deployment identity.
- [x] Update READMEs and delivery statuses; run focused tests and
      `cargo xtask check`.
- [x] After checks pass, `git add -A`, commit with Conventional Commits, and push.
- [x] After the push, use [the implementation review prompt](../docs/implementation-review-prompt.md)
      against the complete local diff from `origin/main`; record findings
      without changing the implementation, then stop before Milestone 4.

### Milestone 3 verification notes

The public v1 model now uses a shared typed allowlist projection for Serve,
consumer export and repository preview. Export finalization validates and stamps
its owned identity field after inventory/ownership assembly; upload and ownership
schemas stay at v1. Packed-consumer checks read the public file and extract it
from actual upload archives. The local shell still uses embedded data.

Tests were added before implementation for projection/privacy, canonical bytes,
fixture/version conformance, export inventory/identity and live GET/HEAD. Later
regressions captured contradictory usage union fields and historical component
slot changes before fixing them. Focused verification passes 20 catalogue tests
and seven Chromium browser tests, with no skips or retries. The real watched
child test covers content adoption, background evidence and metadata restarts;
stale complete comparisons cannot pin superseded evidence. All 20 exported HTML
files in the unchanged consumer fixture match pre-milestone bytes after
normalizing only the stamped deployment identity.

Documentation now marks catalogue delivery implemented while leaving the viewer
and inspector planned. One normative gap required clarification: existing live
comparison URLs use UUIDs and can represent selected-only results, whereas the
catalogue pointer requires a complete immutable 64-hex generation. Matching
complete results gain a content-addressed alias; selected-only results stay
unpinned, superseded completion is ignored, and unavailable aliases return 404
without redirects or generation. No other normative contracts or wire schemas
changed. The canonical public JSON fixture is exempt from Prettier because its
exact protocol serialization is covered by conformance tests.

The first full gate ran 1,552 Node tests and found seven fixture failures:
four bootstrap packages omitted the newly required public documentation, and
three simulated legacy previews incorrectly retained the new catalogue file.
The fixtures were corrected without relaxing production validation; all 15
affected regression tests pass. The second `cargo xtask check` passed all 1,552
Node tests, 276 Chromium tests, five packed-consumer scenarios and three Rust
tests, plus dependency audits, formatting, lint, typechecking, example validation,
package checks, Clippy and the Rust file-length audit (eight files). No tests
were skipped; there were no intermittent failures or browser retries. The
browser suite took 9.7 minutes, including its larger fixture preparation.
Markdown validation checked 168 local links; the diff has no file deletions
against the refreshed `origin/main`. Implementation commit `75d04b6` was pushed
before the review below. Milestone 4 has not started.

### Milestone 3 post-push review

1. **P2 — Historical usage can reference an omitted component.**
   [views.ts:51](../src/catalogue/views.ts#L51) publishes every retained baseline
   usage record as ready. When a removed screen used a component whose id is
   reused by a current page (or whose route is reused), current precedence in
   `removedManifestEntries` omits the old component metadata. The screen's
   instances still name that component. A read-only reproduction using the
   generated example verified that both input manifests pass `parseManifest`,
   while the projected model fails `readCatalogue` with an unknown-component
   reference. Doing nothing leaves Serve consumers with an unreadable snapshot
   and causes export finalization to reject otherwise valid input. **A
   (recommended):** centralize historical-reference availability during
   projection, publish unavailable usage when its component metadata cannot be
   retained under current precedence, and add Serve/export regressions for both
   id and route reuse. This addresses the whole reference-loss class without
   weakening the reader. **B:** extend the public contract with separately scoped
   historical component definitions; this preserves more inspection data but
   adds schema and reader complexity.

2. **P2 — Alias cleanup renews unused comparison retention.**
   [public_review.ts:68](../src/server/public_review.ts#L68) prunes aliases using
   `ReviewGenerationStore.get`, whose documented behavior renews the idle timer
   ([review_generations.ts:48](../src/server/review_generations.ts#L48)). Every new
   complete capture therefore touches every retained old generation. Repeated
   full refreshes less than 60 seconds apart keep unused snapshot directories
   alive and allow disk use to grow until captures stop. **A (recommended):**
   add a non-renewing presence/peek operation for pruning and cover repeated
   captures with a controlled-clock expiry test. Separating presence checks
   from retention renewal prevents the same cache-management mistake elsewhere.
   **B:** remove the sweep and prune only when expired aliases are requested;
   this restores snapshot expiry but leaves an accumulating alias map.

3. **P3 — Runtime delivery status still says the catalogue is unimplemented.**
   [mokly-runtime.md:31](../docs/protocol/mokly-runtime.md#L31) groups the public
   catalogue with the future viewer/frame work as not implemented, and the route
   paragraph near line 121 still describes it as an approved target. This
   contradicts the implemented endpoint and the updated catalogue/export docs,
   leaving readers uncertain which public boundary is available. **A
   (recommended):** update both runtime paragraphs and audit other catalogue
   delivery-status references when closing the remaining milestones. A focused
   documentation correction and checklist are sufficient here. **B:** introduce
   shared machine-readable delivery metadata and generated status snippets;
   that would prevent drift more broadly but adds tooling for a small set of
   milestone updates.

The required prompt reviewed the complete 117-file branch diff at `75d04b6`
against `origin/main` (`87daaa4`) after the implementation push. No findings were
automatically fixed. These recommendations await the user's decision; they do
not authorize starting another milestone. Browser verification remains
Chromium-only. Recording this review is a documentation-only follow-up.

## Milestone 4: Frame adapter and inspector script

Tags: ui

Move frame access behind the `FrameAdapter` interface and add the
cross-origin path.

- [ ] Define `FrameAdapter` types in `src/client` with mount, list instance
      boxes, highlight, scroll-to, and hover, click, and navigation
      subscriptions; add a fake adapter for tests.
- [ ] Extract `sameOriginAdapter` from the existing `contentDocument` modules
      without behavior change; existing browser tests must pass unchanged.
- [ ] Write the inspector script as a dependency-free IIFE under
      `src/inspector`, bundled by `scripts/copy-assets.mjs`, with a size
      budget check in `scripts/package-check.mjs`.
- [ ] Implement message schema validation shared by both sides: channel,
      version, nonce, discriminated `type`, bounded arrays and numbers,
      unknown keys rejected, `event.source` and exact origin checks.
- [ ] Implement `postMessageAdapter` with the handshake, per-mount nonce,
      exact `frameOrigin`, opaque-origin rejection, and in-frame highlight
      overlay requests.
- [ ] Embed the script through the Browse document adapter for current
      published HTML copies only; comparison snapshots remain byte-unmodified.
      Prove the script is inert without a handshake and never touches
      `window.top` or `parent.location`.
- [ ] Add browser tests with a cross-origin fixture page: handshake, instance
      boxes, highlight, scroll, hover, click, in-frame link navigation,
      rejected messages from wrong origins, wrong sources, and wrong nonces.
- [ ] Update READMEs, run relevant tests and `cargo xtask check`, commit,
      push, and stop for review.

## Milestone 5: Extract the viewer package

Tags: ui

Create `@mokly/viewer` and make Serve and export its first hosts.

- [ ] Add npm workspaces with `packages/viewer` (`@mokly/viewer`, MIT,
      React peer dependency, ESM, type declarations); extend build, lint,
      typecheck, format, package check, and packed-consumer smoke scripts.
- [ ] Move the shell TSX, shell CSS, enhancement runtime, adapters, and
      navigation client modules into the package; the CLI package imports the
      viewer by version and keeps serve, export, build, and comparison code.
- [ ] Implement `<MoklyViewer>`: catalogue source handling, controlled and
      uncontrolled selection, every slot, every event, the imperative handle,
      CSS variable theming, and an SSR entry that renders static shell HTML.
- [ ] Mount the viewer in Serve and export with no slots and the same-origin
      adapter; Serve's live-update client refreshes the read model and drives
      the viewer's update path.
- [ ] Acceptance: the exported example site is functionally identical (byte
      comparison of shell output with justified diffs listed), all existing
      browser tests pass unchanged or with justified edits, and watched-update
      behavior is preserved.
- [ ] Add package tests: rendering from a read-model fixture, each slot, each
      event, controlled selection, imperative handle, SSR output, and the
      postMessage adapter against the cross-origin test page.
- [ ] Add the package README following the repository README rules and update
      the root README, architecture docs, and protocol delivery statuses.
- [ ] Run relevant tests and `cargo xtask check`, commit, push, and stop for
      review.

## Milestone 6: Release preparation and verification

Prepare both packages to release together from the merge.

- [ ] Configure release-please for two components, `@mokly/viewer` starting at
      `0.1.0` and the matching `@mokly/mokly` minor bump; update
      `npm-release.md`, publish action, and release fixtures.
- [ ] Extend package checks and smoke tests to pack, install, and exercise
      both tarballs from a clean consumer.
- [ ] Run `cargo xtask check`; after it passes, `git add -A`, commit with
      Conventional Commits, and push the branch.
- [ ] After the push, use [the implementation review prompt](../docs/implementation-review-prompt.md)
      to review the complete local diff against `origin/main`; report
      numbered, severity-rated findings with options and recommendations
      without changing the implementation.

## Post-merge follow-up (non-blocking)

- Merge the release-please PR so `@mokly/viewer` 0.1.0 and the matching
  `@mokly/mokly` version publish together; report both versions.
- Smoke-test the published packages from a clean consumer: mount the viewer
  with the postMessage adapter against a published export on a second origin.
- Close this plan in `plans/README.md` when the PR merges.
