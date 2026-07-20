# Mokabook CI And Npm Release Contract

## Package Metadata

`package.json` describes an unscoped public ESM package named `mokabook` with an
initial development version of `0.0.0`, MIT licensing, Firna authorship, exact
repository/bugs/homepage metadata for `futex-ai/mokabook`, a Node engine floor,
one `mokabook` bin, explicit exports/types, and a restrictive `files` allowlist.

`publishConfig` targets the public npm registry with public access. The package
contains compiled runtime code, declarations, package-owned shell assets,
README, LICENSE, CHANGELOG, and package metadata only. Source fixtures, tests,
plans, protocol docs, caches, review artifacts, and generated demo output are
not published unless a documented runtime requirement proves otherwise.

Runtime dependencies are intentional and minimal. Mokabook does not take a
runtime dependency on `@firna/ui`, Accounting, Juno, Playwright, or a consumer's
component system. Development and browser-test packages remain development
dependencies.

## Local Verification

`cargo xtask check` is the complete repository and release gate. It delegates
to deterministic npm scripts and includes:

- formatting and lint checks;
- TypeScript typechecking with no unexplained source exclusions;
- unit and integration tests with a 100% pass rate;
- production build and declaration generation;
- a byte-stable example `check` against committed generated output;
- package-file inspection with `npm pack --dry-run --json`;
- packed-tarball installs in clean ESM, NodeNext, Accounting-shaped, and
  Juno-shaped consumers;
- local-npx and clean-cache npx-style execution from the packed artifact;
- source-tree ESM, declaration, CLI, workspace-resolution, server, Review, and
  watched-runtime regressions;
- Playwright Browse and Review regressions using Chromium; and
- Rust formatting, Clippy, tests, and file-length audits for `xtask`.

Tests that mutate files use isolated temporary directories and clean up child
processes. Package smokes execute the packed artifact, not the source tree or a
workspace symlink. The temporary real-Accounting parity audit is release
evidence rather than a recurring CI dependency on another repository.

## Continuous Integration

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`, with
read-only repository contents permission and concurrency cancellation for
superseded validation. Its two independent verification jobs run the complete
gate on Ubuntu:

- the minimum supported Node 22.14.0 with npm 11.7.0; and
- release Node 24 with npm 11.7.0.

Both install Rust 1.95.0, install Chromium, and run `cargo xtask check`. The
`Required CI` aggregator fails unless both jobs succeed and is the branch-rule
status to require. CI uses `npm ci` and the committed lockfile. Action revisions
are immutable commit hashes with reviewed version comments; runtime versions
are explicit. Fork pull requests receive no release secrets or write
permissions.

## Release Management

Conventional Commits feed release-please's Node release strategy through
`release-please-config.json` and `.release-please-manifest.json`. A push to
`main` creates or updates a release PR; an ordinary push with no release does
not publish. The release PR owns `CHANGELOG.md`, `package.json`, and
`package-lock.json`. A maintainer reviews and merges it to create the immutable
`vX.Y.Z` tag and GitHub release.

The release workflow then:

1. Selects only the release-please tag, or an explicitly supplied manual tag.
2. Checks out that tag with history on a GitHub-hosted runner.
3. Installs Node 24, npm 11.7.0, Rust 1.95.0, and Chromium without a package
   cache.
4. Verifies the local and remote tag identify `HEAD`, the tree is clean, and
   the tag exactly matches the package version.
5. Runs `npm ci` and the complete `cargo xtask check` gate.
6. Creates one exact tarball, validates its allowlist and license closure, and
   records its integrity, shasum, file inventory, and size report.
7. Queries npm. An `E404` permits a publish; any other lookup failure stops the
   workflow. An existing version must byte-for-byte match the checked report
   and commit or the workflow fails.
8. Uploads the exact checked artifact, then publishes that same path publicly
   with npm trusted publishing when it is not already present.
9. Downloads the registry artifact and rechecks integrity, shasum, file
   inventory, version, optional `gitHead`, the `latest` dist-tag, and npm
   signatures/provenance.

Publishing occurs in the same workflow invocation that creates the GitHub
release. A manual `publish_ref` dispatch may retry an existing `vX.Y.Z` tag and
runs the identical verification path. Concurrency never cancels an in-progress
publish.

The publish job alone receives `id-token: write`, plus read-only contents, and
runs in the protected GitHub environment named `npm`. Release-please receives
only contents, pull-request, and issue write permissions. Prefer a
repository-owned fine-grained token or GitHub App credential in the
`RELEASE_PLEASE_TOKEN` secret so release PR events trigger normal checks. The
workflow falls back to `GITHUB_TOKEN`; GitHub suppresses most follow-on workflow
events created with that token, so maintainers must verify the release PR's
required checks when using the fallback.

## First Publication

Trusted publishing can be configured only after the npm package exists. The
bootstrap sequence is therefore explicit and maintainer-controlled:

1. Complete the GitHub repository rename to `futex-ai/mokabook`, merge the
   reviewed implementation to `main` at version `0.0.0`, and confirm `Required
CI` passed. Do not merge the first release PR yet.
2. Recheck that the unscoped `mokabook` name remains available. Pause for
   explicit maintainer approval because the first public publish is
   irreversible.
3. From that exact clean `main` commit, rerun `cargo xtask check`, run the
   release packer, inspect its report, and manually publish that exact tarball
   as public under the non-consumer `bootstrap` dist-tag. Use an approved
   maintainer's interactive npm authentication; do not add an npm token to
   GitHub.
4. Configure the npm trusted publisher for organization `futex-ai`, repository
   `mokabook`, workflow filename `release.yml`, GitHub environment `npm`, and
   the workflow's `npm publish` action.
5. Verify the trusted relationship with the release workflow, then restrict
   traditional token publishing and remove obsolete npm automation tokens.
6. Merge the release-please PR for `0.1.0`; confirm the workflow creates the
   immutable tag/release and publishes the first supported consumer version
   with provenance. Release-please treats the `0.0.0` manifest as unreleased
   and would otherwise default the first version to `1.0.0`, so the config
   carries a one-time `release-as: 0.1.0` override; remove the override in a
   follow-up change after the release publishes.
7. From a clean directory, verify package visibility, metadata, README,
   license, owners, provenance/signatures, dist tags, `npx mokabook --version`,
   and a minimal build/serve fixture.

The bootstrap publish is never documented as a consumer version. If npm offers
a safer package-reservation mechanism before implementation, revalidate this
sequence against current official docs before acting.

## Maintainer Setup

Before enabling publish, maintainers must configure and verify:

- repository Actions may create pull requests, and the default workflow token
  has only the permissions declared in each workflow;
- the branch rule requires the exact `Required CI` status;
- the protected `npm` environment has the approved deployment branches/tags and
  reviewers, without storing an npm token;
- the `RELEASE_PLEASE_TOKEN` credential owner, least-privilege repository
  access, expiry/rotation, and fallback behavior;
- approved Firna npm maintainer accounts, enforced 2FA, public unscoped-package
  access, and the intended initial owner list;
- the trusted-publisher repository, workflow filename, environment, and publish
  action exactly match the values above; and
- immutable tag/GitHub release protection and who may invoke the manual retry.

No long-lived npm write token is stored in GitHub Actions.

## Release Evidence

Each release records the checked commit, package version, uploaded tarball and
pack report, verification result, GitHub release, npm URL, provenance/signature
result, and smoke-test result. A failed publish never changes the tag or
rebuilds from a branch; the manual retry accepts only the existing immutable
`vX.Y.Z` tag and repeats the identical path.

## Current External Requirements

Implementation must re-check these primary references because release tooling
changes over time:

- [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/)
- [npm unscoped public packages](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/)
- [npm package executables](https://docs.npmjs.com/cli/npm-exec/)
- [npm package metadata](https://docs.npmjs.com/files/package.json/)
- [release-please action](https://github.com/googleapis/release-please-action)

As rechecked on 20 July 2026, npm trusted publishing requires Node 22.14 or
newer and npm 11.5.1 or newer; the `npm trust` management command requires npm
11.15 or newer.
The package must already exist before a trust relationship can be configured.
The workflow's npm 11.7.0 satisfies publishing; use npm 11.15 or newer only for
the separate interactive trust-management command. Trusted publishing creates
provenance automatically on supported GitHub-hosted runners.

## Related Docs

- [Package and authoring contract](./mokabook-package.md)
- [Build, Browse, and Review runtime](./mokabook-runtime.md)
