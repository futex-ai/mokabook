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

## Milestone 1: Documentation and protocol contract

Define every contract that the later milestones implement so no guesswork
remains.

- [ ] In `docs/protocol/mokly-source-protection.md`, add a "Public
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
- [ ] In `docs/protocol/mokly-package.md`, document the `publicExclude`
      config field (optional `readonly string[]`, validated as safe
      repository-relative glob strings), the defaults, and the recommended
      sibling layout (`docs/mockups/entries`, `docs/mockups/generated`,
      `docs/mockups/renderer.tsx`). Keep the statement that nested
      `docs/mockups/src` layouts remain supported.
- [ ] In `docs/protocol/mokly-component-controls.md`, replace "validated Host"
      with the precise rule: Host must be `localhost` or `127.0.0.1` followed
      by a decimal port between 1 and 65535 with no leading zero; the port
      need not equal the listening socket port because forwarded local ports
      are supported. Origin must equal `http://` plus that Host exactly, and
      the render token is still required on POST. Non-loopback hosts and
      forwarded headers (`x-forwarded-*`) grant nothing.
- [ ] In `docs/protocol/mokly-live-evidence.md` (or the workspace design doc
      if it is the better owner), state the affected-usage identity: two
      usage links are duplicates when every serialised field matches; the
      first occurrence in evidence order is kept; deduplication performs at
      most one serialisation per usage link.
- [ ] Update `README.md`: change both config examples to the sibling layout,
      add one sentence under Configuration explaining that everything below
      `mockupsDir` is public unless protected, list `publicExclude` and its
      defaults in the configuration bullets, and mention forwarded-port
      support in the Serve section.
- [ ] Update `src/export/README.md` and `src/server/README.md` for the
      exclusion policy and the Host rule.
- [ ] Add this plan to `plans/README.md` (done at creation) and validate the
      changed Markdown.

## Milestone 2: Affected-usage deduplication

Make the workspace usage list linear in serialisations without changing
identity, order, or comparison membership.

- [ ] Add a failing test in `tests/component_workspace.test.ts` (or a new
      `tests/component_workspace_dedup.test.ts`) that builds an affected list
      with duplicates across viewport, colour scheme, variant, and ownership,
      asserts first-occurrence order is preserved and distinct contexts are
      retained, and asserts the serialisation count is bounded to one per
      usage by wrapping `JSON.stringify` or by injecting a counting key
      function.
- [ ] Extract the deduplication in `src/server/shell/workspace_data.ts` into
      a small pure helper (for example `dedupeUsageLinks(links)`) that keeps
      a `Set` of serialised keys, and use it at the `affected` site.
- [ ] Confirm `npm run benchmark:large` or the large fixture (`npm run
    fixture:large`, `npm run dev:large`) no longer exhausts the default heap
      when exporting; record the before/after observation in this plan.

## Milestone 3: Configurable public exclusions with defaults

Give consumers a supported way to keep developer files private and ship
defaults that cover README and tsconfig files.

- [ ] Add failing tests first: `tests/export_resource_policy.test.ts` and
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
- [ ] Add `publicExclude?: readonly string[]` to the config input and
      resolved types in `src/config/types.ts`, validate it in
      `src/config/validate.ts`, and resolve it with the defaults prepended.
- [ ] Implement the matcher in one place. Extend `isAuthoringSource` in
      `src/build/source_inventory.ts` (or a sibling `public_exclusions.ts`
      module if the file would exceed the length target) to test the
      candidate and its realpath against the resolved globs relative to
      `mockupsDir`. Because `isReservedSource` and `isExportPublicName` take
      bare names without config, thread the resolved config through the
      export policy and `classifyChangedContent` so they use the same check
      rather than a second name-only regex.
- [ ] Ensure generated routes are collision-checked against the exclusion
      globs in the same place reserved basenames are checked, and add a
      build test for a colliding route.
- [ ] Update the example catalogue if the shared config type change affects
      `examples/basic/mokly.config.ts`; rebuild and check it.

## Milestone 4: Forwarded loopback ports for live controls

Accept any valid loopback Host port while keeping Origin and token checks.

- [ ] Add failing tests in `tests/component_render_service.test.ts` (or a
      new `tests/component_controls_forwarding.test.ts`): a GET preview and a
      POST render succeed with Host `127.0.0.1:<different port>` and
      `localhost:<different port>` when Origin matches that Host and the
      token is valid; requests with Host `example.com:<port>`,
      `127.0.0.1:0`, `127.0.0.1:65536`, `127.0.0.1:080`, a missing port, or
      an `x-forwarded-host` loopback header with a non-loopback Host are
      rejected with 403; a POST with a matching Host but mismatched Origin or
      bad token stays 403.
- [ ] Replace the socket-port comparison in `localHost` in
      `src/server/controls/http.ts` with the loopback-plus-valid-port rule
      from the protocol doc. Keep the function pure and add a doc comment.
- [ ] Add a browser regression under `tests/browser` that proxies the
      catalogue through a second local port and exercises live controls and a
      variant switch, mirroring juno's forwarding coverage, if the existing
      browser harness can bind a proxy without new dependencies; otherwise
      record the blocker here and rely on the HTTP tests.

## Milestone 5: Verification, commit, and push

- [ ] Run `npm run format:check`, `npm run lint`, `npm run typecheck`,
      `npm test`, `npm run example:build`, `npm run example:check`,
      `npm run test:browser`, and `npm run package:smoke`.
- [ ] Smoke test: start `npm run dev`, open the catalogue through a forwarded
      port, edit a component prop, and confirm the preview updates; run
      `node dist/cli/bin.js export` on the example and confirm no README or
      tsconfig file appears in the output.
- [ ] Run `cargo xtask check`.
- [ ] Update `CHANGELOG.md` only if release-please does not own it; otherwise
      rely on Conventional Commit messages (`feat(config): add publicExclude`,
      `fix(serve): accept forwarded loopback ports`,
      `perf(workspace): dedupe affected usages linearly`, `docs: recommend
    sibling mockup layout`).
- [ ] `git add -A`, commit, and push the branch. Before and after commit,
      inspect `git diff --name-status origin/main` and
      `git diff --diff-filter=D --name-status origin/main`; no deletions are
      expected.

## Milestone 6: Review

- [ ] After the final push, review the complete local diff against
      `origin/main` using `docs/implementation-review-prompt.md`. Report
      numbered findings with severity, context, impact, lettered options, and
      a recommendation. Do not change the implementation.

## Post-merge follow-up (non-blocking)

- Upgrade juno to the Mokly release containing this work, delete
  `ts/patches/mokabook+0.8.0.patch` and its README section, remove
  `patch-package` from the postinstall if no other patches remain, and either
  move `docs/mockups/README.md` and `docs/mockups/tsconfig*.json` out of the
  published root or rely on the shipped defaults.
- Consider deduplicating affected-consumer evidence where it is produced in
  the change-attribution pipeline so the workspace never receives duplicates
  (option C from the analysis); it touches attribution and deserves its own
  plan.
