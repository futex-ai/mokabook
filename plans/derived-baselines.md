# Derived Baselines

## Summary

Stop committing generated HTML and the generated manifest for catalogues that
opt in. Source remains the only authored artifact in Git. Changes, screen
comparisons, and export obtain the baseline by rebuilding the merge-base commit
in an isolated extraction of that commit, using that commit's own dependencies
and Mokabook version, and cache the rebuilt output by commit.

Motivation recorded by the user: committed exports cause merge conflicts whose
only correct resolution is regeneration, and the source already determines the
output. Interactive components are explicitly out of scope for this plan.

Decisions:

- The mode is a typed config choice, `generatedOutput: "committed" | "derived"`.
  `committed` keeps today's behavior unchanged. This repository's example
  catalogue moves to `derived`.
- Rebuilding executes the merge-base commit's install and build commands. The
  base is a trusted mainline; the protocol states this explicitly.
- Committed HTML deletion from `examples/basic/generated` touches files on
  `origin/main` and requires explicit user approval before Milestone 8 runs.
- Interim conflict relief (a Git merge driver) is not pursued; the derived mode
  removes the conflicting files instead.

Protocol owner: `docs/protocol/mokabook-derived-baselines.md` (created in
Milestone 1). Related contracts: [Changes](../docs/protocol/mokabook-changes.md),
[export](../docs/protocol/mokabook-export.md),
[source protection](../docs/protocol/mokabook-source-protection.md),
[timings](../docs/protocol/mokabook-timings.md),
[package](../docs/protocol/mokabook-package.md).

## Milestone 1: Define the derived-baseline contract — completed

Documentation only. Every later milestone implements this contract.

- [x] Create `docs/protocol/mokabook-derived-baselines.md` (about 250 lines)
      covering: the `generatedOutput` option and its default; what `build`,
      `check`, Serve, export, and publication do in each mode; the rebuild
      procedure (resolve merge base, extract the commit with `git archive` into
      `.mokabook-cache/baselines/<commit>/source`, run the configured typed
      argv commands, adopt `mockupsDir` from the extraction into
      `.mokabook-cache/baselines/<commit>/output` with a completion marker);
      cache locking, reuse, invalidation when the merge base moves, and bounded
      cleanup of old commits; explicit failure states (missing history, failed
      install or build, interrupted rebuild, invalid rebuilt manifest); and the
      trust statement that rebuilding executes base-commit code.
- [x] Define the typed rebuild command config: `review.baselineBuild` as an
      ordered list of argv arrays run in the extraction root. The defaults are
      an npm clean install followed by the Mokabook build command for the
      configured config path, both invoked without a shell. Document that this
      repository's example must also build the package itself at the base
      commit.
- [x] Define the derived-mode `check` contract: compile and validate as today,
      require that no generated route or the manifest is tracked by Git, and
      report tracked paths as a typed failure with the ignore rule to add.
- [x] Define the derived-mode Git ignore requirement for `mockupsDir`: HTML
      routes and the manifest ignored, authored public files still tracked.
- [x] Update `mokabook-changes.md`, `mokabook-export.md`,
      `mokabook-source-protection.md`, `mokabook-timings.md`,
      `mokabook-on-demand.md`, `mokabook-live-evidence.md`, and
      `mokabook-package.md` so "the baseline is read, never rebuilt" becomes
      "the baseline is committed bytes or a cached rebuild; it is never rendered
      with the current tree's code". Add a `preparing` evidence state alongside
      the existing loading, unavailable, and complete states.
- [x] Add the new doc to `docs/protocol/README.md`; link this plan from
      `plans/README.md` under Active.
- [x] Validate Markdown with `npm run format:check`, check local link targets,
      review the diff, commit, and push.

## Milestone 2: Separate baseline reads from repository evidence — completed

Refactor with no behavior change. Everything still passes with committed
baselines.

- [x] Split `GitClient` in `src/review/git.ts` into `RepositoryEvidence`
      (`mergeBase`, `changedPaths`) and `BaselineReader` (`fileExists`,
      `fileKind`, `readFile`, `readFileBytes`, `readFiles`). Keep the Git
      implementation as `CommittedBaselineReader`.
- [x] Update every consumer in `src/review`, `src/server`, and `src/export` to
      depend on the two interfaces; `pinnedGit` in `src/export/inputs.ts`
      becomes a pinned evidence object plus an unchanged reader.
- [x] Update unit tests that stub `GitClient` to the new seams; keep the
      batching, symlink rejection, and budget tests intact.
- [x] Run `npm run format:check`, `npm run lint`, `npm run typecheck`,
      `npm test`, `npm run example:check`, and `cargo xtask check`; commit and
      push.

## Milestone 3: Rebuilt baseline builder and reader — completed

New `src/baseline/` module family. Unit tests inject the process runner, clock,
and filesystem; one integration test uses a real temporary Git repository with
a tiny consumer catalogue.

- [x] Add `src/baseline/cache_layout.ts`: paths under `.mokabook-cache/baselines`,
      completion marker format, and the lock file location.
- [x] Add `src/baseline/extract.ts`: `git archive <commit>` piped into the
      source directory, refusing to write outside it.
- [x] Add `src/baseline/commands.ts`: run the configured argv list in the
      extraction root with a bounded environment, captured output retained for
      the failure message, cancellation through `AbortSignal`, and no shell.
- [x] Add `src/baseline/rebuild.ts` behind a `BaselineBuilder` interface:
      acquire the lock, reuse a complete cache entry, otherwise extract, run
      commands, validate the produced manifest with the historical-manifest
      parser, adopt output, write the marker, and clean stale entries beyond a
      retained count.
- [x] Add `src/baseline/reader.ts`: `RebuiltBaselineReader` implementing
      `BaselineReader` over the cached output tree using the confined public
      file reader, rejecting symlinks and non-regular files exactly as the Git
      reader does.
- [x] Add typed errors: history unavailable, extraction failed, command failed
      with exit code and last output lines, interrupted rebuild, invalid rebuilt
      manifest, lock timeout.
- [x] Tests: cache hit skips commands; concurrent rebuilds of one commit share
      the lock; interrupted rebuild leaves no marker and is rebuilt next time;
      command failure surfaces the command and exit code; retained-count
      cleanup never removes the active commit; reader rejects symlinks.
- [x] Update `src/review/README.md` or add `src/baseline/README.md`.
- [x] Cover cache-setting collisions, stale-lock reclamation races, ancestor
      symlinks, compressed archives, and bounded filesystem batches; clarify
      the corresponding protocol boundaries.
- [x] Run `npm run format:check`, `npm run lint`, `npm run typecheck`,
      `npm test`, `npm run example:check`, and `cargo xtask check`; commit and
      push.

## Milestone 4: Config, build, and check modes

- [ ] Add `generatedOutput` and `review.baselineBuild` to `defineConfig`,
      `ResolvedConfig`, config validation, and `--help` output. Default is
      `committed`.
- [ ] Add a `TrackedGeneratedOutput` check used by derived-mode `check`: list
      Git-tracked files under `mockupsDir`, intersect with compiled routes and
      the manifest, and fail with the paths and suggested ignore rules.
- [ ] Keep `build` writing transactionally in both modes.
- [ ] Wire the composition root in `src/cli/run.ts` to choose
      `CommittedBaselineReader` or `BaselineBuilder` plus
      `RebuiltBaselineReader` from the mode.
- [ ] Tests for config parsing, both `check` modes, and composition selection.
- [ ] Update `README.md` and the package protocol CLI table.
- [ ] Run tests, typecheck, lint, `cargo xtask check`, commit, and push.

## Milestone 5: Design the preparing and failed baseline states — completed

Tags: mockup

- [x] Add a `preparing` Changes state to the shell design entries under
      `examples/basic/entries/design/` for mobile and desktop: tabs stay,
      Changes shows a spinner with product copy such as "Preparing comparison",
      and All stays usable.
- [x] Add a failed-rebuild state reusing the existing unavailable presentation
      with copy that names the outcome, not the command or cache path.
- [x] Keep owning pages within the five-screen limit; reuse screens in the
      relevant flow with links back.
- [x] Update the shell design protocol, build and check the example, run
      relevant tests, and visually inspect changed artifacts from disk.
- [x] Update the design-library inventory doc, the library authoring guide, and
      the example README so the catalogue-navigation variant list, the
      availability enum, and the screen and variant counts stay accurate.
- [x] Commit and push.

## Milestone 6: Serve, watch, and export integration

Tags: ui

- [ ] Serve derived mode: the background worker requests the baseline from the
      builder after HTTP readiness; publish the `preparing` evidence state
      until the cache entry is complete, then run the existing classification.
- [ ] Watched Serve: a Git ref change that moves the merge base schedules a new
      rebuild and cancels the running one; `--no-watch` resolves once.
- [ ] Export derived mode: rebuild synchronously before capture, pin the same
      commit for attribution and comparisons, and fail explicitly on rebuild
      errors. Recheck the marker in `assertInputsUnchanged`.
- [ ] Add `--debug-timings` phases for extraction, install, build, and adopt.
- [ ] Browser tests for preparing and failed states; integration test for a
      merge-base move during watch; export test against a real temporary repo.
- [ ] Update `mokabook-runtime.md`, `mokabook-live-evidence.md`, and
      `mokabook-timings.md` if implementation revealed gaps.
- [ ] Run tests, typecheck, lint, `cargo xtask check`, commit, and push.

## Milestone 7: Repository tooling for derived mode

- [ ] Add a repository-level baseline build for this repo's example:
      `["npm", "ci"]`, `["npm", "run", "build"]`,
      `["npm", "run", "example:build"]`, expressed in
      `examples/basic/mokabook.config.ts`.
- [ ] Add a derived-mode variant to the large fixture setup so the benchmark
      covers cold-cache first Changes and warm-cache restart; record the budget
      the benchmark enforces for each.
- [ ] Confirm `ci.yml` and `preview.yml` keep `fetch-depth: 0` and that the PR
      preview job installs the base commit's dependencies within the job's time
      budget; add npm cache for the base lockfile if needed.
- [ ] Run tests, typecheck, lint, `cargo xtask check`, commit, and push.

## Milestone 8: Switch this repository to derived output

Requires explicit user approval before deleting tracked files on `origin/main`.

- [ ] Obtain approval to remove the 261 tracked HTML files and the manifest
      under `examples/basic/generated`; record the approval in the commit body.
- [ ] Set `generatedOutput: "derived"` in the example config.
- [ ] Add ignore rules for `examples/basic/generated/**/*.html` and the
      manifest; keep the authored CSS tracked.
- [ ] `git rm --cached` the generated routes and manifest; verify
      `npm run example:check` passes in derived mode and
      `git diff --diff-filter=D --name-status origin/main` lists only the
      approved paths.
- [ ] Update `README.md`, `examples/basic/README.md`, and
      `docs/architecture/build-pipeline.md`.
- [ ] Run tests, typecheck, lint, `cargo xtask check`, commit, and push.

## Milestone 9: Review

- [ ] After the final push, review the complete local diff against
      `origin/main` using `docs/implementation-review-prompt.md`. Report
      numbered findings with severity, context, impact, lettered options, and a
      recommendation. Do not change the implementation.
