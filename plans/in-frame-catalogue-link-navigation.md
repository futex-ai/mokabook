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
for standalone and Review portability, plus a reserved marker containing the
stable entry id and optional fragment. Browse adapts only the served/preview
representation to `/id/<id>`, using a reserved `fragment` query when an anchor
must survive a server request. The parent client recognizes marked links in
same-origin, script-disabled frames, invokes the existing latest-wins route
transition for current-context navigation, and exclusively handles validated
new-context requests. Native user-activated top navigation remains the
no-JavaScript and failed-enhancement fallback only for default and `_self`
links. One client helper owns the invariant that the active navigation row is
selected, disclosed, filter-visible, and scrolled into view.

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
  iframe source. A top-level hash cannot be the server-visible transport.
- Keep the committed fragment bytes portable and adapt responses/copies
  without mutating their files on disk.
- Consumer scripts remain disabled. Browse may add only the sandbox abilities
  needed for trusted parent inspection and explicit user-activated top
  navigation; Review panes remain unchanged.
- Default and `_self` catalogue links navigate the outer shell. Downloads stay
  portable/native; trusted parent code handles explicit non-self targets and
  modified activation against the adapted canonical destination with
  `noopener`. No-JavaScript new-context activation is intentionally unsupported
  rather than granting iframe popup permission.
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
- Treat a missing marker after the compatibility transformer as a contract
  failure; consumer compatibility code may not erase or change reserved
  logical-link identity.
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

## Milestone 1: Portable Logical-Link Identity

Summary: generated documents retain stable catalogue intent alongside their
existing portable artifact links; Browse behavior is not activated yet.

- [ ] Before implementation, fetch `origin/main`, capture the unrevised source
      tip and its merge base, audit `base..origin/main` additions, and record
      the immutable values under `.context/` for the final preservation audit.
- [ ] Add failure-first cases to `tests/build_links.test.ts` for a reserved
      `data-mokabook-link` marker on `MockLink`, raw `mock:` hrefs, and
      `data-nav-href`, including both attribute orders on one anchor.
- [ ] Cover screen and use-case ids, optional target fragments, mobile and
      desktop output, dark-to-dark resolution, dark-to-light fallback, exact
      fragment grammar, and the requirement that a target anchor exists in
      every generated destination view Browse can show.
- [ ] Add failure-first cases for a consumer-authored reserved marker,
      different logical destinations on one element, unknown ids, collection
      ids, malformed fragments, and a compatibility transformer that removes
      or changes a marker.
- [ ] Extend `src/build/mock_links.ts` with typed logical-target parsing and
      deterministic marker insertion while preserving the existing
      byte-targeted attribute rewrite and portable relative URL.
- [ ] Validate one logical destination per element and reserve the marker from
      consumer output. Keep raw relative, external, asset, and same-document
      links marker-free.
- [ ] Preserve and validate the expected marker multiset across
      `transformCompatibilityDocuments`; fail with the existing typed
      `MokabookError` contract when compatibility output violates it.
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

## Milestone 2: Outer Navigation And Active-Tree UI

Tags: ui

Summary: ordinary activation inside a fragment uses the existing progressive
outer route transition, and every outer route change reveals its catalogue row.
No backend response transformation is included in this milestone.

- [ ] Add failure-first client tests in new focused test files for frame-link
      candidate classification, event-source validation, primary and keyboard
      activation, modified activation, explicit target handling, latest-wins
      delegation, inaccessible/cross-origin frame fallback, and unchanged
      unmarked/download/external/hash behavior.
- [ ] Extract navigation candidate/sequencing code from
      `src/client/browse.ts` into a focused module before adding frame behavior;
      keep imports and public internal test seams typed.
- [ ] Add a frame-navigation module that attaches on initial load, scheme
      swaps, flow frames, legacy embeds, and progressively installed views. It
      must read only validated `data-mokabook-link` markers and delegate to the
      outer route navigator through `/id/<id>`.
- [ ] For a validated modified activation or explicit non-self target, have
      package-owned parent code open the canonical Mokabook URL in the requested
      context with `noopener`; never delegate popup creation to frame content.
- [ ] Update Browse iframe sandbox markup to permit same-origin parent
      inspection and top navigation by explicit user activation only. Do not
      add script, form, popup, download, or automatic top-navigation tokens;
      keep Review iframe sandbox markup unchanged.
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
- [ ] Cover an active destination initially hidden by search and Changed,
      plus a destination already visible so unrelated user state is retained.
- [ ] Run the focused client tests and navigation Playwright spec after
      `npm run build`; run the existing `tests/browser/browse.spec.ts` to catch
      regressions in the persistent shell.

At completion, JavaScript-enabled Browse navigation, including trusted
new-context activation, is coherent and the active catalogue entry is always
visible. Portable/no-JavaScript links still retain their pre-existing fragment
fallback until Milestone 3.

## Milestone 3: Served And Preview Native Fallback

Summary: the development server and deployed preview adapt marked links to
canonical outer routes, completing direct and JavaScript-disabled default/self
behavior without changing committed or Review documents.

- [ ] Add failure-first pure/server tests in new focused files for adapting a
      marked anchor to `/id/<encoded-id>[?fragment=<encoded-fragment>]`,
      default/`_self` top targeting, explicit target preservation for parent
      enhancement, download exclusion, unknown/malformed marker rejection, and
      unchanged unmarked HTML.
- [ ] Create a typed Browse-document adapter that parses HTML, validates ids
      against `Catalogue`, rewrites only marked anchors, preserves safe
      attributes, and returns deterministic bytes without modifying disk.
- [ ] Extract static-file serving from the over-target `src/server/http.ts`
      into a focused server module and apply the adapter only to Browse HTML
      responses beneath `/static/`. Preserve HEAD, content type, confinement,
      generated ownership, and non-HTML byte behavior.
- [ ] Carry a validated optional logical fragment as exactly one percent-encoded
      `fragment` query through `/id/<id>` and the canonical `/view/<route>`
      response. Decode once, enforce the documented grammar and cross-view
      anchor existence, return HTTP 400 for invalid input, and apply the value
      as an encoded hash to every screen source (including scheme swaps) or only
      the first use-case step.
- [ ] Reuse the same adapter from `scripts/preview/build.mjs` when copying HTML
      into `.context/mokabook-preview`; do not duplicate a regex-only second
      implementation. Keep Cloudflare extensionless route rewriting and id
      redirects intact.
- [ ] Add JavaScript-disabled Playwright coverage proving default and `_self`
      links navigate the top page and request-visible fragments reach the
      target iframe anchor. Assert popup capability remains absent; do not
      promise modified or non-self fallback without parent enhancement.
- [ ] Extend `tests/preview.test.ts` to assert adapted static fragment links,
      stable `/id` targets, optional fragments, and absence of mutations in
      `examples/basic/generated/**` after preview creation.
- [ ] Add a watched-serve regression that changes a `MockLink` destination id
      or route, waits for rebuild and reload, and proves `/static/` adaptation
      uses the latest manifest without stale transformed HTML or orphaned child
      processes.
- [ ] Run focused server/preview tests, `npm run preview:build`, and the full
      navigation browser spec. Smoke-test watched `mokabook serve`,
      `mokabook serve --no-watch`, and the generated preview through an HTTP
      server.

At completion, local Browse, deployed Browse, JavaScript-enabled navigation,
safe default/self native fallback, and optional fragments share one canonical
destination contract.

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
