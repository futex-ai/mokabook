# Mokabook CI And Npm Release Contract

## Package Metadata

`package.json` describes an unscoped public ESM package named `mokabook` with an
initial development version of `0.0.0`, MIT licensing, Firna authorship, exact
repository/bugs/homepage metadata for `futex-ai/mokabook`, a Node engine floor,
one `mokabook` bin, explicit exports/types, and a restrictive `files` allowlist.

`publishConfig` targets the public npm registry with public access. The package
contains compiled runtime code, declarations, shell assets, required font
licenses, README, LICENSE, and package metadata only. Source fixtures, tests,
plans, protocol docs, caches, review artifacts, and generated demo output are
not published unless a documented runtime requirement proves otherwise.

Runtime dependencies are intentional and minimal. Mokabook does not take a
runtime dependency on `@firna/ui`, Accounting, Juno, Playwright, or a consumer's
component system. Development and browser-test packages remain development
dependencies.

## Local Verification

`cargo xtask check` is the single complete gate. It delegates to deterministic
npm scripts and includes:

- formatting and lint checks;
- TypeScript typechecking with no unexplained source exclusions;
- unit and integration tests with a 100% pass rate;
- production build and declaration generation;
- example `build` then byte-stable `check`;
- package-file inspection with `npm pack --dry-run --json`;
- packed-tarball installs in clean temporary consumers;
- ESM, NodeNext declaration, CLI, local-npx, and workspace-resolution smokes;
- Playwright Browse/Review/watch regressions;
- Rust formatting, Clippy, tests, file-length, and source audits for `xtask`.

Tests that mutate files use isolated temporary directories and clean up child
processes. A package smoke test must execute the packed artifact, not the source
tree or a workspace symlink.

## Continuous Integration

GitHub Actions runs on pull requests and pushes to `main`, with read-only
default permissions and concurrency cancellation for superseded validation.
Required jobs cover:

- the minimum supported Node/npm combination;
- the current Firna release Node/npm combination;
- full `cargo xtask check` on Linux;
- the Chromium browser suite;
- packed-package consumer tests and package-content inspection;
- a final required-status aggregator when checks are split across jobs.

CI uses `npm ci` and the committed lockfile. Action versions and Node/npm
versions are explicit and reviewed when upgraded. The release build never
reuses a dependency cache. Fork pull requests do not receive release secrets or
write permissions.

## Release Management

Conventional Commits feed release-please's Node release strategy. A push to
`main` creates or updates a release PR; ordinary pushes never publish. The
release PR owns `CHANGELOG.md`, `package.json`, and `package-lock.json`. A
maintainer reviews and merges it to create the `vX.Y.Z` tag and GitHub release.

The release workflow then:

1. Checks out the immutable release SHA/tag on a GitHub-hosted runner.
2. Installs a trusted-publishing-compatible Node and npm version without a
   package-manager cache.
3. Runs `npm ci` and `cargo xtask check`.
4. Verifies the tag exactly matches the package version.
5. Builds and inspects the same packed artifact that will publish.
6. Installs that tarball in clean smoke consumers.
7. Skips safely when the exact npm version already exists.
8. Publishes publicly with npm trusted publishing and provenance.

Publishing occurs in the same workflow invocation that creates the GitHub
release. A manual `publish_ref` dispatch may retry an existing `vX.Y.Z` tag and
runs the identical verification path. Concurrency never cancels an in-progress
publish.

The publish job alone receives `id-token: write`. Release-please receives only
the repository permissions it needs. A repository-owned token or GitHub App
credential is used when release PR creation must trigger normal PR checks;
fallback behavior with `GITHUB_TOKEN` is documented.

## First Publication

Trusted publishing can be configured only after the npm package exists. The
bootstrap sequence is therefore explicit and maintainer-controlled:

1. Merge the release-ready library implementation to `main` at version
   `0.0.0`, but do not merge the first release PR yet.
2. From that exact commit, run all checks, inspect the tarball, and manually
   publish `0.0.0` with public access under a non-consumer bootstrap dist-tag.
3. Configure the npm trusted publisher for the exact repository, workflow
   filename, optional protected environment, and `npm publish` permission.
4. Restrict traditional token publishing and remove obsolete automation tokens
   after OIDC is verified.
5. Merge the release-please PR for `0.1.0`; confirm the workflow creates the
   tag/release and publishes the first consumer version with provenance.
6. Verify package visibility, README, executable behavior, provenance, dist
   tags, and `npx mokabook --version` from a clean directory.

The bootstrap publish is never documented as a consumer version. If npm offers
a safer package-reservation mechanism before implementation, revalidate this
sequence against current official docs before acting.

## Maintainer Setup

Before enabling publish, document and verify:

- the approved Firna npm maintainer accounts and 2FA;
- unscoped public-package access and the initial package owner list;
- GitHub Actions workflow permissions and required branch checks;
- any protected `npm` GitHub environment and reviewers;
- the exact trusted-publisher workflow filename and allowed action;
- release-please credential ownership and rotation;
- tag/release protection and manual retry responsibility.

No long-lived npm write token is stored in GitHub Actions.

## Release Evidence

Each release records the checked commit, package version, tarball contents,
verification result, GitHub release, npm URL, provenance result, and smoke-test
result. A failed publish never changes the tag or rebuilds a different artifact;
the manual retry uses the existing tag.

## Current External Requirements

Implementation must re-check these primary references because release tooling
changes over time:

- [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/)
- [npm unscoped public packages](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/)
- [npm package executables](https://docs.npmjs.com/cli/npm-exec/)
- [npm package metadata](https://docs.npmjs.com/files/package.json/)
- [release-please action](https://github.com/googleapis/release-please-action)

As of 19 July 2026, npm trusted publishing requires Node 22.14 or newer and npm
11.5.1 or newer; the `npm trust` management command requires npm 11.15 or newer.
The package must already exist before a trust relationship can be configured.

## Related Docs

- [Package and authoring contract](./mokabook-package.md)
- [Build, Browse, and Review runtime](./mokabook-runtime.md)
