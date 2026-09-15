# Mokly Viewer Library

Extract Browse into a separately published `@mokly/viewer` React package that
Mokly Cloud can mount around cross-origin screen frames, and promote the public
contracts it depends on: component-instance identity, a versioned catalogue read
model, the viewer API, and a frame adapter with an embedded inspector script.
The cloud consumes only published npm packages and documented export artifacts;
this repository gains no cloud-specific mode, flag, or branch.

Milestones follow the requested order. Each protocol document is discussed and
confirmed with the user before its implementation milestone starts, and work
stops for review after every milestone. No new product screens are designed:
the viewer renders the existing shell design unchanged and pick mode reuses the
Highlight components visuals, so no mockup milestone is planned. If a genuine
visual gap appears, add a `Tags: mockup` milestone before the affected UI work.

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

1. **Instance key format is unchanged.** The existing digest already satisfies
   the stability rule: it changes only when the instance's `moklyInstance` id,
   its owning entry or parent instance key, or its receiving slot changes.
   Prop edits and sibling reordering keep the key. Duplicate ids in one scope
   remain a build error.
2. **Resolution states** are computed from records only: `present` (same key,
   same `propsKey`, same `order`, same slot), `moved` (same key, different
   `propsKey`, `order`, or range placement), `missing` (key absent). Resolution
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

## Milestone 1: Protocol documentation

Define every contract before code. Each document is shared with the user and
confirmed before the milestone that implements it; later milestones re-open a
doc only to record confirmed clarifications.

- [ ] Add `docs/protocol/mokly-instances.md`: key derivation and preimage,
      stability rule with an explicit list of edits that change or keep a key,
      resolution states and algorithm, optional `source` location fields and
      the build-step proposal, DOM marker attribute names, comment token
      format, and the one-start/one-end-pair-per-view guarantee.
- [ ] Stop and confirm the instance contract with the user.
- [ ] Add `docs/protocol/mokly-catalogue.md`: `__mokly/catalogue.json` shape
      with `schemaVersion: 1`, projection rules from manifest v5, omitted
      private fields, Changes state per entry, `review.json` pointer,
      additive-versus-breaking versioning, Serve availability, and same-origin
      and cross-origin fetch rules (public paths, required CORS and
      `nosniff` headers, no credentials).
- [ ] Stop and confirm the catalogue contract with the user.
- [ ] Add `docs/protocol/mokly-viewer.md`: `<MoklyViewer>` props, catalogue
      sources (object, URL, fetcher), controlled and uncontrolled selection,
      rendered feature inventory cross-referenced to `mokly-runtime.md`,
      slots, events, imperative handle, CSS variable prefix and theming
      boundary, SSR requirement, and host-independence constraints (no host
      knowledge, no network beyond the source, no cookies, no `window.top`).
- [ ] Add `docs/protocol/mokly-frame-adapter.md`: `FrameAdapter` interface,
      `sameOriginAdapter` behavior, `postMessageAdapter` and inspector script
      protocol (`mokly-inspector` channel, version 1, handshake, nonce, exact
      origins, `event.source` check, bounded discriminated message shapes with
      unknown keys rejected, keys and boxes only, in-frame overlay, no
      top-window effects), the query-parameter host-origin rule, inertness
      without a handshake, and the script size budget.
- [ ] Stop and confirm the viewer and frame-adapter contracts with the user.
- [ ] Update overlapping docs: `mokly-export.md` (new public files, the
      Mokly-owned inspector script versus unchanged consumer content, the
      viewer package as a public API), `mokly-export-delivery.md` (routes
      table, cross-origin headers, sandbox attributes), `mokly-source-protection.md`
      (public read model beside the private manifest), `mokly-component-manifest.md`
      (optional `source` field), `mokly-component-explorer.md` and
      `mokly-navigation.md` (frame boundary through the adapter),
      `mokly-runtime.md` (Browse is the viewer), and `docs/protocol/README.md`.
- [ ] Update `docs/architecture/package-boundary.md`, the root README, and
      `plans/README.md`; validate Markdown with Prettier and review the diff.
- [ ] Commit and push the documentation, then stop for review.

## Milestone 2: Instance identity implementation

Deliver the confirmed instance contract in the renderer, manifest, and tests
while keeping generated output for unchanged catalogues byte-identical apart
from the new optional field.

- [ ] Add failing tests for key stability across prop edits, reorders,
      id changes, and re-parenting, plus resolution fixtures for `present`,
      `moved`, and `missing`.
- [ ] Add a pure, exported instance resolution function under
      `src/components` with typed inputs from `ComponentInstanceRecord`.
- [ ] Implement the confirmed source-location capture: esbuild `jsxDev`
      setting, the Mokly dev-runtime shim in the consumer React plugin,
      wrapper stripping, repo-relative path normalization, and rejection of
      absolute or escaping paths.
- [ ] Extend manifest v5 validation and serialization with the optional
      `source` field; keep historical readers accepting records without it.
- [ ] Exclude `source` from `propsKey`, change attribution, and the Changes
      calculation; add regression tests proving line shifts are not material.
- [ ] Add a marker conformance test: every instance in each view has exactly
      one matched start/end comment pair in the rendered document.
- [ ] Regenerate the example catalogue, run relevant tests and
      `cargo xtask check`, update READMEs, commit, push, and stop for review.

## Milestone 3: Catalogue read model implementation

Write and serve the confirmed read model from the same projection code.

- [ ] Add failing tests for projection shape, omitted private fields,
      deterministic serialization, schema-version fixture, and rejection of
      absolute paths or manifest-internal data.
- [ ] Implement the projection module under `src/catalogue` behind a typed
      interface shared by Serve and export; add public fixtures under
      `docs/protocol/fixtures`.
- [ ] Export writes `__mokly/catalogue.json` through the normal stage,
      inventory, collision, and deployment-identity flow; Serve serves it at
      the same path and refreshes it on watched updates.
- [ ] Add cross-origin fetch coverage: a static fixture server sending the
      documented headers and a browser test fetching the read model from a
      second origin.
- [ ] Verify upload archives and ownership inventories include the file
      without schema changes; update packed-consumer and release fixtures.
- [ ] Update READMEs, run relevant tests and `cargo xtask check`, commit,
      push, and stop for review.

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
