# One-Time Mokly Registry Bootstrap

This registers the unscoped `mokly` package so npm trusted publishing can be
configured. It is not a supported consumer release. Follow the
[release contract](./npm-release.md) for all later versions. Never move an
existing Git tag or reset release-please state to recreate a version.

## Reviewed Source And Archive

After the migration and review fixes are merged to `main`, but before merging
the Release Please PR:

1. Confirm `npm view mokly` returns a recognized missing-package response.
   Stop on other lookup errors or if a package already exists; do not overwrite
   or repeat registration.
2. Check out the reviewed migration commit from `main`, including its review
   fixes, with no staged, unstaged, or untracked source changes. Fetch `main`
   first and verify the chosen commit is the intended merged source.
3. Install dependencies with `npm ci` and run `cargo xtask check`. The bootstrap
   command builds and packs but does not replace this complete verification.
4. Supply that independently reviewed full 40-character SHA explicitly. Do not
   use a branch name, abbreviated SHA, or blindly derive approval from `HEAD`:

   ```sh
   node scripts/release/bootstrap.mjs <reviewed-full-commit-sha> .context/bootstrap-artifact
   ```

The command requires `HEAD` to equal the supplied SHA, a clean source tree, and
`mokly@0.8.0`. It fetches that exact commit into a fresh temporary checkout,
installs the lockfile with `npm ci`, and runs the package's `prepack` build via
`npm pack`. Ignored local `dist`, dependencies, and caches cannot leak into that
checkout. The isolated fetch is depth-one: partially fetched workspaces do not
need unrelated historical blobs, and build scripts must not require Git history
before the reviewed commit. It checks the runtime license closure and package allowlist, verifies
the source is still clean and pinned after lifecycle scripts finish, and
recomputes the archive hashes before exposing the result.

The destination must not already exist. On success it contains exactly:

- `mokly-0.8.0.tgz`: the archive to inspect and publish without rebuilding;
- `pack-report.json`: npm's inventory, size, version, integrity and shasum,
  extended with independently verified `sourceCommit` and `sourceTree` Git IDs.

These Git fields link the retained report and exact archive bytes to the
reviewed checkout. They are local build evidence, not npm-generated `gitHead`
or signed OIDC provenance; the bootstrap is an interactive maintainer publish.
Keep the report with the archive. The command never publishes, changes package
versions, moves refs, or edits the source checkout. Temporary build data is
removed on success and failure.

## Registration And Trusted Publishing

Inspect the report's source SHA, package identity, inventory and hashes before
publishing. From an approved npm maintainer account with 2FA:

```sh
npm publish .context/bootstrap-artifact/mokly-0.8.0.tgz --access public --tag bootstrap
npm view mokly@0.8.0 name version dist.integrity dist.shasum
npm view mokly dist-tags --json
```

Compare the registry hashes to the retained report. `bootstrap` must identify
`0.8.0`; do not assign `latest`. Then:

1. Configure npm trusted publishing for GitHub organization `mokly-ai`,
   repository `mokly`, workflow `release.yml`, environment `npm`, allowing the
   workflow's direct `npm publish` action.
2. Grant the intended `mokly` organization team read/write access to the
   unscoped package with `npm access grant read-write mokly:<team> mokly`.
   Require 2FA and disallow token publishing. Store no npm write token in GitHub.
3. Verify the [GitHub publishing protections](./npm-github-protections.md).
4. Merge the breaking Release Please PR. Its new `v0.9.0` tag is the first
   supported `mokly` release and the first version assigned to `latest`.
5. Verify package contents, owner/team access, metadata, provenance, dist-tags,
   `npx mokly --version`, and a minimal clean build/serve fixture. Only then
   deprecate every `mokabook` version with a move notice; do not unpublish it.

## Development Evidence

`tests/release_bootstrap.test.ts` uses real isolated Git/npm fixtures to prove
dirty/ref/version rejection, exclusion of stale ignored output, source/hash
evidence, destination preservation, symlinked temporary roots, partial source
clones with missing historical blobs, and rejection of lifecycle input mutations.
Run it with `node --import tsx --test tests/release_bootstrap.test.ts`.
