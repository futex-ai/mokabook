# Mokabook Dependency Patch Upstreaming

## Summary

The juno repository carries `ts/patches/mokabook+0.8.0.patch` against the
published Mokabook 0.8.0 runtime. None of its three fixes exist on Mokly
`main` at 0.9.0, so every consumer upgrade must re-carry the patch. This plan
lands equivalent behaviour in Mokly, using the recommended option for each
hunk, so the consumer patch can be deleted on the next upgrade:

1. Affected-usage deduplication in the workspace shell is quadratic in
   serialisations and exhausts the default Node heap on large catalogues.
2. Developer files such as `README.md` and `tsconfig*.json` inside
   `mockupsDir` are published as public assets, served by Serve, and reported
   as content changes. Fix with a configurable public-exclusion list that
   ships sensible defaults, and change the documented starting layout so
   source and output are siblings.
3. The live-controls endpoint rejects every request whose Host port differs
   from the socket port, which breaks Serve behind port forwarding.

Backend, documentation, and tooling only; no mockup or UI work.

Protocol owners: [source protection](../docs/protocol/mokly-source-protection.md)
and [package contract](../docs/protocol/mokly-package.md) for the exclusion
list and layout guidance; [component controls](../docs/protocol/mokly-component-controls.md)
for Host validation; [live evidence](../docs/protocol/mokly-live-evidence.md)
and [component workspace design](../docs/protocol/mokly-component-workspace-design.md)
for affected-usage identity and ordering.

## Milestone 1: Documentation and protocol contract (completed)

Define every contract that the later milestones implement so no guesswork
remains.

- [x] In `docs/protocol/mokly-source-protection.md`, add a "Public
      exclusions" section: a config-owned list of repository-relative POSIX
      globs, matched against a public candidate's path relative to
      `mockupsDir` and against its realpath alias, evaluated inside the one
      shared source-classification policy so HTTP, generated-resource
      validation, Review reads, static publication, and change classification
      agree. State the shipped defaults (`**/README`, `**/README.*`,
      `**/readme.*` case-insensitively, `**/tsconfig.json`,
      `**/tsconfig.*.json`), that consumer globs extend rather than replace the
      defaults, that an exclusion cannot make a manifest or `.mokly-cache/`
      path public, and that excluded files are not authoring inputs and do
      not join `sourceFiles`. Note that a generated route colliding with an
      excluded name fails validation with its referring route, mirroring the
      existing reserved-basename rule.
- [x] In `docs/protocol/mokly-package.md`, document the `publicExclude`
      config field (optional `readonly string[]`, validated as safe
      repository-relative glob strings), the defaults, and the recommended
      sibling layout (`docs/mockups/entries`, `docs/mockups/generated`,
      `docs/mockups/renderer.tsx`). Keep the statement that nested
      `docs/mockups/src` layouts remain supported.
- [x] In `docs/protocol/mokly-component-controls.md`, replace "validated Host"
      with the precise rule: Host must be `localhost` or `127.0.0.1` followed
      by a decimal port between 1 and 65535 with no leading zero; the port
      need not equal the listening socket port because forwarded local ports
      are supported. Origin must equal `http://` plus that Host exactly, and
      the render token is still required on POST. Non-loopback hosts and
      forwarded headers (`x-forwarded-*`) grant nothing.
- [x] In `docs/protocol/mokly-live-evidence.md` (or the workspace design doc
      if it is the better owner), state the affected-usage identity: two
      usage links are duplicates when every serialised field matches; the
      first occurrence in evidence order is kept; deduplication performs at
      most one serialisation per usage link.
- [x] Update `README.md`: change both config examples to the sibling layout,
      add one sentence under Configuration explaining that everything below
      `mockupsDir` is public unless protected, list `publicExclude` and its
      defaults in the configuration bullets, and mention forwarded-port
      support in the Serve section.
- [x] Update `src/export/README.md` and `src/server/README.md` for the
      exclusion policy and the Host rule.
- [x] Add this plan to `plans/README.md` (done at creation) and validate the
      changed Markdown.

## Milestone 2: Affected-usage deduplication (completed)

Make the workspace usage list linear in serialisations without changing
identity, order, or comparison membership.

- [x] Add a failing test in `tests/component_workspace.test.ts` (or a new
      `tests/component_workspace_dedup.test.ts`) that builds an affected list
      with duplicates across viewport, colour scheme, variant, and ownership,
      asserts first-occurrence order is preserved and distinct contexts are
      retained, and asserts the serialisation count is bounded to one per
      usage by wrapping `JSON.stringify` or by injecting a counting key
      function.
- [x] Extract the deduplication in `src/server/shell/workspace_data.ts` into
      a small pure helper (for example `dedupeUsageLinks(links)`) that keeps
      a `Set` of serialised keys, and use it at the `affected` site.
- [x] Measure the large fixture export before and after the change with
      `npm run fixture:large` and `npm run benchmark:large`; record the
      observation in this plan. Outcome: the dedup regression drops from 800
      to 40 serialisations for 40 links, but the synthetic large fixture
      export exhausts the default heap both before and after, so its failure
      has a separate cause. That investigation is recorded under post-merge
      follow-up because it is not part of the consumer patch being upstreamed.

### Session verification notes

- Initial `npm run fixture:large` could not find `tsc`; `npm ci` installed the
  locked dependencies successfully (0 audit vulnerabilities), then fixture setup
  succeeded with 1,410 routes and 5,550 documents.
- Before implementation, the deduplication regression passed identity/order checks
  but failed its bound: 800 serializations for 40 usage links. After the fix it
  reports 40 for 40; the focused suite passes all 23 tests.
- Node v24.14.1 reports a default heap limit of 4,496,293,888 bytes. No
  `--max-old-space-size` override was used. Before the fix, cold/warm benchmark
  startup passed at 3,631/3,450 ms (Changes ready at 117,904/118,202 ms).
- The before export aborted after 197,383 ms with SIGABRT and V8's
  `JavaScript heap out of memory`; peak child-process RSS was 4,667,148 KiB.
  Measurements use Python's `resource.getrusage(RUSAGE_CHILDREN).ru_maxrss`.
  The default fixture's only edit is an unrelated CSS rule; the dedicated
  regression separately exercises duplicated affected-component evidence.
- After the fix, regeneration succeeded with the same dimensions. Cold/warm
  benchmark startup passed at 3,700/3,447 ms; Changes was ready at
  118,781/114,056 ms, with zero changed routes in both runs.
- The after export also aborted with SIGABRT and V8 heap exhaustion after
  200,236 ms, at 4,627,668 KiB peak child-process RSS. The large-export checkbox
  remains open: the planned deduplication change does not resolve that failure.
  Both exports reached catalogue assembly after comparison analysis; these
  timings do not establish the remaining allocation's cause.
  Commands and retained evidence:

```sh
npm run fixture:large
npm run benchmark:large
python3 .context/measure-command.py node dist/cli/bin.js export --config .context/mokly-large-3EfMA3/mokly.config.ts --base main --out .context/site-before --debug-timings
python3 .context/measure-command.py node dist/cli/bin.js export --config .context/mokly-large-HaejNa/mokly.config.ts --base main --out .context/site-after --debug-timings
```

Fixture setup and benchmark ran before and after; the two export commands used
those respective fixtures. Raw logs remain in `.context/m2-*.log`.

## Milestone 3: Configurable public exclusions with defaults (completed)

Give consumers a supported way to keep developer files private and ship
defaults that cover README and tsconfig files.

- [x] Add failing tests first: `tests/export_resource_policy.test.ts` and
      `tests/export_source_inventory.test.ts` cases that `README.md`,
      `nested/readme.md`, `tsconfig.json`, and `nested/tsconfig.mokly.json`
      under `mockupsDir` are excluded from export while `styles.css`,
      `image.png`, `page.html`, and `data.json` remain public; a Serve HTTP
      case in the existing server resource tests that `/static/README.md`
      returns 404; a `tests/server_changed_resource_validation.test.ts` case
      that a README edit does not appear as a public content change; and a
      `tests/config.test.ts` case that a consumer `publicExclude` glob
      extends the defaults and that unsafe globs are rejected with a typed
      config error.
- [x] Add `publicExclude?: readonly string[]` to the config input and
      resolved types in `src/config/types.ts`, validate it in
      `src/config/validate.ts`, and resolve it with the defaults prepended.
- [x] Implement the matcher in one place. Extend `isAuthoringSource` in
      `src/build/source_inventory.ts` (or a sibling `public_exclusions.ts`
      module if the file would exceed the length target) to test the
      candidate and its realpath against the resolved globs relative to
      `mockupsDir`. Because `isReservedSource` and `isExportPublicName` take
      bare names without config, thread the resolved config through the
      export policy and `classifyChangedContent` so they use the same check
      rather than a second name-only regex.
- [x] Ensure generated routes are collision-checked against the exclusion
      globs in the same place reserved basenames are checked, and add a
      build test for a colliding route.
- [x] Update the example catalogue if the shared config type change affects
      `examples/basic/mokly.config.ts`; rebuild and check it.

- [x] Apply active exclusions to every historical schema without resolving current
      disk aliases; retain baseline source inventory and regular-file validation.
- [x] Update the repository preview adapter's config-aware ownership policy and
      cover both publication paths, excluded aliases, and authoring watch behavior.
- [x] Preserve publication with unrelated dangling aliases while referenced invalid
      aliases still reach resource validation.
- [x] Remove pending-exclusion wording from README and protocol/module docs.
- [x] Finish the session's format, lint, typecheck, and complete test-suite checks.

Implementation notes: config and Serve regressions use small sibling test files
(`config_public_exclusions.test.ts` and `public_exclusions.test.ts`) to respect
file-length conventions. Defaults and resolved arrays are frozen. The matcher
lives only in `source_inventory.ts`; historical reads disable current filesystem
aliases, while Changes resolves exclusion aliases and preserves existing
fail-closed validation of retargeted source aliases. Historical resource readers
continue rejecting symlinks. Canonical builder metadata bypasses only public
globs in collision/ownership checks, retaining all other source protection.
The example config needed no change; build/check passed for all 278 outputs.
New unsafe-input tests also cover C1 controls and non-JSON values, retaining typed
errors. Final verification: `npm test` passed 1,565 tests with zero failures;
the focused policy/publication suite passed 82/82. `npm run format:check`,
`npm run lint`, and `npm run typecheck` passed. The first complete suite found
one dangling-alias regression (1,564 passed, one failed); the final full rerun
passed after the fix. No work on Milestone 5, commits, or pushes is included
in this session.

## Milestone 4: Forwarded loopback ports for live controls (completed)

Accept any valid loopback Host port while keeping Origin and token checks.

- [x] Add failing tests in `tests/component_render_service.test.ts` (or a
      new `tests/component_controls_forwarding.test.ts`): a GET preview and a
      POST render succeed with Host `127.0.0.1:<different port>` and
      `localhost:<different port>` when Origin matches that Host and the
      token is valid; requests with Host `example.com:<port>`,
      `127.0.0.1:0`, `127.0.0.1:65536`, `127.0.0.1:080`, a missing port, or
      an `x-forwarded-host` loopback header with a non-loopback Host are
      rejected with 403; a POST with a matching Host but mismatched Origin or
      bad token stays 403.
- [x] Replace the socket-port comparison in `localHost` in
      `src/server/controls/http.ts` with the loopback-plus-valid-port rule
      from the protocol doc. Keep the function pure and add a doc comment.
- [x] Add a browser regression under `tests/browser` that proxies the
      catalogue through a second local port and exercises live controls and a
      variant switch, mirroring juno's forwarding coverage, if the existing
      browser harness can bind a proxy without new dependencies; otherwise
      record the blocker here and rely on the HTTP tests.

- [x] Update implemented delivery status and README guidance for Milestones 2 and 4.
- [x] Run the session-required `npm run format:check`, `npm run lint`,
      `npm run typecheck`, and final full `npm test`, plus the focused browser
      forwarding and existing controls regressions. Leave Milestones 3 and 5
      untouched and do not commit or push in this session.

### Session verification

- Before implementation, the combined new Node tests reported 7 passed / 9
  failed (including the failed parent test); forwarded requests failed with 403. Both new browser cases also failed with 403 navigation responses.
- After implementation, the focused Node suite reported 23 passed / 0 failed;
  forwarding plus existing controls browser regressions reported 7 passed / 0
  failed. The proxy uses Node `http` without a new dependency.
- Final `npm run format:check`, `npm run lint`, and `npm run typecheck` passed.
  The final full `npm test` reported 1,514 passed / 0 failed / 0 skipped in
  358,744 ms. Initial test-only import-order and assertion-message typing errors
  were corrected before those final checks.
- Milestones 3 and 5 were not started. `cargo xtask check`, commit and push remain
  outside this session's requested scope. The default-large-export heap failure
  remains recorded under Milestone 2; no broader export-memory fix was made.

## Milestone 5: Verification, commit, and push (completed)

- [x] Run `npm run format:check`, `npm run lint`, `npm run typecheck`,
      `npm test`, `npm run example:build`, `npm run example:check`,
      `npm run test:browser`, and `npm run package:smoke`.
- [x] Smoke test: start `npm run dev`, open the catalogue through a forwarded
      port, edit a component prop, and confirm the preview updates; run
      `node dist/cli/bin.js export` on the example and confirm no README or
      tsconfig file appears in the output.
- [x] Remove every "approved target", "implementation is pending", and
      "awaiting implementation" marker that Milestone 1 added to `README.md`,
      `docs/protocol/*.md`, `src/export/README.md`, and `src/server/README.md`
      now that the behaviour is implemented; the docs must describe current
      behaviour only.
- [x] Run `cargo xtask check`.
- [x] Update `CHANGELOG.md` only if release-please does not own it; otherwise
      rely on Conventional Commit messages such as
      `feat(config): add publicExclude`,
      `fix(serve): accept forwarded loopback ports`,
      `perf(workspace): dedupe affected usages linearly`, and
      `docs: recommend sibling mockup layout`.
- [x] `git add -A`, commit, and push the branch. Before and after commit,
      inspect `git diff --name-status origin/main` and
      `git diff --diff-filter=D --name-status origin/main`; no deletions are
      expected.

Verification record: format, lint, typecheck, `npm test` (1,565 passed),
`npm run test:browser` (276 passed), `npm run package:smoke`,
`npm run example:build`, `npm run example:check` (278 files), and
`cargo xtask check` all passed on the final tree. Smoke tests: an export of
the example with `README.md`, `tsconfig.test.json`, and `data.json` dropped
into `generated/` produced 1,148 files with no README or tsconfig and with
`static/data.json` present; Serve returned 404 for `/static/README.md`, 200
for `/static/data.json`, 404 (not 403) for a controls preview route with a
forwarded `Host: localhost:5555`, and 403 for `Host: example.com`.

## Milestone 6: Review (completed)

- [x] After the final push, review the complete local diff against
      `origin/main` using `docs/implementation-review-prompt.md`. Report
      numbered findings with severity, context, impact, lettered options, and
      a recommendation. Do not change the implementation.

Review outcome: eleven findings were reported to the user without changes
(two medium, nine low). The medium findings are that a generated route
colliding with a default exclusion such as `readme.html` fails the build with
a message blaming an authored source root instead of `publicExclude`, and
that the newly written Host contract scopes the loopback rule to the two
controls endpoints while the implementation gates every Serve request when
controls are active. Each finding is awaiting the user's decision.

## Milestone 7: Review fixes

Address the eleven findings from the Milestone 6 review using the recommended
option for each. Backend, tests, and docs only; no mockup or UI work.

- [ ] Finding 1 (option C): make the shared source classifier return a typed
      denial reason instead of a boolean, and have the generated-route
      collision check in `src/build/output_paths.ts`, ownership in
      `src/build/ownership.ts`, the export policy, and resource validation
      report the actual cause. An exclusion match must say the route matches
      a public exclusion and name `publicExclude`. Tighten the collision test
      to assert the cause, not only the route.
- [ ] Finding 2 (option C): correct `docs/protocol/mokly-component-controls.md`,
      `src/server/controls/README.md`, `src/server/README.md`, and `README.md`
      to state that when controls are active the loopback Host rule admits
      every Serve request and a non-loopback Host returns 403 for the whole
      catalogue. Add a Node HTTP test asserting 403 on an ordinary catalogue
      route for a non-loopback Host and 200 for an accepted forwarded Host.
- [ ] Finding 3 (option C): memoise compiled `Minimatch` instances per
      `config.publicExclude` in a `WeakMap`, matching the existing index
      caches in `src/build/source_inventory.ts`, and record a before/after
      large-fixture traversal measurement under this milestone.
- [ ] Finding 4 (options D and C): extract the source-index builder out of
      `isAuthoringSource` into a named private helper so the `aliases` mode
      parameter is no longer shadowed, and enable
      `@typescript-eslint/no-shadow` in `eslint.config.js`, fixing whatever it
      reports. If the lint reports a large volume of unrelated pre-existing
      shadows, record the count here and rename only; do not leave the lint
      half-enabled.
- [ ] Finding 5 (option D): in `src/server/controls/runtime_ipc.ts`, re-run
      `resolvePublicExclude` on the received `publicExclude` value so the
      child adopts the same validated, frozen list as `resolveConfig`; reject
      the startup message on failure. Add a test.
- [ ] Finding 6 (option C): drop `**/readme.*` from the defaults in code,
      the four docs, and the config test, and add one sentence in
      `docs/protocol/mokly-configuration.md` stating the defaults are
      case-folded so consumers need not add case variants.
- [ ] Finding 7 (option C): remove the dead `match[0] === host` guard in
      `localHost` and note in its doc comment that the regex is fully
      anchored and `$` admits no trailing newline in JavaScript.
- [ ] Finding 8 (option B): reduce the restated default list in
      `docs/protocol/mokly-package.md` to a one-sentence pointer at the
      configuration and source-protection contracts.
- [ ] Finding 9 (option B): re-wrap the three over-long paragraphs at
      `docs/protocol/mokly-source-protection.md` lines 53 and 176 and
      `docs/protocol/mokly-component-controls.md` line 228 to the surrounding
      80-column convention.
- [ ] Finding 10 (option B): add one sentence to
      `docs/protocol/mokly-component-controls.md` recording why `[::1]` is
      rejected: Serve binds only to `127.0.0.1`, so IPv6 loopback can never
      reach the socket directly and accepting it would only widen the Host
      surface without a working path. IPv6 support is out of scope.
- [ ] Finding 11 (option C): update the Milestone 1 TODO text to name
      `docs/protocol/mokly-configuration.md` as the owner of `publicExclude`,
      and add a note under Milestone 1 recording that `mokly-package.md` was
      split into `mokly-authoring.md`, `mokly-configuration.md`, and
      `mokly-rendering.md` to stay within the protocol-doc length guidance.
- [ ] Run `npm run format:check`, `npm run lint`, `npm run typecheck`,
      `npm test`, `npm run example:build`, `npm run example:check`,
      `npm run test:browser`, `npm run package:smoke`, and `cargo xtask check`.
- [ ] `git add -A`, commit with Conventional Commits, and push. Inspect
      `git diff --diff-filter=D --name-status origin/main` before and after;
      no deletions are expected.

## Milestone 8: Review

- [ ] After the final push, review the complete local diff against
      `origin/main` using `docs/implementation-review-prompt.md`. Report
      numbered findings with severity, context, impact, lettered options, and
      a recommendation. Do not change the implementation.

## Post-merge follow-up (non-blocking)

- Diagnose why `npm run fixture:large` export exhausts Node's default heap
  (about 4.5 GB, SIGABRT after roughly 200 s at catalogue assembly, peak RSS
  about 4.6 GB) independently of affected-usage deduplication, and fix the
  responsible allocation without raising the heap limit. Raw logs from the
  measurement session were kept under `.context/m2-*.log`.
- Upgrade juno to the Mokly release containing this work, delete
  `ts/patches/mokabook+0.8.0.patch` and its README section, remove
  `patch-package` from the postinstall if no other patches remain, and either
  move `docs/mockups/README.md` and `docs/mockups/tsconfig*.json` out of the
  published root or rely on the shipped defaults.
- Consider deduplicating affected-consumer evidence where it is produced in
  the change-attribution pipeline so the workspace never receives duplicates
  (option C from the analysis); it touches attribution and deserves its own
  plan.
