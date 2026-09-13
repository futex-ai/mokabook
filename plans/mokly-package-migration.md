# Mokly Package Migration

Migrate the repository's public distribution identity from `mokabook` to the
unscoped `mokly` npm package and executable. There are no supported external
Mokabook consumers, so the cutover is intentionally breaking and does not ship
a compatibility package, alias executable, or dual config discovery.

The existing `mokabook` registry package remains reserved after cutover and is
deprecated only after `mokly` has been published and verified. Historical Git
tags, changelog entries, and review evidence remain history; current repository
metadata and release provenance move to `mokly-ai/mokly`.

## Milestone 1: Distribution And Protocol Contract

Summary: define the exact public rename and the one-time npm bootstrap sequence
before changing implementation behavior.

- [x] Specify `mokly` as the package and executable, `mokly.config.*` as config
      discovery, and the renamed generated/public identifiers that consumers
      can observe.
- [x] Document that old Mokabook inputs are rejected rather than silently
      supported, while historical release records remain intact.
- [x] Document npm organization access, first-package bootstrap, trusted
      publishing for `mokly-ai/mokly`, legacy package deprecation, and release
      verification.
- [x] Update current README and protocol links for the new product identity.

## Milestone 2: Canonical Design Rebrand

Tags: mockup

Summary: rename the checked design catalogue before changing the served product
shell that implements it.

- [x] Update canonical design catalogue source copy and metadata from Mokabook
      to Mokly without changing unrelated screen behavior.
- [x] Regenerate checked catalogue HTML and manifests from source.
- [x] Run design, generated-output, type, and browser smoke checks for every
      changed canonical page.

## Milestone 3: Package, CLI, And Runtime Cutover

Summary: make installed consumers use only the new package, executable, config,
and generated-output contract.

- [x] Add failure-first assertions for the `mokly` package metadata, binary,
      repository URLs, config discovery, import resolution, and packed install.
- [x] Rename public TypeScript identities and consumer examples to Mokly.
- [x] Rename config discovery, generated artifacts, owned metadata, local
      directories, diagnostics, and static runtime identifiers without public
      Mokabook aliases; retain only narrowly scoped historical Git and ownership
      readers needed to compare or replace committed output safely.
- [x] Update clean packed-consumer fixtures and package inspection to prove the
      new import and `npx mokly` behavior.
- [x] Keep implementation files within repository size limits and update nearby
      README guidance.

## Milestone 4: Served Product Rebrand

Tags: ui

Summary: align the actual Browse, Review, and export surfaces with the canonical
Mokly design while leaving feature behavior unchanged.

- [x] Replace user-facing Mokabook product copy, accessibility names, titles,
      status output, and shell-owned selectors with Mokly equivalents.
- [x] Update client/server route contracts and static delivery tests together.
- [x] Smoke Browse, Review, watch, build, check, and export through the `mokly`
      executable.

## Milestone 5: Release Automation And Complete Verification

Summary: prepare the repository side of the first unscoped `mokly` publication
and prove the complete product remains releasable.

- [x] Update release artifact naming, registry guards, workflow tests, and
      maintainer setup for `mokly` and `mokly-ai/mokly`.
- [x] Run formatting, lint, typecheck, unit/integration tests, browser tests,
      package/tarball smokes, and relevant platform-independent smoke tests with
      a 100% pass rate.
- [x] Run `cargo xtask check` and require a 100% pass rate.
- [x] Record the remaining authenticated npm/GitHub/Cloudflare maintainer steps
      that cannot be completed from the workspace without credentials.

## Milestone 6: Commit And Push

Summary: publish the complete reviewed workspace change to the current branch.

- [x] Inspect the complete diff against `origin/main` and ensure every generated
      and newly created file is tracked.
- [ ] Run `git add -A`, commit with a Conventional Commit, and push the current
      branch without renaming it.

## Milestone 7: Post-Push Implementation Review

Summary: review the exact pushed result without changing implementation.

- [ ] After the push, use
      [`docs/implementation-review-prompt.md`](../docs/implementation-review-prompt.md)
      to review the complete local diff against `origin/main`; report every
      finding and recommendation without applying fixes.
