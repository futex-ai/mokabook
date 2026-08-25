# In-Frame Catalogue Link Navigation

**Status:** Active; protocol complete, implementation not started.

**Goal:** Make an explicit catalogue link activated inside a Mokabook fragment
navigate the outer Browse shell to the destination's canonical page, while
keeping that destination selected, expanded, and visible in the catalogue
tree.

**Protocol:** Implement the approved
[`docs/protocol/mokabook-navigation.md`](../docs/protocol/mokabook-navigation.md)
contract. The package and runtime protocols remain authoritative for portable
output, sandboxing, and progressive navigation.

**Architecture:** Preserve two representations of one logical link. Generated
HTML keeps its viewport- and color-scheme-compatible relative artifact `href`
for standalone and Review portability. Eligible native hyperlinks also carry a
reserved marker containing the stable entry id and optional fragment; a
`data-nav-href`-only reference stays inert metadata. Browse adapts only the
served/preview representation to `/id/<id>`, using a reserved `fragment` query
when an anchor must survive a server request. The parent client recognizes
marked links in same-origin, script-disabled frames, invokes the existing
latest-wins route transition for current-context navigation, and exclusively
handles validated new-context requests. Native user-activated top navigation
remains the no-JavaScript and failed-enhancement fallback only for default and
`_self` links. One client helper owns the invariant that the active navigation
row is selected, disclosed, filter-visible, and scrolled into view.

**Tech stack:** TypeScript ESM, React 19 static rendering, parse5, Node 22 test
runner through `tsx`, Playwright Chromium, the synthetic basic consumer, and
Rust `xtask` repository gates.

## Constraints And Design Decisions

- Promote only complete logical `mock:<id>[#fragment]` links. Never infer
  catalogue intent from a raw relative URL or visible label.
- Use the stable id route for Browse adaptation so renaming a catalogue route
  does not invalidate generated navigation intent.
- Carry a logical anchor through `/id` and `/view` as one percent-encoded
  `fragment` query value, then render it as an encoded hash on each target
  iframe source. Served Browse injects it server-side; static preview injects it
  progressively into current and light/dark swap sources and promises only
  page-level navigation without JavaScript.
- Keep the committed fragment bytes portable and adapt responses/copies
  without mutating their files on disk.
- Sanitize every served/preview public HTML copy, but trust and promote markers
  only on current-manifest screen fragments and generated legacy documents with
  package ownership headers matching their manifest `sourcePath`. Strip
  reserved-looking metadata from unowned HTML copies.
- Consumer scripts remain disabled. Browse may add only the sandbox abilities
  needed for trusted parent inspection and explicit user-activated top
  navigation, after its adapted HTML neutralizes every consumer-authored
  non-self/base target, including marked and download links. Review panes remain
  unchanged.
- Promote only an HTML `<a>`/`<area>` or SVG `<a>` whose `href` carried the
  logical destination. Continue rewriting and validating `data-nav-href`, but
  do not infer interaction semantics from that metadata alone.
- Default and `_self` catalogue links navigate the outer shell. Downloads stay
  portable/native; the adapter retains explicit non-self requests only in
  trusted inert metadata and gives them a popup-denied live target. Parent code
  handles those requests and modified activation against the canonical
  destination with `noopener` where a new context is opened. No-JavaScript
  new-context activation is intentionally unsupported.
- If search or Changed filtering hides the new active row, clear only the
  hiding constraint. Preserve those controls when the row is already visible.
- The selected-screen, active-navigation, and narrow-drawer visuals already
  exist in the approved Design catalogue. This change introduces no new visual
  treatment, so no mockup update is required. If implementation discovers a
  need for a pinned current row, warning, badge, or other new visible state,
  stop and add a tagged mockup milestone before changing the UI.
- Keep growing files short. Add focused client/server modules rather than
  extending `src/client/browse.ts`, `src/client/browse_state.ts`, or
  `src/server/http.ts` beyond their current near-300-line size.
- Treat any post-transform change to a logical-reference record as a contract
  failure: marker expectation, element namespace/native-link class, logical
  attribute names, and portable values remain one invariant.
- Use one exact pure target parser in server adaptation and parent enhancement;
  sanitize every `target` and `formtarget`, not a tag-name allowlist.
- Do not change Review-pane link behavior or enable consumer application
  scripts as part of this work.

## Milestone 0: Protocol And Plan Baseline

Summary: establish a complete behavioral contract and an indexed implementation
plan before changing generated output or runtime behavior.

- [x] Add `docs/protocol/mokabook-navigation.md` covering logical-link
      classification, portable output, Browse adaptation, native fallback,
      sandbox limits, fragments, active-tree visibility, and verification.
- [x] Align the package, runtime, shell-design, build-pipeline, and package
      boundary docs with the new navigation ownership.
- [x] Confirm that existing selected-screen and navigation mockups already
      specify the required final pixels and record the no-new-visual-state
      decision.
- [x] Create this plan and list it in `plans/README.md` under Active.

At completion, the protocol is internally consistent and implementation can
proceed without inventing product behavior.

## Milestone 0A: Post-Review Contract Corrections

Summary: resolve every finding from the first post-push review without
reopening the completed protocol baseline milestone.

- [x] Replace top-level hash transport with a request-visible `fragment` query,
      define its grammar and cross-view anchor validation, and specify iframe
      hash rendering.
- [x] Keep `allow-popups` forbidden and assign modified/non-self activation
      exclusively to trusted parent enhancement.
- [x] Mark build, package, runtime, shell, and architecture passages as planned
      wherever the current implementation does not yet provide link markers or
      outer frame navigation.
- [x] Move Review compatibility coverage into the marker milestone and add a
      watched-serve lifecycle regression to the server milestone.

At completion, the approved contract and implementation plan incorporate all
five initial review recommendations.

## Milestone 0B: Security And Preview Corrections

Summary: incorporate every valid finding from the second review pass before
implementation begins.

- [x] Scope server-rendered fragment injection to served Browse and define the
      enhanced and JavaScript-disabled behavior of the static preview.
- [x] Require Browse-response sanitization of unmarked top targets and base
      targets before granting user-activated top-navigation permission.
- [x] Bind compatibility validation to complete marker-and-portable-attribute
      records rather than marker values alone.
- [x] Clarify target protocol status and use the optional-fragment grammar in
      the package and build-pipeline contracts.

At completion, the plan closes all four second-pass review findings without
adding dynamic preview infrastructure.

## Milestone 0C: Activation And Target Corrections

Summary: close the native-link and top-target gaps found by the third review
pass before implementation begins.

- [x] Limit Browse activation to native HTML `a`/`area` and SVG `a` elements
      whose logical destination came from `href`; keep `data-nav-href`-only
      records as portable metadata.
- [x] Neutralize every consumer-authored non-self and base target, including
      marked, download, and named targets, retaining eligible explicit requests
      only in adapter-produced inert metadata for trusted parent handling.
- [x] Add failure-first coverage for metadata-only records, marked top/parent
      targets, matching named contexts, target keyword casing, spoofed target
      metadata, and download targets to the implementation milestones.

At completion, no logical metadata becomes an invented interaction and no
consumer-authored target can bypass parent-owned navigation.

## Milestone 0D: Ownership, Swap, And Parser Corrections

Summary: close every generated-ownership, preview-state, and target-parser gap
found by the fourth review pass.

- [x] Gate marker promotion to current-manifest generated documents while
      requiring their ownership headers, sanitizing all public HTML, and
      removing reserved metadata from unowned copies.
- [x] Require static-preview fragments on current plus light/dark swap sources,
      scoped to the first use-case step and retained through scheme changes.
- [x] Define one strict local target grammar and extend sanitization to HTML,
      SVG, every `target`, and every `formtarget` attribute.

At completion, marker trust follows generated ownership, preview anchors are
durable, and the sandbox sanitizer has one testable parsing boundary.

## Milestone 1: Portable Logical-Link Identity

Summary: generated documents retain stable catalogue intent alongside their
existing portable artifact links; Browse behavior is not activated yet.

- [ ] Before implementation, fetch `origin/main`, capture the unrevised source
      tip and its merge base, audit `base..origin/main` additions, and record
      the immutable values under `.context/` for the final preservation audit.
- [ ] Add failure-first cases to `tests/build_links.test.ts` for a reserved
      `data-mokabook-link` marker on `MockLink` and raw `mock:` hrefs in HTML
      anchors/areas and SVG anchors; prove a `data-nav-href`-only span remains
      marker-free, and cover both attribute orders on one eligible link.
- [ ] Cover screen and use-case ids, optional target fragments, mobile and
      desktop output, dark-to-dark resolution, dark-to-light fallback, exact
      fragment grammar, and the requirement that a target anchor exists in
      every generated destination view Browse can show.
- [ ] Add failure-first cases for a consumer-authored reserved marker,
      different logical destinations on one element, unknown ids, collection
      ids, malformed fragments, and compatibility transformers that add/remove
      a marker, change element namespace/native-link class, or change/remove
      only its portable `href`/`data-nav-href`.
- [ ] Extend `src/build/mock_links.ts` with typed logical-target parsing and
      deterministic marker insertion for eligible HTML `a`/`area` and SVG `a`
      hrefs while preserving the byte-targeted rewrite and portable relative
      URL for every supported navigation attribute.
- [ ] Validate one logical destination per element and reserve the marker from
      consumer output. Keep raw relative, external, asset, and same-document
      links marker-free.
- [ ] Preserve and validate a multiset of complete logical-reference records
      across `transformCompatibilityDocuments`: expected marker presence and
      value, namespace/native-link class, logical attribute names, and their
      exact resolved portable values. Fail through the existing typed
      `MokabookError` contract on divergence.
- [ ] Ensure HTML/resource validation ignores the inert marker as a URL while
      continuing to validate the rewritten `href` and `data-nav-href`.
- [ ] Add Review artifact and served Review regressions proving marker-bearing
      portable pane documents remain byte-unmodified, retain relative links,
      receive no Browse adaptation, and stay inside the existing strict
      sandbox.
- [ ] Run the focused link and compatibility tests with
      `npm run build && npx tsx --test tests/build_links.test.ts tests/compatibility.test.ts`.
- [ ] Run the focused Review regressions in `tests/review_safety.test.ts` and
      `tests/server_review.test.ts` before marking marker output complete.
- [ ] Regenerate and check
      `examples/basic/generated/**` with `npm run example:build` and
      `npm run example:check`.

At completion, every explicit catalogue link has portable fallback bytes and
stable, validated identity, while all existing Browse and Review pages remain
functional.

## Milestone 2: Safe Browse Adaptation And Native Fallback

Summary: served and preview copies gain canonical marked links while the same
adapter closes every consumer-authored route to iframe-wide top navigation.

- [ ] Add failure-first adapter/server tests for canonical id destinations,
      default/empty/`_self` outer targeting, explicit target metadata and safe
      live targets, download exclusion, malformed trusted markers, metadata-only
      references, manifest-owned fragments/legacy pages, and unowned HTML with
      reserved-looking metadata plus `_top`; fail closed when a trusted route
      loses or swaps its generated source header, or its marker and expected
      portable href diverge.
- [ ] Add security cases for unmarked external, raw relative, same-document,
      `_top`, `_parent`, HTML/SVG anchors and areas, `<base target>`, forms and
      `formtarget`, plus marked targets, mixed-case keywords, matching names,
      whitespace/control and invalid values, spoofed `data-mokabook-target`, and
      `download target="_top"`; retain `<base href>` and prove only a validated
      default/`_self` link can target the shell.
- [ ] Add table-driven unit tests for the shared typed target parser: absent,
      empty, keyword casing, safe named grammar, case preservation, whitespace,
      controls, leading underscore, and punctuation outside the allowlist.
- [ ] Create one typed Browse-document adapter that validates markers against
      `Catalogue` and a manifest route-to-source map, strips reserved metadata
      from unowned HTML, verifies the matching ownership header and a trusted
      marker's exact view-relative portable href before rewriting it, removes
      base targets, sanitizes all target/formtarget attributes with the shared
      parser, derives trusted target metadata, and never mutates disk.
- [ ] Extract `/static/` serving from the over-target `src/server/http.ts` and
      adapt every HTML response below `/static/` while preserving HEAD, content
      type, confinement, ownership, and non-HTML bytes.
- [ ] Enable same-origin inspection and user-activated top navigation on Browse
      frames only after the sanitizer is installed. Keep script, form, popup,
      download, automatic-top-navigation, and every Review permission unchanged.
- [ ] In served Browse, carry exactly one encoded `fragment` query through
      `/id` and `/view`; decode once, validate grammar and cross-view anchors,
      return HTTP 400 on failure, and render encoded iframe hashes through
      scheme swaps or the first use-case step.
- [ ] Reuse the adapter while building `.context/mokabook-preview`, preserving
      extensionless Cloudflare routes and queries, sanitizing unowned HTML
      copies, and failing the build for invalid trusted markers without claiming
      static request-time validation or injection.
- [ ] Test served JavaScript-disabled default/`_self` navigation and anchors.
      Test that JavaScript-disabled preview reaches the canonical page without
      promising anchor scroll, and that neither environment grants popups.
- [ ] Add a watched-serve regression that changes a `MockLink` destination or
      route, waits for reload, verifies the latest manifest/HTML is used, and
      proves shutdown leaves no orphan child.
- [ ] Run focused server/preview tests, `npm run preview:build`, watched and
      no-watch Serve smoke tests, and a query-preserving
      `wrangler pages dev` preview smoke test without orphan processes.

At completion, native served fallback is functional and secure, static preview
degradation is explicit, and the UI milestone can inspect sanitized frames.

## Milestone 3: Outer Navigation And Active-Tree UI

Tags: ui

Summary: ordinary activation inside a fragment uses the existing progressive
outer route transition, and every outer route change reveals its catalogue row.
No backend response transformation is included in this milestone.

- [ ] Add failure-first client tests in new focused test files for frame-link
      candidate classification, event-source validation, primary and keyboard
      activation, modified activation, explicit target handling, latest-wins
      delegation, inaccessible/cross-origin frame fallback, and unchanged
      unmarked/download/external/hash/metadata-only behavior.
- [ ] Extract navigation candidate/sequencing code from
      `src/client/browse.ts` into a focused module before adding frame behavior;
      keep imports and public internal test seams typed.
- [ ] Add a frame-navigation module that attaches on initial load, scheme
      swaps, flow frames, legacy embeds, and progressively installed views. It
      must read only validated `data-mokabook-link` markers and delegate to the
      outer route navigator through `/id/<id>`.
- [ ] For a validated modified activation or explicit non-self target, have
      package-owned parent code read only adapter-produced target metadata,
      route `_top`/`_parent` through the outer transition, and open new or named
      contexts with `noopener`; never delegate popup creation to frame content.
- [ ] In a static preview, read and grammar-check the reserved `fragment` query
      in parent code; apply encoded hashes to `src`, `data-fragment-light`, and
      `data-fragment-dark` on every current screen frame or only the first
      use-case step; and fail closed without interpreting it as a selector.
- [ ] Extract catalogue-tree client state from the near-limit
      `browse_state.ts` into a focused navigation module. Replace
      `markActiveRow` with one `selectAndRevealRoute` operation used by primary
      navigation, Back, Forward, and initial enhancement.
- [ ] Make `selectAndRevealRoute` mark exactly one row, open only its ancestor
      collections, clear only a hiding query/filter, reapply visibility, and
      call `scrollIntoView({ block: "nearest" })`. Close the responsive drawer
      after selection without collapsing the destination path.
- [ ] Preserve viewport, color scheme, details disclosure, history scroll,
      focus/status behavior, and frame-collapse behavior across the new route
      transition.
- [ ] Add Playwright regressions in a new
      `tests/browser/browse_navigation.spec.ts` that click `MockLink` from the
      mobile frame, desktop frame, and use-case step; assert the outer URL,
      heading, breadcrumbs, active row, disclosed ancestors, Back/Forward, and
      preserved shell state.
- [ ] In the same spec, prove modified and explicit non-self activation opens
      the canonical Mokabook page through parent enhancement, while the iframe
      sandbox still lacks popup and script permissions.
- [ ] Add static-preview coverage that follows a fragment link, toggles light
      and dark, and proves the current source and every swap source retain the
      encoded hash; cover first-step-only use-case behavior.
- [ ] Cover an active destination initially hidden by search and Changed,
      plus a destination already visible so unrelated user state is retained.
- [ ] Run the focused client tests and navigation Playwright spec after
      `npm run build`; run the existing `tests/browser/browse.spec.ts` to catch
      regressions in the persistent shell.

At completion, JavaScript-enabled Browse navigation, including trusted
new-context activation, is coherent and the active catalogue entry is always
visible. Served native fallback and static-preview degradation remain as
established by Milestone 2.

## Milestone 4: Documentation, Verification, And Handoff

Summary: align public guidance with the shipped behavior, prove every affected
boundary, and deliver one reviewed pushed commit without automatically changing
post-push review findings.

- [ ] Update `README.md` and `examples/basic/README.md` so `MockLink` documents
      both portable generated behavior and canonical Browse navigation. Update
      the navigation protocol and nearby architecture docs for any behavior
      clarified during implementation; remove contradictions rather than
      appending exceptions. Mark the navigation contract implemented and
      remove its temporary delivery-status gap only after the behavior passes.
- [ ] Review `examples/basic/notes.md` and the Design catalogue against the
      final implementation. If pixels changed despite the constraint above,
      stop, add a new `Tags: mockup` milestone before a new `Tags: ui`
      milestone, and complete them in that order.
- [ ] Run `npm run format:check`, `npm run lint`, `npm run typecheck`, focused
      tests, `npm test`, `npm run example:check`, `npm run package:check`,
      `npm run package:smoke`, `npm run test:browser`, and the relevant manual
      server/preview smoke paths.
- [ ] Run the authoritative `cargo xtask check` and continue fixing compile,
      lint, test, generated-output, packaging, or browser failures until the
      complete gate passes.
- [ ] Fetch `origin/main` and perform the required mainline-preservation audit
      from the captured pre-integration source tip. Inspect
      `git diff --name-status origin/main`, the deletion-only diff, the full
      patch, and `git diff --check`; stop for approval before any unplanned
      mainline removal.
- [ ] Update this plan's TODOs and move its link from Active to Completed in
      `plans/README.md` only after every implementation and verification item
      is complete.
- [ ] Run `git add -A`, verify every new file is tracked, commit the complete
      work with a Conventional Commit title of at most 50 characters, inspect
      `git diff --name-status origin/main..HEAD` and the deletion-only diff,
      then push the current branch without renaming it.
- [ ] Only after the push, run `cargo xtask review`. Do not automatically fix
      findings. Report every finding as a numbered item with severity,
      codebase/feature context, impact of doing nothing, lettered solution
      options, and a recommended option that considers whether a broader test,
      rule, lint, abstraction, or architectural change would prevent the class
      of issue from recurring.

At completion, all tests and `cargo xtask check` pass, the branch is committed
and pushed, the post-push review has inspected the complete diff against
`origin/main`, and the user has the findings needed to choose any follow-up.
