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

## Milestone 4: Frame adapter and inspector script (completed)

Tags: ui

Move frame access behind the `FrameAdapter` interface and add the
cross-origin path.

- [x] Define `FrameAdapter` types in `src/client` with mount, list instance
      boxes, highlight, scroll-to, and hover, click, and navigation
      subscriptions; add a fake adapter for tests.
- [x] Extract `sameOriginAdapter` from the existing `contentDocument` modules
      without behavior change; existing browser tests must pass unchanged.
- [x] Write the inspector script as a dependency-free IIFE under
      `src/inspector`, bundled by `scripts/copy-assets.mjs`, with a size
      budget check in `scripts/package-check.mjs`.
- [x] Implement message schema validation shared by both sides: channel,
      version, nonce, discriminated `type`, bounded arrays and numbers,
      unknown keys rejected, `event.source` and exact origin checks.
- [x] Implement `postMessageAdapter` with the handshake, per-mount nonce,
      exact `frameOrigin`, opaque-origin rejection, and in-frame highlight
      overlay requests.
- [x] Embed the script through the Browse document adapter for current
      published HTML copies only; comparison snapshots remain byte-unmodified.
      Prove the script is inert without a handshake and never touches
      `window.top` or `parent.location`.
- [x] Add browser tests with a cross-origin fixture page: handshake, instance
      boxes, highlight, scroll, hover, click, in-frame link navigation,
      rejected messages from wrong origins, wrong sources, and wrong nonces.
- [x] Update READMEs, run relevant tests and `cargo xtask check`, commit,
      push, and stop for review.

- [x] Validate compact range parents before numeric conversion; reject broken
      references rather than converting invalid numbers to null.
- [x] Exercise the public same-origin interface's pointer subscriptions and
      pending-operation disposal, alongside the unchanged local shell runtime.
- [x] Capture disposal-after-response and byte-limited usage-map regressions
      before fixing their lifecycle/error handling.
- [x] Preserve body-child selectors by inserting publication metadata into the
      head; cover the unchanged body structure in a regression.
- [x] Prove clipping, occlusion and coalesced events across origins; capture and
      fix text-only range scrolling through nested containers.
- [x] Cover primary/modified/middle and top/parent/blank/named navigation,
      runtime outer-window traps and a real five-second pending-request timeout.
- [x] Validate build-time string/native pooling semantics and enforce the final
      minified inspector budget after all formatting and implementation changes.
- [x] Extend the existing Browse target-preservation unit assertions to include
      the new authenticated link indices without weakening their href/target checks.
- [x] Validate portable repository-preview resources before inspector injection,
      retaining full staged-inventory validation afterward; include the build
      helpers in the isolated example-baseline fixture.

### Milestone 4 implementation notes

Three existing browser assertions (`component_inspector`, `component_workspace`,
`design_links`) required zero script elements in published Browse frames. The
required external inspector injection necessarily adds one script tag. Only those
assertions now require that one package script; generated-document assertions,
sandbox denial, screenshots and existing interactions retain their requirements.
The inert map uses a template so it adds no executable script. No mockup changes
are needed because the local presentation is unchanged.
The existing `browse_document_adapter` unit test also expected target attributes
to end the start tag. Its six exact assertions now include the required link
indices, retaining the original href, target, namespace and degradation checks.

- [x] Prove local shell HTML, generated documents and mobile/desktop screenshots
      match the pre-milestone capture; retain comparison snapshot bytes exactly.
- [x] Cover inspector budget, bundle confinement, release inventory, lifecycle
      failures and current-only metadata injection in focused regressions.
- [x] After checks pass, `git add -A`, commit with Conventional Commits and push.
- [x] After the push, use [the implementation review prompt](../docs/implementation-review-prompt.md)
      against the complete local diff from `origin/main`; record numbered
      findings with severity, options and recommendations without changing code.

### Milestone 4 verification notes

The frame interfaces and both adapters are implemented in `src/client`; extraction
into the separate viewer package remains Milestone 5. Local Serve/export retain
their script-disabled sandbox, parent-owned highlighting and existing controls.
Current published copies receive a deferred inspector plus an inert, bounded
range/parent and logical-link map. The map and script are inserted in the head;
generated files and comparison snapshots receive neither. Oversized maps publish
an explicit limit state. The frame/export delivery documents and the client,
inspector, Browse, export and root READMEs describe these boundaries.

Regressions captured invalid compact parent conversion, a resolved reply escaping
disposal, a byte-limited host map throwing the wrong error, body-selector changes,
and text-only scrolling inside an inner container before their fixes. Build-helper
tests also captured strict-directive relocation, native shadowing and delimiter
collisions. The dependency-free IIFE uses ordinary string/native pooling followed
by Terser with no unsafe compression flags or runtime decoder. Its final minified,
uncompressed size is exactly 8,192 bytes, enforced by the package gate.

Focused verification passes 47 Node tests and 14 Chromium tests, with no skips or
intermittent retries. Browser coverage includes null/multiple roots, clipping,
occlusion, highlight pixel preservation, text and element scrolling, hover/click,
Escape, logical targets/modifiers, coalescing, view replacement, disposal, both
five-second timeouts and rejected origin/source/nonce/schema/size inputs. VM traps
exercise outer-window confinement through handshake, navigation and disposal.
The final mobile and desktop screenshots and served shell HTML are byte-identical
to the saved pre-milestone captures. All 277 generated example HTML hashes match;
the export regression separately compares every snapshot HTML file with its
original generated bytes. No comparison or example source files were changed.

The first full gate ran 1,598 Node tests and stopped with 40 failures: one
existing target-attribute assertion, one isolated example fixture missing the new
build helpers, and 38 repository-preview tests sharing a portable-resource
validation failure. Preview now validates copied consumer resources before
inspector injection; final export validation still checks the complete staged
inventory. A new regression also proves unowned consumer scripts cannot gain
root-relative access through that ordering. All six Browse adapter tests, the
isolated example rebuild, and the 45 publication/preview tests pass after these
fixes. One focused preview run correctly rejected source edits made concurrently
with its capture; the independent stable-tree rerun passed both tests.

The final `cargo xtask check` passed all 1,599 Node tests, 290 Chromium tests,
five packed-consumer scenarios and three Rust tests, plus dependency audits,
formatting, lint, typechecking, example validation, the package budget gate,
Clippy and the Rust file-length audit (eight files). No tests were skipped and
no browser retries or intermittent failures occurred in the final gate. The
browser suite took 9.5 minutes. The working tree stayed stable during this run.
All changed source/test files are within 300 lines. Local Markdown links and the
diff were validated; there are no file deletions against refreshed `origin/main`
(`87daaa4`). Implementation commit `6c244bb` was pushed before the review below.
Milestone 3 notes and findings remain byte-unchanged.

### Milestone 4 post-push review

1. **P2 — Viewport-fixed components lose their visible element bounds.**
   [geometry.ts:45](../src/inspector/geometry.ts#L45) skips the measured element
   before recording its fixed positioning. An ordinary overflow ancestor then
   clips a viewport-fixed element even though that ancestor does not clip its
   actual paint. A Chromium probe against the published minified inspector used
   an 80-by-40 overflow-hidden ancestor and a fixed 160-by-40 button at
   `(200, 150)`. Chrome reported that rectangle and hit-tested the button, while
   the adapter returned an empty box array. Adding button text returned only the
   text rectangle. Both adapters' public boundary lists use this reader. Doing
   nothing leaves visible fixed controls unavailable to picking or only partly
   highlighted. **A (recommended):** define and share containing-block-aware
   clipping across adapter measurements and local highlighting, with browser
   regressions for viewport-fixed controls, transformed containing blocks, text
   and nested scrollers. This broader geometry seam prevents the parallel local
   and inspector implementations from drifting; retain the bundle budget and
   existing local visual baselines. **B:** move the fixed-position flag update
   ahead of the skip and add only this regression. That is a smaller patch but
   does not establish which ancestors legitimately clip a fixed descendant.

2. **P2 — Consumer CSS can paint over highlighted component pixels.**
   [overlay.ts:15](../src/inspector/overlay.ts#L15) sets positioning and pointer
   styles on an ordinary `div`, leaving its other computed styles consumer-owned.
   The shadow root isolates the SVG shapes, but not this host. A Chromium probe
   with `div { background: rgb(255, 0, 0) }` gave the host a red 390-by-300
   background; screenshots of the selected button differed before and after
   highlighting because the host painted behind the mask's transparent cutout.
   Doing nothing permits consumer styles to obscure selected content or hide
   the overlay, violating pixel preservation for cross-origin inspection.
   **A (recommended):** establish an explicit style reset for the overlay host
   and test consumer background, display, opacity and box-model rules, including
   important declarations. Keep the shadow root and test original component
   pixels through its cutouts. A scoped presentation boundary plus regressions
   is sufficient; the overlay does not need an architectural replacement.
   **B:** change the host to a custom element to avoid generic `div` selectors.
   That reduces collisions but leaves universal and inherited styles unchecked.

The required prompt reviewed the complete 178-file branch diff at `6c244bb`
against `origin/main` (`87daaa4`) after the implementation push, using
`git diff origin/main...HEAD`. The 180-file tip-to-tip summary additionally
includes main-only release 0.9.0 metadata; no integration or release-metadata
changes were made. Coverage included instance/source capture, catalogue readers
and projection, server/watch/comparison lifecycle, both frame transports,
publication/export, bundle tooling, fixtures, tests and protocol alignment.
The three recorded Milestone 3 findings still await the user's decision and
were not changed or fixed. These two additional findings were confirmed with
isolated browser probes; no implementation or test files changed during review.
Browser verification remains Chromium-only, and the inspector has zero bytes of
headroom under its enforced budget. Recording this review is a documentation-only
follow-up. Milestone 5 has not started.

## Milestone 5: Extract the viewer package (completed)

Tags: ui

Create `@mokly/viewer` and make Serve and export its first hosts.

- [x] Add npm workspaces with `packages/viewer` (`@mokly/viewer`, MIT,
      React peer dependency, ESM, type declarations); extend build, lint,
      typecheck, format, package check, and packed-consumer smoke scripts.
- [x] Move the shell TSX, shell CSS, enhancement runtime, adapters, and
      navigation client modules into the package; the CLI package imports the
      viewer by version and keeps serve, export, build, and comparison code.
- [x] Implement `<MoklyViewer>`: catalogue source handling, controlled and
      uncontrolled selection, every slot, every event, the imperative handle,
      CSS variable theming, and an SSR entry that renders static shell HTML.
- [x] Mount the viewer in Serve and export with no slots and the same-origin
      adapter; Serve's live-update client refreshes the read model and drives
      the viewer's update path.
- [x] Acceptance: the exported example site is functionally identical (byte
      comparison of shell output with justified diffs listed), all existing
      browser tests pass unchanged or with justified edits, and watched-update
      behavior is preserved.
- [x] Add package tests: rendering from a read-model fixture, each slot, each
      event, controlled selection, imperative handle, SSR output, and the
      postMessage adapter against the cross-origin test page.
- [x] Add the package README following the repository README rules and update
      the root README, architecture docs, and protocol delivery statuses.
- [x] Run relevant tests and `cargo xtask check`, commit, push, and stop for
      review.

### Milestone 5 extraction checklist

- [x] Capture the HEAD export, served shell markup, generated-document hashes,
      and mobile/desktop screenshots in `.context/viewer-m5` before edits.
- [x] Move shared browser-safe value types and validators to their real viewer
      owner; replace Node-only hashing in catalogue validation with a tested
      synchronous browser-safe implementation, preserving all digest bytes.
- [x] Keep private controls, on-demand view requests and watched transports in
      the CLI, injected through documented framework-neutral runtime seams.
- [x] Verify effect replay, independent roots, cancellation, source replacement,
      every slot/event/handle operation, and cross-origin React hosting.
- [x] Record every export HTML/CSS/module byte difference and unchanged watched
      browser tests; keep comparison snapshots and inspector bytes unchanged.
- [x] Cover invalid prop selection, idle pick cancellation and shell variant/fragment
      navigation with regressions; preserve safe errors and committed event semantics.
- [x] Consolidate imports at the new owner and split package-manifest and
      registry/classification helpers to keep production files within 300 lines.
- [x] Keep Serve assets independent of catalogue decoding and cache validated
      public revisions for shell requests; re-run latency and full-gate checks.
- [x] Synchronize comparison-recovery coverage with the replacement document's
      load event; preserve every behavior assertion and repeat the regression.
- [x] Keep the catalogue validator off Serve's initial browser module graph;
      prove live recovery boots without it and evidence loads it only on demand.
- [x] Preserve native disclosure interactions made before module initialization
      through preference/recovery restoration; cover deliberately delayed modules
      and retain every existing watch test unchanged.
- [x] After focused checks and `cargo xtask check` pass, `git add -A`, commit
      with Conventional Commits and the requested co-author trailer, and push.
- [x] After that push, use [the implementation review prompt](../docs/implementation-review-prompt.md)
      against the complete local diff from `origin/main`; record findings with
      severity, impact, lettered options and recommendations without fixing them.

### Milestone 5 verification notes

The pre-edit baseline is commit `695a856b53e68a987418b15ea0527f0f60751d7e`.
`.context/viewer-m5/baseline/` contains its actual CLI export; shell responses,
generated HTML hashes and 390×844 / 1440×1000 screenshots were captured before
extraction. `after/`, `acceptance.json`, logs and capture/comparison scripts retain
the measured result. No generated example files are tracked: this example uses
derived output. Milestones 1–4 and their review records remain byte-unmodified.

Both packages build with exact dependency `@mokly/viewer: "0.1.0"`. CLI producers
now import browser-safe DTOs/validators from their viewer owner; private controls,
watch, on-demand compilation and repository access stay in the CLI. The public
React/SSR entries and documented `./runtime` / `./data` boundaries are tested from
real tarballs. Source moves used `git mv`; split CSS modules concatenate to the
original bytes. Release configuration, workflows and the publish action are
unchanged for Milestone 6.

Measured export acceptance (uncompressed bytes):

- 1,162 baseline files → 1,169 files: seven added client modules, no removed paths
  except the content-addressed comparison generation relocation.
- All 180 shell HTML files (37,658,133 bytes) match exactly after replacing only
  the owned deployment id and comparison generation id with their new values.
  No markup, copy, geometry, stylesheet or frame-resource change is normalized.
- Standalone CSS remains **41,123 bytes**, SHA-256
  `b5456d7988b623a90ec1457511e6629524599617963711f6bcd2485a0fc96e5f`.
  Fonts and all 277 generated example HTML hashes match the baseline.
- All **608** comparison snapshot/resource files match byte-for-byte at their
  generation-relative paths. `review.json` grows 456,424 → 474,731 bytes solely
  because `changedPaths` records this extraction (178 → 590 paths). Its schema,
  classifications and other fields are identical. That changes the immutable
  generation id; browser-module changes also change deployment identity.
- Catalogue JSON remains 5,417,032 bytes, with only the two owned identities above
  differing. Ownership metadata grows 135,729 → 136,018 bytes for the seven module
  paths; its schema is unchanged. Upload schemas are unchanged.
- Browser inventory: **244,632 → 314,489 bytes** (+69,857), with 49 modules
  unchanged, 14 existing modules changed and seven added. The exact changes follow.
  The additional reader is used by Serve's update bridge; exports do not initiate
  that private transport. No React or hydration enters the standalone graph.
- Inspector stays **8,192 bytes** and byte-identical, SHA-256
  `72f6a1ddf8e23c0ed50901e51b279e1342e6039720b1bb18108aaaa38dc68128`.
- Local screenshots are visually identical, with raster differences confined to
  rounded edges: final mobile capture differs in 16 of 329,160 pixels (maximum
  channel delta 11), and desktop in seven of 1,440,000 (maximum delta one).
  Earlier captures varied between zero/several edge pixels, including an exact
  desktop match and six mobile pixels at delta one. This is not a pixel-exact
  acceptance claim. No pixels were edited or masked. The first capture hit a
  navigation timeout; a longer timeout passed.

All paths in this table are under `__mokly/client/`. Existing paths are retained;
the new module names and delivery behavior are documented in
[`mokly-export-delivery.md`](../docs/protocol/mokly-export-delivery.md).

| Module                     | Before |  After | Reason                                                                         |
| -------------------------- | -----: | -----: | ------------------------------------------------------------------------------ |
| `browse.js`                |  8,583 |    607 | CLI composition injects private services and starts the shared runtime.        |
| `browse_refresh.js`        |  1,794 |  2,738 | Lazy validated adoption with cancellation/navigation fences.                   |
| `browse_runtime.js`        |      0 |  8,612 | Extracted vanilla Browse controller and early native choice restoration.       |
| `browse_state.js`          |  6,641 |  6,739 | Retains early native choices after one-shot reload recovery.                   |
| `catalogue_updates.js`     |      0 | 58,646 | Public revision adoption with bundled browser-safe catalogue validation.       |
| `component_controls.js`    | 13,606 | 13,649 | Uses injected CLI control transport.                                           |
| `control_view_key.js`      |      0 |    146 | Shared pure control-view key helper.                                           |
| `diffs.js`                 | 30,301 | 30,346 | Optional embedding error callback; local behavior retained.                    |
| `early_disclosures.js`     |      0 |  1,791 | Temporary native disclosure capture, restoration and cleanup.                  |
| `frame_mount.js`           |  1,440 |  1,522 | Public cancellation of pending built-in mounts.                                |
| `inspector_tabs.js`        |  2,777 |  2,769 | Accepts the scoped viewer document.                                            |
| `navigation-resize.js`     |  4,335 |  9,103 | Disposable resize setup plus synchronous early disclosure capture/persistence. |
| `post_message_adapter.js`  |  6,622 |  6,788 | Honors optional mount cancellation.                                            |
| `same_origin_adapter.js`   |  9,707 |  9,937 | Mount cancellation and embedding overlay ownership.                            |
| `same_origin_highlight.js` |  5,537 |  5,578 | Appends overlays inside the embedded style scope.                              |
| `same_origin_mount.js`     |  5,879 |  6,092 | Pending mount cancellation and listener cleanup.                               |
| `services.js`              |      0 |    499 | Optional private-host capabilities and lazy revision-adopter loading.          |
| `workspace.js`             |  9,298 |  9,112 | Injected inspection/loading plus extracted workspace helpers.                  |
| `workspace_events.js`      |  1,661 |  1,653 | Uses the scoped viewer document.                                               |
| `workspace_inspection.js`  |      0 |  1,086 | Shared inspection/label/button helpers.                                        |
| `workspace_props.js`       |      0 |    625 | Shared real-props rendering helper.                                            |

Focused validation: **55 Node tests and 21 Chromium viewer tests passed**, with
zero skips. New regressions first reproduced invalid prop-selection crashes,
idle pick cancellation clearing an explicit highlight, and dropped shell
variant/fragment state. New assertions also cover every slot/event/handle,
strict replay, source cancellation/retry, independent roots, safe failures,
controlled round trips, same/cross-origin frames, default-variant events,
source/adapter replacement, host callback exceptions and inherited theming.
A test initially inspected an iframe `src` attribute rather than the actual
`location.replace` destination; it now verifies the loaded document URL. The
accent test similarly now checks documented variables and actual brand colors.

Existing browser test assertions remain unchanged. Import locations changed in
`component_geometry`, `css_screen_evidence`, `design_comparison_eligibility`,
`design_library`, `evidence_workspace`, `frame_adapter`, `same_origin_adapter`
and `review_failure_reload`; `component_design_fixture` uses the new DTO owner.
`frame_adapter_fixture` exposes real public catalogue data and its existing logical
links for embedding tests. `watch.spec.ts` is byte-unmodified. Existing large
legacy test bodies remain intact; all new viewer files and modified production
files are within the 300-line cap.

`review_failure_reload.spec.ts` additionally waits for the replacement document's
load event after observing its new server-rendered version. Its unchanged
assertions had clicked Overlay before the replacement module graph finished
loading (trace: click at 471,305 ms; new event-stream connection at 471,350 ms).
The full run passed 1,632 Node tests and 310/311 browsers; an independent rerun
reproduced this readiness race. The wait uses the actual load lifecycle, with no
sleep, timeout increase or relaxed assertions. This is a justified test-only
synchronization change; all five existing watch tests passed unchanged.
The corrected comparison-recovery test passed five consecutive independent runs
in 22.4 seconds before restarting the complete gate.

That restarted gate passed 1,632 Node tests and the corrected comparison test,
but finished with 310/311 browsers after an intermittent disclosure failure in
`watch.spec.ts` (duplicate titles across reloads). All five tests in that file
passed unchanged on the independent rerun in 25.6 seconds. The retained trace
shows the two native disclosure clicks overlapping the new document's live-state
restoration; the previous full run passed this case. No watch assertions or
timeouts were changed. The next full gate repeated that failure, as recorded below.

The disclosure failure repeated in that full run (again 310/311 browsers), so
an independent pass was not treated as sufficient. Its trace isolated delayed
live-state restoration behind the new eager catalogue-validator import. A new
browser regression first failed with validation unavailable during startup.
The CLI now loads the adopter through a lazy public runtime seam only after an
evidence response arrives, retaining cancellation/navigation checks after the
import. Initial live recovery no longer waits for validation code. The same
regression proves the validator is requested once on demand and evidence applies
without reloading. Six Node checks, the dynamic browser-graph package gate and
nine focused browser cases passed, including all five unchanged watch tests.

Repeated bootstrap/watch coverage then exposed a second startup window: native
summary clicks could precede deferred preference and reload restoration. A new
delayed-module regression failed before the fix. The synchronous bootstrap now
captures those native choices, reapplies them after either restoration, persists
them at load and removes its listeners/attributes on load or exit. Nested
interactive controls and prevented/non-primary clicks are excluded. This passed
34 focused Node tests and 21 browser cases (both bootstrap regressions plus all
five unchanged watch cases, repeated three times). The final cleanup assertions
also passed both bootstrap tests. The watch file remains byte-unmodified.

The first full gate passed 1,626 Node tests, dependency audit, formatting, lint,
typechecks/builds, example validation and every packed-consumer check. It was
deliberately interrupted during browsers after catalogue decoding on every asset
request made example cases take 24–38 seconds. Five regression cases first
reproduced the asset-path bug; assets now bypass catalogue decoding, and shell
requests cache only an unchanged validated serialized revision. The focused
follow-up passed 16 Node and nine unchanged browser tests (0.4–2.8 seconds per
browser case; 21.2 seconds total). The revision-cache test covers replacement,
invalid data rejection and recovery. This was a performance correction, not a
flaky-test retry.

The final `cargo xtask check` passed **1,632 Node tests**, **313 Chromium tests**,
**five packed-consumer scenarios** and **three Rust tests**, with no failures,
skips or retries. The Node suite took 424 seconds and Chromium 10.3 minutes.
All five unchanged watch tests, both startup regressions and the synchronized
comparison-recovery case passed in that complete run. Audit reported zero
vulnerabilities; formatting, ESLint, both TypeScript builds/typechecks, example
validation, package/inspector/browser-graph checks, Rust formatting, Clippy and
the eight-file Rust length audit passed. The tree stayed stable throughout.
The log is `.context/viewer-m5/xtask-check-final.log`.

Markdown validation checked 262 local links; the only missing targets are the two
inspector source links in the intentionally untouched historical Milestone 4
review. Every changed production file meets the 300-line cap. The rename-aware
diff against refreshed `origin/main` (`87daaa4`) has only two deletions:
`src/server/shell/css_chrome.ts` and `css_nav.ts`, whose content now lives in split
viewer modules and retains exactly the original concatenated CSS. Other source
relocations preserve history. No example sources, release configuration or
workflow files changed. Implementation commit `9ad564a` passed these checks and
was pushed before the review below; its remote tracking ref matches the commit.

### Milestone 5 post-push review

1. **P2 — Changing viewport leaves pick mode active without its visuals.**
   [frames.ts:68](../packages/viewer/src/viewer/frames.ts#L68) replaces frame
   sessions when the visible viewport/view changes, but `clear` does not end or
   reset the active `Picking` state. A browser probe started picking on Mobile,
   changed selection to Desktop, and observed the highlight-layer count drop
   from one to zero. Another `startPick()` resolved with zero layers and no new
   start event; no end event had fired. Doing nothing leaves the host believing
   that picking is active while the new frame has no pick mask or activation.
   **A (recommended):** make frame replacement a shared lifecycle boundary that
   ends active/pending picking exactly once and resets inspection state, using
   the documented navigation reason for a view transition. Add same-origin and
   postMessage regressions for viewport, scheme and variant changes, including
   pending activation. This closes the transition class rather than patching one
   toolbar handler. **B:** preserve picking across replacements and explicitly
   reactivate every replacement session before accepting clicks. That offers
   continuity but needs more cancellation/state coordination and a clarified
   event contract.

2. **P2 — A flow fragment is applied to every step.**
   [frames.ts:75](../packages/viewer/src/viewer/frames.ts#L75) assigns the global
   route fragment to every mounted frame, overriding the first-step-only rule
   already used by [public_stage.tsx:128](../packages/viewer/src/viewer/public_stage.tsx#L128)
   and the navigation contract. A browser probe navigated a two-step use case
   to `?fragment=example-anchor`; both frame document URLs acquired
   `#example-anchor`. Doing nothing can scroll later steps to an unrelated
   same-named anchor, making the embedded flow disagree with local Browse and
   the portable fallback. **A (recommended):** resolve per-frame fragment scope
   in one descriptor/URL boundary consumed by both markup and adapter mounting,
   with multi-step same/cross-origin regressions. The existing duplicated
   decisions have already diverged, so sharing this small rule is preferable to
   maintaining another conditional. **B:** guard the assignment with
   `stepIndex === undefined || stepIndex === 0` and add a focused regression;
   this fixes the immediate behavior but leaves the duplicate policy.

3. **P2 — Imperative highlighting loses the requested frame scope for labels.**
   [frames.ts:176](../packages/viewer/src/viewer/frames.ts#L176) stores only the
   instance key after highlighting the requested session; keys intentionally
   remain stable across viewports. [frame_labels.ts:53](../packages/viewer/src/viewer/frame_labels.ts#L53)
   then queries every session with that key. With Both visible, a browser probe
   highlighted the Mobile `action` instance and observed one Mobile mask but two
   `Action · action` label buttons, one on each viewport. Those buttons dispatch
   their respective frame's instance events. Doing nothing presents an
   unrequested Desktop selection target and makes labels disagree with the
   highlighted view. **A (recommended):** retain a typed, frame-scoped highlight
   request through mask, label and event rendering, distinguishing a public
   `InstanceRef` from the workspace's intentional multi-view key highlighting.
   Cover Both, schemes, variants and repeated flow steps across both adapters.
   This modest state-model change prevents scope from being lost in other
   inspection operations. **B:** retain the selected session separately and
   filter label queries to it; this is smaller but requires careful replacement
   invalidation and keeps parallel highlight-state representations.

The required prompt reviewed the complete **590-file** diff at
`9ad564abaeecba73833dd9fcee33028539fd00e0` using
`git diff origin/main...HEAD`, after the push, against `origin/main` (`87daaa4`).
The 592-file tip-to-tip inventory additionally includes pre-existing main-only
release metadata; no integration or release edits were made. Coverage included
source/instance capture, catalogue projection/validation, public Serve/watch and
comparison lifecycles, export ownership and schemas, package/tarball boundaries,
vanilla asset delivery, React source/selection/slot/handle lifecycle, frame
transports, tests, docs and the recorded byte evidence. Focused browser probes
retain their output in `.context/viewer-m5/review-probes.log` and
`review-scope-probe.log`. No implementation or test file changed during review.

The earlier Milestone 3 and 4 review records remain untouched. Their historical
reference, retention, fixed-geometry and overlay-style implementation findings
still await the user's decision. Required Milestone 5 delivery-status updates
supersede the earlier documentation-status observation without rewriting its
historical record. These three new recommendations also await that decision;
none was automatically fixed. Residual verification limits are Chromium-only
browser coverage, the recorded small screenshot raster differences, and zero
inspector budget headroom. The final complete gate remains green; these probes
identify missing behavioral coverage, not a failed gate that was ignored.
Milestone 6 and release automation remain outside this completed milestone.

## Milestone 6: Release preparation and verification

Prepare both packages to release together from the merge.

- [x] Configure release-please for two components, `@mokly/viewer` starting at
      `0.1.0` and the matching `@mokly/mokly` minor bump; update
      `npm-release.md`, publish action, and release fixtures.
- [x] Extend package checks and smoke tests to pack, install, and exercise
      both tarballs from a clean consumer.
- [ ] Run `cargo xtask check`; after it passes, `git add -A`, commit with
      Conventional Commits, and push the branch.
- [ ] After the push, use [the implementation review prompt](../docs/implementation-review-prompt.md)
      to review the complete local diff against `origin/main`; report
      numbered, severity-rated findings with options and recommendations
      without changing the implementation.

### Milestone 6 verification notes

Release preparation uses two Node components and a combined `node-workspace`
release PR with `updateAllPackages: true`. The viewer manifest starts at 0.0.0;
the feature bump produces its first 0.1.0 release. Independent versions use
`vX.Y.Z` and `viewer-vX.Y.Z` tags, and both tags must identify the same commit.
The CLI's exact viewer dependency and its root lockfile edge update together.

The original 0.9.0 pairing was already taken: read-only checks on 15 September
2026 found `v0.9.0` at `87daaa4` and npm `@mokly/mokly@0.9.0` as `latest`.
The four release-metadata changes from main are preserved, so the next feature
release is CLI 0.10.0 with viewer 0.1.0. No existing tag or published version is
reused. The version clarification was raised while independent work continued.
Viewer npm lookup returned E404; its first publication, organization permissions
and separate trusted publisher remain maintainer work after merge.

The 36 focused release/bootstrap/action tests pass with no skips or retries.
Three regressions were first red: missing manifest validation (two cases) and
rejection of viewer reports by the CLI-only registry guard. The new packed
archive tests additionally reject local dependency links, stale/ranged versions
and modified tarball bytes. Existing bootstrap and action coverage is retained.

`npm run package:check` and `npm run package:smoke` pass, including all five
clean-consumer scenarios and the production dependency audit. SSR renders both
the installed public fixture and the real CLI export; all five viewer entry
points resolve. A local rehearsal with the action's pinned release-please 17.6.0
engine produces one combined PR and real tag names for 0.10.0/0.1.0, a CLI-only
fix at 0.10.1/0.1.1, and a breaking feature at 0.11.0/0.2.0. Both manifests,
changelogs, dependency edges and workspace lock versions update together;
`npm ci --dry-run --ignore-scripts` accepts the rehearsed lockfile. The targeted
JSON updater covers the engine's root-lockfile dependency gap.

The CI workflow already invokes the root workspace build through typecheck and
the complete gate; no additional build step is needed. Four import-order lint
errors in the initial edits were fixed; lint, TypeScript and Markdown checks
pass. `cargo xtask check` passed on 15 September 2026: 1,643 Node tests,
313 Chromium tests and 3 Rust tests, with no failures, retries or skips. The
dependency audit reported zero vulnerabilities; formatting, lint, both package
typechecks/builds, example check, package checks, all five consumer smokes, Rust
formatting/Clippy and the eight-file Rust length audit passed. The example check
validated 278 derived/untracked files. Local tools were Node 24.14.1, npm 11.11.0
and Rust 1.98.1; the pinned CI toolchains remain unchanged.

The exact release-artifact path was also exercised: `scripts/release/pack.mjs`
packed both archives, and `scripts/package-smoke.mjs --artifacts` consumed those
same paths in all five scenarios. The inspector remains 8,192 bytes with SHA256
`72f6a1ddf8e23c0ed50901e51b279e1342e6039720b1bb18108aaaa38dc68128`.
No schema, export layout, inspector budget or viewer implementation changed in
this milestone. Evidence is retained under `.context/viewer-m6/` in
`xtask-check.log`, `focused-final.log`, `package-check.log`, `package-smoke.log`,
`exact-artifacts.log`, `rehearsal.log` and `rehearsed-ci.log`.

Earlier milestone verification notes and findings remain byte-unmodified.
Post-push review results will be recorded below.

## Post-merge follow-up (non-blocking)

- Merge the combined release-please PR for viewer 0.1.0 and CLI 0.10.0, checking
  exact pairing, lockfile, both changelogs and required CI. Complete the
  [viewer first publication](../docs/protocol/npm-bootstrap.md#viewer-first-publication)
  from its immutable tagged commit and configure its separate trusted publisher
  while the `npm` job awaits approval; verify both tag streams' protections.
- Verify and report both published versions, tags/commit, exact CLI dependency,
  tarball hashes/inventories, `latest` tags and signatures/provenance evidence.
  Record the interactive viewer bootstrap's lack of OIDC provenance explicitly.
- Smoke-test both published packages from a clean consumer: CLI export/build,
  all viewer public imports and SSR, then mount the viewer with the postMessage
  adapter against a published export on a second origin using its CORS contract.
- Close this plan in `plans/README.md` when the implementation PR merges;
  publication and the published-package smoke remain non-blocking follow-up.
