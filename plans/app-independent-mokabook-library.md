# App-Independent Mokabook Npm Library

<!-- markdownlint-disable MD013 -->

## Status

Active. Milestones 2–5 and the milestone-5A review hardening are implemented;
repository checks pass. The GitHub repository rename in milestone 2 remains an
external maintainer action. Commit, push, and the remaining post-push review
loop are in progress for this delivery.

## Summary

Extract the reusable Mokabook framework from Accounting into this repository,
remove its assumptions about Bookfolio and Accounting's filesystem, publish it
as `mokabook`, and prove it through neutral fixture catalogues. The
package will own structured registry definitions, static build/check, the
watched Browse server, Git-based Review artifacts, and public authoring helpers.

Accounting will retain its actual screens, use cases, page components, renderer
theme adapter, product styles/assets, generated HTML, and any temporary
Accounting-only compatibility rules. After the first public package release, a
separate Accounting workspace will replace the copied framework with the npm
dependency and delete only the superseded generic code. Juno migration is a
future change, but a Juno-shaped fixture must prove that the package boundary is
not Accounting-specific.

The target contracts are:

- [Package and authoring contract](../docs/protocol/mokabook-package.md)
- [Build, Browse, and Review runtime](../docs/protocol/mokabook-runtime.md)
- [CI and npm release contract](../docs/protocol/npm-release.md)

## Investigation Baseline

The plan was prepared on 19 July 2026 from these clean `main` snapshots:

| Repository          | Commit                                     | Purpose                               |
| ------------------- | ------------------------------------------ | ------------------------------------- |
| `futex-ai/mockbook` | `896a6ecfd26236b1695c7683e7acac73dc4efbc9` | Empty target before planned rename    |
| Accounting          | `50e422e442a6819f1aae0fbd038d99b519b72a72` | Framework source and current behavior |
| Juno                | `e41d1832dd1109b4d454c77507e2de867b084849` | Future-consumer layout check          |
| Firna UI            | `d36889be243a24f862d5d02539f15eca80e3fb7a` | Npm/CI/release convention reference   |

The Accounting framework candidate is approximately 71 source/style files and
9,571 lines, plus 18 focused framework/review test files and 4,314 test lines.
The candidate is broader than `docs/mockups/src/mockbook/**`: registry,
generation, bundling, loading, lints, id links, public Review-ignore helpers,
review summary generation, shell CSS, and frame assets are required for a
complete extraction.

The source cannot be copied unchanged:

- `core.ts`, registry discovery, manifests, and generated headers hard-code
  `docs/mockups` and include Accounting-only legacy route repair.
- `render.tsx` imports `@firna/ui`, React Native Web, and Accounting's theme
  tokens.
- stylesheet selection recognizes Accounting's `marketing/` and `email/`
  route families.
- watched Serve knows about `emails/src/templates.json` and watches framework
  source because the framework currently lives inside the consumer.
- Review shared-impact rules enumerate Accounting component, Firna-token, and
  generator paths.
- the server derives the repository root by assuming `docs/mockups` is exactly
  two levels below it.
- large modules such as the 902-line `core.ts` and 484-line Review artifact
  renderer should be decomposed instead of transplanted.

### Implementation Re-Audit

Immediately before milestone implementation on 19 July 2026, `origin/main` in
this repository remained at `896a6ecfd26236b1695c7683e7acac73dc4efbc9`.
Accounting `origin/main` had advanced from the investigation baseline to
`fdd0049a6fb195d4ac59250c0df797302565e58f`. The intervening mockup diff added
one product entry module and generated assistant-reply fragments, and changed
product pages, a product test, `app.css`, and the generated v2 manifest. No
framework, registry, renderer, server, watch, Review, authoring-helper, lint, or
bundler candidate changed. The extraction baseline therefore remains valid;
the new product screens and generated HTML remain excluded.

Juno already uses React-backed `.source.tsx` files and committed HTML under
`docs/mockups`, but its component registry, stylesheets, workspace package, and
directory hierarchy differ. This confirms that renderer, paths, legacy policy,
watch inputs, and shared-impact rules must be host configuration.

Npm availability was rechecked after the name was confirmed: on 19 July 2026,
`npm view mokabook` returned `E404`, so the unscoped name appeared unclaimed.
Unscoped `mockbook@0.0.1` existed under another owner. Recheck `mokabook`
immediately before the bootstrap publish because availability is not reserved
by this plan.

## Ownership Boundary

| Move into `mokabook`                             | Keep in Accounting                        | Make configurable                           |
| ------------------------------------------------ | ----------------------------------------- | ------------------------------------------- |
| Registry types/helpers and tree flattening       | `src/entries/**` definitions              | Mockups, entries, legacy, and repo roots    |
| Manifest, fragments, discovery, validation       | `src/pages/**` and generated product HTML | Renderer module and stylesheet rules        |
| Generic legacy generation and lints              | Product components and fixture data       | Legacy aliases, allowlists, and lint policy |
| `mock:` links and link/anchor validation         | `@firna/ui` theme/token adapter           | Additional watch inputs and action          |
| Browse server, shell, client, and nav tree       | App/marketing/email CSS and assets        | Review base/output and shared-impact globs  |
| Watch/rebuild/reload lifecycle                   | Email template source                     | Shell accent variables                      |
| Review compare/artifact/JSON/summary             | Product protocol and mockup docs          | Consumer CI path filters/artifact name      |
| Review-ignore helpers/material hashing           | Product-specific Review-ignore wrappers   | Optional version 2 manifest compatibility   |
| Neutral shell/frame CSS and licensed font assets | Accounting-only route repair              | Legacy component-expansion adapter          |

Every candidate file and behavior will receive one recorded disposition before
Accounting deletes anything. “Rewritten as configuration” counts as extracted;
silently dropping behavior does not.

## Decisions

- Publish one public ESM package, `mokabook`, with one `mokabook` bin.
- Use the intentional Mokabook spelling for package, executable, configuration,
  manifest, shell, and new documentation. Do not publish `mockbook` aliases.
- Document `npx mokabook` for both zero-install and local dependency use.
- No-argument CLI behavior is watched `serve`; explicit `build`, `check`, and
  `review` subcommands preserve the current complete workflow.
- Discover a typed `mokabook.config.*` from the working directory. All consumer
  paths resolve from that file.
- Emit manifest schema version 3 with repo-relative paths. Read version 2 only
  during the Accounting transition.
- Provide a plain React renderer and a consumer renderer hook; do not depend on
  `@firna/ui` or React Native Web.
- Keep static fragments and manifests committed in consumer repositories.
- Use synthetic mobile/desktop screens in examples and tests; publish no real
  Accounting or Juno screen code or output.
- Follow Firna UI's release-please plus npm trusted-publishing model, updated to
  current npm/action requirements and adapted for a CLI package.
- Deliver in two product commits/PRs: the library/release work in this repo,
  then the dependency cutover and generic-code deletion in Accounting.

## Goals

- Preserve all reusable Build, Check, Browse, watched-development, Review, and
  Review-ignore behavior from the audited Accounting snapshot.
- Make repository shape, renderer, styles, and app compatibility explicit.
- Support a clean `npx mokabook` path and deterministic local dependency
  use in CI.
- Provide fully typed public APIs, actionable errors, complete docs, and packed
  package tests.
- Release through a reviewed release PR and tokenless OIDC publishing.
- Leave Accounting with screens and adapters only, not a second framework fork.

## Non-Goals

- Moving Accounting or Juno screens, product use cases, generated HTML, product
  CSS, theme tokens, email data, or application components into this repo.
- Migrating Juno to Mokabook in this change.
- Hosting Mokabook as a deployed service or adding cloud visual-diff storage.
- Making product fragments interactive or replacing consumer component tests.
- Preserving undocumented Accounting path-repair behavior as a global default.
- Publishing the package before a packed-tarball Accounting compatibility run.

## Milestone 1: Contract And Extraction Baseline

Summary: establish a complete, reviewable target contract before implementation.

- [x] Audit this repository, Accounting's current framework, Juno's future
      consumer shape, and Firna UI's npm/release conventions.
- [x] Record immutable source snapshots and quantify the candidate framework and
      test surface.
- [x] Define package identity, CLI behavior, config discovery, registry/output,
      renderer, legacy, Browse, Review, watch, CI, and release contracts under
      `docs/protocol`.
- [x] Record the move/keep/configure boundary and explicitly exclude real
      product screens.
- [x] Expand the root README and create `plans/README.md` with this active plan.
- [x] Verify current npm name availability and confirm `mokabook` is the
      intentional package, executable, and product spelling.

At this milestone the target behavior is specified without changing runtime
code in any repository.

## Milestone 2: Repository And Package Foundation

Summary: create a buildable, testable npm CLI/library skeleton whose help and
public exports work before framework behavior is ported.

- [x] Fetch `origin/main`, preserve its additions, and confirm the Accounting
      source tip has not moved; if it has, audit the new framework diff and
      update the baseline before copying code.
- [ ] Coordinate renaming the GitHub repository from `futex-ai/mockbook` to
      `futex-ai/mokabook`, update the local `origin`, and verify redirects and
      repository settings without renaming the current branch.
      Blocked pending explicit maintainer authorization for the external
      repository rename. Package metadata already targets the intended URL;
      the current branch and `origin` have not been renamed silently.
- [x] Create `package.json`/lockfile for public ESM `mokabook@0.0.0`,
      using npm commands to add current dependencies rather than guessing
      versions.
- [x] Add exact repository metadata, MIT `LICENSE`, `CHANGELOG.md`, Node engine,
      package manager, `files`, `exports`, types, `bin`, and public
      `publishConfig` fields from the release protocol.
- [x] Establish short, cohesive `src` module families for CLI, config,
      authoring, build, registry, legacy, server, client, review, and errors;
      target about 200 lines and do not transplant the Accounting monoliths.
- [x] Add a shebang-safe `mokabook` executable with `--help`, `--version`,
      default-serve dispatch, explicit subcommands, and typed option errors.
- [x] Add TypeScript build/typecheck, formatter/linter, and test scripts with no
      unexplained exclusions from typechecking.
- [x] Add the Cargo workspace and small trait-backed `xtask` used by
      `cargo xtask check` and `cargo xtask review`, with Rust tests and crate
      README following repository rules.
- [x] Add package metadata/export/bin unit tests and make the production build
      succeed before continuing.
- [x] Update README developer setup and code-jumping points for the real
      scaffold without claiming unfinished commands work.

At this milestone `npm run build`, package imports, `mokabook --help`, and the
initial `xtask` tests work even though catalogue commands may report a clear
not-yet-configured error.

## Milestone 3: Config, Authoring API, And Migration Ledger

Summary: replace source-repository assumptions with a typed host boundary and
port the pure public registry/review helpers.

- [x] Write failing tests for config discovery from nested directories, an
      explicit config path, npx-cache execution, npm workspaces, missing config,
      invalid paths, path traversal, and conflicting generated/source roots.
- [x] Implement `defineConfig` and typed config loading for mockups/entries/
      legacy roots, renderer, stylesheets, watch inputs, Review paths, and
      compatibility policy exactly as specified.
- [x] Port and document `defineScreen`, `defineCollection`, `defineUseCase`,
      `defineRoot`, `collection`, `screen`, `mockLink`, `MockLink`,
      `ReviewIgnore`, `ReviewIgnoreScope`, and `reviewMaterialKey`.
- [x] Ensure renderer and entry bundling resolves one React instance and works
      both from a local install and a transient npx package cache.
- [x] Implement a neutral default renderer plus a documented consumer renderer
      module contract; add a test-only custom renderer that wraps context and
      injects collected styles.
- [x] Create `docs/migration/accounting-framework-inventory.md`, listing every
      candidate Accounting file/behavior as ported, rewritten into config,
      retained in Accounting, product-specific test, or intentionally obsolete
      with rationale.
- [x] Add architecture documentation explaining package-owned versus
      consumer-owned dependencies and why app compatibility hooks cannot leak
      into defaults.
- [x] Run unit tests, typecheck, build, and file-size checks for this milestone.

At this milestone a neutral config and registry can be imported and validated
from a clean external fixture with no Accounting dependencies.

## Milestone 4: Static Build, Check, And Legacy Compatibility

Summary: port deterministic generation and validation behind the new config,
with transactional output and explicit legacy extensions.

- [x] Add failing regressions for stale/missing/orphan output, duplicate ids and
      routes, fragment collisions, missing relationships, invalid routes,
      unresolved id/raw/anchor links, missing stylesheets, and unsafe deletes.
- [x] Port registry discovery/attribution, nested flattening, validation,
      fragment rendering, schema version 3 manifest generation, and version 2
      read compatibility.
- [x] Port generic `.source.ts`, `.source.tsx`, and `.source.html` discovery,
      bundling, component expansion, source linting, stage/screen limits, link
      checks, and generated-file ownership.
- [x] Extract Accounting legacy route aliases, flat-family rules, allowlists,
      renderer, and stylesheet selection into fixture/consumer adapters; none
      may remain in framework defaults.
- [x] Implement an in-memory/staged generation transaction so failed rendering,
      validation, or linking preserves all last-good files.
- [x] Implement `mokabook build` and read-only `mokabook check` with sorted,
      grouped, actionable diagnostics and non-zero failure behavior.
- [x] Prove deterministic paths/bytes on macOS and Linux path semantics and
      ensure absolute checkout paths never enter output.
- [x] Port applicable Accounting tests first, remove product assertions, and add
      config-boundary and security coverage for every rewritten assumption.
- [x] Update package/API docs and protocol ambiguities discovered while porting.
- [x] Run focused tests, the full unit/integration suite, typecheck, and build.

At this milestone a headless fixture catalogue builds, checks byte-stably, and
retains its previous generated output after a deliberate failed build.

## Milestone 5: Server, Watch, And Review Engines

Summary: port non-visual runtime behavior before implementing the package-owned
shell UI.

- [x] Port manifest loading/validation, catalogue and navigation models, safe
      route resolution, id redirects, static-file confinement, and Review route
      orchestration behind injected filesystem/Git/process boundaries.
- [x] Port the watched child supervisor, notification gate, debouncing,
      transactional rebuild/rollback, stable port handling, update stream,
      state-recovery protocol, startup readiness, and clean shutdown.
- [x] Replace package-source/runtime self-watch assumptions with config-derived
      consumer input classes; package development uses repository tooling.
- [x] Port Git base resolution/extraction, inventory, per-route/per-viewport
      comparison, shared-impact classification, Review-ignore normalization,
      aggregate ignored impact, artifact model, deterministic `review.json`,
      and CI summary generation.
- [x] Model filesystem, Git, process, watcher, clock, and server collaborators
      behind typed interfaces so unit tests use fakes rather than real ambient
      state; reserve real implementations for integration tests.
- [x] Add failure-first coverage for manifest-before-bind, occupied ports,
      port `0`, notification buffering, failed rebuild recovery, restart order,
      no watch loops, base-ref failures, malformed ignore regions, and path
      traversal.
- [x] Add integration tests for no-watch server routes, watched CLI lifecycle,
      review artifact contents, and process cleanup.
- [x] Keep implementation modules below the repository size target and update
      runtime docs with any resolved lifecycle detail.

At this milestone the server/runtime engines and static Review model work via
integration tests and simple diagnostic responses, without landing the final UI.

## Milestone 5A: Engine Review Hardening

Summary: resolve independently validated post-push findings without mixing in
the deferred Browse/Review UI.

- [x] Centralize Review output overlap validation for config, CLI overrides, and
      transactional artifact writes.
- [x] Make Review paths collision-free, preserve complete pane documents, and
      copy referenced local CSS/binary assets into isolated base/head snapshots.
- [x] Sandbox consumer documents in Browse and Review and reject realpath-based
      source exposure through static symlinks.
- [x] Resolve config imports from the consumer graph, strengthen generated-file
      ownership, and align authored/manifest repository-path validation.
- [x] Attach and clean up watched inputs before initial generation so startup
      changes cannot be lost and readiness failures leak no watcher.
- [x] Restore one-sided Review material-signal behavior, narrow verification
      documentation to the implemented gate, and add regression coverage.
- [x] Reject raw links to logical catalogue routes while retaining generated
      fragment and confined public-asset links.
- [x] Reject generated targets beneath authored roots at both compilation and
      transactional writer boundaries, including symlink-resolved paths.
- [x] Distinguish current engine guarantees from deferred release-ready Browse
      shell and browser-coverage requirements in the runtime protocol.
- [x] Validate Review-ignore and material markers during compilation and for
      one-sided added/removed Review panes.
- [x] Exclude the active Review output directory from Git changed-path and
      shared-impact evidence, including a CLI `--out` override.
- [x] Fall back to the compatibility v2 manifest only when the canonical v3
      manifest is absent, never when a present v3 manifest is invalid.
- [x] Describe the current diagnostic Review index/per-viewport pages without
      claiming the deferred grouped and combined-viewport UI.
- [ ] Run focused tests, the full `cargo xtask check`, commit, push, and repeat
      `cargo xtask review` under the invoked review loop.

At this milestone the milestone-5 engines satisfy their safety and lifecycle
contracts and have no remaining valid post-push review findings.

## Milestone 6: Neutral Mokabook And Fixture Design

Tags: mockup

Summary: specify the package-owned Browse and Review experience using only
synthetic catalogue data before UI implementation.

- [ ] Create a neutral example catalogue with at least two standalone screens,
      one nested collection, one use case, id links, related docs/dependencies,
      custom stylesheet rules, and one safe Review-ignore example.
- [ ] Give every synthetic screen a distinct mobile and web/desktop component;
      keep fixture data under examples/tests and never present it as real
      product data.
- [ ] Create standalone mobile and desktop Mokabook Browse mockups for home,
      selected screen/use case, details, missing route, and narrow navigation.
- [ ] Create separate mobile and desktop Review mockups for changed, added,
      removed, shared-impact, ignored-only, and empty comparison states; split
      pages before any generated screen-spec page exceeds five screens.
- [ ] Use the existing Accounting Mokabook prototypes only as behavioral/visual
      reference; remove Bookfolio names, product screens, routes, data, colors,
      and theme dependencies from the new designs.
- [ ] Ensure each design is reachable from the example navigation and that
      implementation notes live outside rendered screen areas.
- [ ] Build/check/test/typecheck the example mockups and open every changed
      mobile/desktop page directly for visual smoke testing.
- [ ] Record the approved CSS custom properties and responsive behavior in the
      protocol before the UI milestone begins.

At this milestone reviewers can inspect the complete neutral Browse/Review
design and example catalogue without any Accounting screen being present.

## Milestone 7: Browse And Review UI

Tags: ui

Summary: implement the responsive package-owned shell and Review artifact UI
against the completed engines and approved mockups.

- [ ] Implement self-contained shell/frame CSS, licensed font assets, icons,
      server-rendered markup, and details/navigation views matching the mobile
      and desktop mockups; do not require consumer gallery CSS.
- [ ] Implement screen fragment frames, viewport controls, use-case steps,
      legacy embedding, missing-route views, search, changed/all filtering,
      breadcrumbs, and details disclosure from the runtime models.
- [ ] Implement progressive Browse navigation with eligible-link interception,
      latest-wins requests, History API restoration, active-row/title updates,
      escaped frame cleanup, focus management, announcements, and native
      fallback behavior.
- [ ] Implement update-stream reconnection and one-shot directory-state recovery
      after successful development rebuilds/restarts.
- [ ] Render Review summary and compare pages with side-by-side, overlay,
      difference, viewport, shared-impact, and ignored-impact views from the
      engine's artifact model.
- [ ] Add semantic, keyboard, focus, reduced-motion, contrast, zoom, and
      JavaScript-disabled coverage for both shell variants.
- [ ] Add Playwright regressions for durable links, multiple in-document
      navigations, Back/Forward, overlapping/failing requests, state retention,
      responsive layout, Review switching, updates, and clean shutdown.
- [ ] Visually smoke every implemented state against the approved mockups and
      record any intentional difference before changing the design source.

If missing backend work is discovered here, insert a new backend milestone and
then a new `Tags: ui` milestone as required by repository rules; do not mix it
into this milestone.

At this milestone `mokabook serve` is a complete, accessible, watched Browse and
Review experience over the neutral catalogue.

## Milestone 8: Packed Package And Cross-Repository Parity

Summary: prove the published artifact contains the whole framework and no app,
and that it works in realistic consumer layouts before release automation is
enabled.

- [ ] Build the production distribution and inspect `npm pack --dry-run --json`
      against an explicit allowlist; verify no Accounting/Juno source, examples,
      tests, plans, caches, or review artifacts enter the tarball.
- [ ] Install the real tarball in clean ESM and NodeNext consumers and test all
      public exports, declarations, `mokabook` bin, help/version, config
      discovery, build/check/serve/review, and local `npx mokabook` behavior.
- [ ] Add a clean-cache smoke that executes the package the way
      `npx mokabook` does and proves entry imports still resolve the
      executing package plus consumer dependencies.
- [ ] Build/check/serve/review an Accounting-shaped fixture using a custom Firna
      renderer, multiple stylesheet families, legacy aliases, external watch
      input, and shared-impact globs.
- [ ] Build/check/serve a Juno-shaped fixture with different roots, components,
      styles, and no Accounting adapter.
- [ ] In a temporary Accounting worktree, install the tarball and draft only the
      app-owned config/renderer/compatibility bridge; run existing Mokabook
      gates and compare ids, routes, fragment DOM/styles, Browse behavior, and
      Review classification with the source implementation.
- [ ] Treat schema/header/path changes documented by the version 3 migration as
      intentional; investigate every other parity difference before release.
- [ ] Complete the file/behavior migration ledger with no unexplained source
      candidate and prove product-specific tests remain in Accounting.
- [ ] Run the entire unit, integration, browser, type, build, and package smoke
      suite with a 100% pass rate.

At this milestone the packed tarball—not a source checkout—passes neutral,
Accounting-shaped, Juno-shaped, and temporary real-Accounting acceptance.

## Milestone 9: CI, Release Automation, And Documentation

Summary: make every change release-gated and prepare tokenless, repeatable npm
publishing without publishing yet.

- [ ] Add PR/main CI with minimal permissions, concurrency, the minimum Node
      runtime, the current Firna release runtime, Linux `cargo xtask check`,
      Chromium, package-tarball smoke, and a required result aggregator.
- [ ] Use current stable GitHub Actions and release-please majors at
      implementation time (the planning audit found checkout/setup-node v6 and
      release-please-action v5); apply the repository's reviewed pinning policy.
- [ ] Add release-please Node configuration so Conventional Commits maintain a
      reviewed release PR, changelog, package/lock versions, `vX.Y.Z` tag, and
      GitHub release.
- [ ] Add the same-workflow npm publish path with a GitHub-hosted runner, no
      release dependency cache, trusted-publishing-compatible Node/npm,
      `id-token: write` only on publish, full checks, tag/version validation,
      tarball inspection/smoke, and an already-published guard.
- [ ] Add a manual `publish_ref` retry for an existing immutable tag; never
      rebuild from an unrelated branch or move an existing tag.
- [ ] Test workflow structure and shell branches, including ordinary main
      pushes, release-PR formatting, no-release output, tag mismatch, existing
      npm version, failed checks, and manual retry.
- [ ] Document required GitHub settings, release-please credential behavior,
      Firna npm membership/2FA, public access, the first `0.0.0` bootstrap tag,
      exact trusted-publisher workflow/environment/action, token restriction,
      and `0.1.0` verification.
- [ ] Finish README install/CLI/config/examples/troubleshooting/release sections,
      API docs, architecture docs, migration ledger, and protocol alignment.
- [ ] Recheck current official npm trusted-publisher, npm-exec/bin, provenance,
      and release-please requirements immediately before finalizing workflows.

At this milestone the branch is release-ready, but no irreversible npm publish
has happened.

## Milestone 10: Target Verification, Commit, Push, And Review

Summary: complete this repository's required quality and review workflow for
the library pull request.

- [ ] Run formatter and lint checks.
- [ ] Run TypeScript typecheck and require no unexplained exclusions.
- [ ] Run all unit and integration tests with a 100% pass rate.
- [ ] Run the example build/check twice and require byte-stable output.
- [ ] Run the full Playwright/browser suite and watched/no-watch CLI smokes.
- [ ] Run production build, `npm pack --dry-run --json`, packed-tarball consumer
      tests, clean-cache npx-style smoke, and dependency/license inspection.
- [ ] Run `cargo fmt --all -- --check`, Clippy with warnings denied, all Rust
      tests, and applicable Rust source/file-length audits.
- [ ] Start `mokabook serve` from the packed example and manually smoke home,
      screen, collection expansion, use case, id redirect, missing route,
      static fragment, Review, watch rebuild/reload/failure recovery, and clean
      shutdown.
- [ ] Run `cargo xtask check` and require a 100% pass rate.
- [ ] Fetch `origin/main`, audit its additions from the captured source tip, and
      inspect `git diff --name-status origin/main` plus deletion-only output;
      stop on unauthorized mainline removal or unrelated changes.
- [ ] Update completed TODOs and docs, then run `git add -A`, commit all source,
      tests, assets, generated example artifacts, docs, and plan changes with a
      Conventional Commit title of at most 50 characters, and push the current
      branch without renaming it.
- [ ] Run `cargo xtask review` only after the push so it reviews the complete
      diff against `origin/main`.
- [ ] Do not automatically fix review findings. Report every finding as a
      numbered item with severity, feature/codebase context, impact of doing
      nothing, lettered solution options, and a recommended option that
      considers class-wide prevention.

At this milestone the Mokabook library PR is fully verified, pushed, and
reviewed. The plan remains active until release/bootstrap and Accounting cutover
are complete.

## Milestone 11: First Package Release

Summary: after the library PR merges, reserve the unscoped package safely,
activate OIDC publishing, and produce the first supported release.

- [ ] Confirm the merge commit on `main` matches the reviewed code and all
      required GitHub checks passed.
- [ ] Recheck that `mokabook` is available and pause for explicit
      maintainer approval before the irreversible first publish.
- [ ] From the exact checked `main` commit at `0.0.0`, rerun all checks, inspect
      the tarball, and manually publish it publicly under the documented
      bootstrap dist-tag solely to create the package.
- [ ] Configure the npm trusted publisher for the unscoped `mokabook` package,
      `futex-ai/mokabook`, the exact release workflow filename, optional
      protected environment, and `npm publish`; verify approved Firna
      maintainers, package owners, and 2FA.
- [ ] Restrict traditional token publishing and remove any obsolete npm write
      token after the trust relationship is proven.
- [ ] Merge the release-please `0.1.0` PR and verify the same workflow creates
      the immutable tag/GitHub release and publishes with provenance.
- [ ] From a clean directory, verify npm metadata, README, license, tarball
      contents, provenance, dist tags, `npx mokabook --version`, and a
      minimal generated/served fixture.
- [ ] Record release evidence and any manual recovery step in the release docs.

At this milestone `mokabook@0.1.0` is the first supported public version
and future releases are tokenless and release-PR controlled.

## Milestone 12: Accounting Consumer Cutover

Summary: in a separate Accounting Conductor workspace, replace the in-repo
framework with the released dependency while preserving every actual screen and
generated product artifact.

- [ ] Create and index an Accounting consumer-migration plan, update its
      Mokabook protocol/README first, and capture the latest source tip and
      `origin/main` additions before editing.
- [ ] Install an explicit compatible `mokabook` development dependency
      and update the Accounting lockfile using npm.
- [ ] Add Accounting-owned `mokabook.config.ts`, Firna UI/React Native Web
      renderer, stylesheet rules, external email watch input, Review impact
      globs, legacy aliases/allowlists, and any temporary version 2 bridge.
- [ ] Update root and TypeScript npm scripts to call the installed `mokabook`
      bin for build/check/test/serve/review, retaining stable developer command
      names where useful.
- [ ] Update Accounting CI's blocking mockup gates and non-blocking
      `mokabook-review` artifact/summary job to use the package and PR merge base.
- [ ] Preserve every Accounting entry, page, component, product style/asset,
      Mokabook-related protocol requirement, generated fragment, route, id,
      relationship, and actual screen; regenerate only documented schema/header
      differences.
- [ ] Delete only framework files marked “ported” in the migration ledger after
      package parity is green. Keep consumer adapters and product-specific tests;
      audit every deletion against `origin/main` as an authorized replacement,
      never a feature removal.
- [ ] Run Accounting mockup build/check/test/browser/typecheck, Review against
      `origin/main`, direct-file and watched server smokes, plus the full
      `cargo xtask check` suite.
- [ ] Inspect product-fragment and manifest differences, links, orphan cleanup,
      and Review classification; resolve every unexplained difference.
- [ ] Commit and push the Accounting change with a Conventional Commit, then run
      its required post-push `cargo xtask review` and report findings without
      automatically fixing them.
- [ ] Do not modify Juno in this milestone; add only a concise future migration
      handoff if its fixture exposed consumer work.

At this milestone Accounting contains no duplicate generic Mokabook framework,
uses the public package, and retains all real screen/spec content.

## Milestone 13: Close The Extraction Plan

Summary: record the released/consumed result in this repository and close the
plan only after both delivery repositories are verified.

- [ ] Update the migration ledger with the released version, Mokabook merge/tag,
      Accounting cutover commit, intentional output changes, and any deferred
      compatibility removal.
- [ ] Update README/protocol docs with the proven install and consumer behavior;
      remove planning-only language that is no longer true.
- [ ] Mark every milestone complete and move this plan from Active to Completed
      in `plans/README.md` only when no required task remains.
- [ ] Validate changed Markdown and inspect the final target-repo diff and
      deletions against `origin/main`.
- [ ] Commit and push the closeout documentation with a Conventional Commit,
      then run `cargo xtask review` post-push and report any findings using the
      required numbered severity/context/impact/options/recommendation format.

## Definition Of Done

- `mokabook` contains every reusable behavior in the migration ledger,
  has no product screen dependency, and passes all source and packed-artifact
  tests.
- `npx mokabook` serves a configured consumer catalogue; a local install
  supports `npx mokabook` and all explicit subcommands.
- Neutral and Juno-shaped fixtures prove app independence; a real Accounting
  cutover proves production-scale parity.
- CI blocks broken code/generated output, Review provides non-blocking visual
  evidence, and release-please plus npm OIDC publishes reviewed tags.
- Accounting no longer owns a generic framework fork and no actual Accounting
  screen, route, use case, generated artifact, or product documentation is
  lost.
