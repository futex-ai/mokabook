# Accounting Framework Migration Inventory

## Baseline And Meanings

This ledger covers the reusable candidate at Accounting commit
`50e422e442a6819f1aae0fbd038d99b519b72a72`. It is the deletion guard for the
later Accounting cutover; nothing in Accounting should be deleted merely
because a similarly named Mokabook module now exists.

The implementation re-audit compared that commit with Accounting `origin/main`
at `fdd0049a6fb195d4ac59250c0df797302565e58f`. Only product entry/page/test/CSS
and generated artifact paths changed; no candidate in this ledger changed.

- **Ported**: behavior exists in this package, normally split into smaller files.
- **Config**: generic mechanism moved here; Accounting data/policy becomes an adapter.
- **Retained**: application-owned code remains in Accounting.
- **Deferred UI**: useful behavior belongs to the package but is scheduled for
  the separate neutral Browse/Review UI milestones, not milestones 2–5.
- **Obsolete**: superseded implementation detail has no consumer-facing behavior.

## Root Build And Authoring Files

| Accounting path under `docs/mockups/src/` | Disposition         | Mokabook owner or rationale                                                          |
| ----------------------------------------- | ------------------- | ------------------------------------------------------------------------------------ |
| `build.cjs`                               | Ported              | `src/cli`, `src/build/compile.ts`, and transactional writer                          |
| `bundle_registry_entries.cjs`             | Obsolete            | Async esbuild graph loads directly; no blocking helper child                         |
| `core.ts`                                 | Ported/Config       | Split across build, legacy, registry, paths, links, and ownership modules            |
| `ensure_links.cjs`                        | Ported              | `src/build/html_links.ts`                                                            |
| `legacy_screen_lint.ts`                   | Ported/Config       | Generic opt-in `legacy.lint.maxScreensPerPage`                                       |
| `link_scan_lint.ts`                       | Ported              | Generated href and anchor validation                                                 |
| `mock_links.ts`                           | Ported              | Viewport-aware id resolution in `src/build/render.ts`                                |
| `page_bundler.cjs`                        | Ported/Config       | Single consumer graph in `src/build/load_graph.ts`; no RNW alias default             |
| `register.cjs`                            | Obsolete            | esbuild handles TypeScript/TSX; no global require hook                               |
| `registry.tsx`                            | Ported              | Public helpers under `src/authoring`                                                 |
| `review.cjs`                              | Ported              | `mokabook review` CLI dispatch                                                       |
| `review_summary.cjs`                      | Ported              | Deterministic `summary.md` in `src/review/artifact.ts`                               |
| `screen_cap_lint.ts`                      | Ported/Config       | Legacy maximum is explicit; structured screens are one definition each               |
| `serve.cjs`                               | Ported              | `mokabook serve` and default CLI command                                             |
| `serve_child.cjs`                         | Ported              | Typed hidden child in `src/server/child.ts`                                          |
| `serve_runtime.cjs`                       | Ported              | Server and supervisor module families                                                |
| `source_lint.ts`                          | Ported in principle | Structured exports are runtime/type validated; product source rules stay consumer CI |
| `stage_id_lint.ts`                        | Ported/Config       | `legacy.lint.requireStageIds` with `data-mokabook-stage`                             |
| `stylesheet_link_lint.ts`                 | Ported/Config       | Declarative rules plus existence and link checks                                     |
| `component_utils.ts`                      | Config              | Generic expansion is package-owned; React render helper runs in consumer graph       |
| `components.tsx`                          | Retained            | Accounting's comment-component names and output are its legacy adapter               |
| `email_template_data.tsx`                 | Retained            | Accounting email data; may be an explicit watch input                                |
| `render.tsx`                              | Retained            | Accounting theme, `@firna/ui`, and React Native Web style adapter                    |
| `.gitignore`                              | Retained            | Consumer build-directory policy                                                      |
| `_shims.d.ts`                             | Retained            | Accounting-only module declarations                                                  |

The public helpers `components/mock_link.tsx` and
`components/review_ignore.tsx` are **Ported** to `src/authoring/links.tsx` and
`src/authoring/review_ignore.tsx`. Accounting may keep thin product wrappers
only if their props add real application policy.

## Registry Directory

| Accounting file                | Disposition   | Mokabook owner                                  |
| ------------------------------ | ------------- | ----------------------------------------------- |
| `registry/discovery.ts`        | Ported        | build discovery and single-graph loader         |
| `registry/entry_validation.ts` | Ported        | `registry/prepare.ts`                           |
| `registry/fragment_page.tsx`   | Ported/Config | neutral default plus renderer hook              |
| `registry/fragments.ts`        | Ported        | manifest fragment routes and renderer viewports |
| `registry/hrefs.ts`            | Ported        | stylesheet-relative and id-link resolution      |
| `registry/manifest.ts`         | Ported        | schema version 3 writer and version 2 reader    |
| `registry/pipeline.ts`         | Ported        | in-memory compiler                              |
| `registry/types.ts`            | Ported        | public authoring and manifest types             |
| `registry/validation.ts`       | Ported        | registry preparation and collision checks       |

## Browse Runtime Directory

| Accounting file under `mockbook/` | Disposition   | Mokabook owner or rationale                                          |
| --------------------------------- | ------------- | -------------------------------------------------------------------- |
| `catalogue.ts`                    | Ported        | manifest indexes in `server/catalogue.ts`                            |
| `server.ts`                       | Ported        | confined HTTP runtime in `server/http.ts`                            |
| `server_cli.ts`                   | Ported        | typed CLI arguments and dispatch                                     |
| `server_options.ts`               | Ported        | validated CLI/config options                                         |
| `server_updates.ts`               | Ported        | monotonic child update messages, readiness, and SSE endpoint         |
| `dev/child_process.ts`            | Ported        | injected `ChildHandle`/`ChildFactory` boundary                       |
| `dev/process_supervisor.ts`       | Ported        | serialized, readiness-aware stable-port/version supervisor           |
| `dev/rebuild.ts`                  | Ported        | compile then transactional write before restart                      |
| `dev/rebuild_worker.cjs`          | Obsolete      | rebuild runs through typed async APIs; no worker shim                |
| `dev/run.ts`                      | Ported        | `server/serve.ts` orchestration                                      |
| `dev/watch_notification_gate.ts`  | Ported        | generic `NotificationGate`                                           |
| `dev/watch_paths.ts`              | Ported/Config | derived entries/legacy/renderer/styles plus explicit rules           |
| `nav_tree.ts`                     | Deferred UI   | structural entries are in manifest; final visual tree is milestone 7 |
| `nav_guides.ts`                   | Deferred UI   | navigation guidance belongs to neutral shell design                  |
| `client_bundle.ts`                | Deferred UI   | final progressive client bundle is milestone 7                       |
| `client/browser_navigation.ts`    | Deferred UI   | native/fallback navigation behavior retained as UI reference         |
| `client/directory_state.ts`       | Deferred UI   | final shell state restoration is milestone 7                         |
| `client/entry.ts`                 | Deferred UI   | package client entry is created with the final UI                    |
| `client/live_updates.ts`          | Ported engine | latest-wins reload and one-shot recovery are package-owned           |
| `client/navigation.ts`            | Deferred UI   | progressive enhancement follows approved neutral mockups             |
| `client/route_dom.ts`             | Deferred UI   | final main-view replacement belongs to milestone 7                   |
| `icons.tsx`                       | Deferred UI   | Accounting icons are reference only; neutral assets must be selected |
| `shell.tsx`                       | Deferred UI   | diagnostic server is intentionally plain in milestone 5              |
| `shell_details.tsx`               | Deferred UI   | final neutral details panel is milestone 7                           |
| `shell_head.tsx`                  | Deferred UI   | final package head/assets are milestone 7                            |
| `shell_nav.tsx`                   | Deferred UI   | final neutral navigation is milestone 7                              |
| `shell_scripts.ts`                | Deferred UI   | final progressive scripts are milestone 7                            |
| `shell_stages.tsx`                | Deferred UI   | final frames/use-case composition are milestone 7                    |
| `shell_view.tsx`                  | Deferred UI   | final route view is milestone 7                                      |

## Review Directory

| Accounting file under `mockbook/review/` | Disposition                    | Mokabook owner                                                                         |
| ---------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------- |
| `compare.ts`                             | Ported                         | per-route/per-viewport comparison in `review/compare.ts`                               |
| `git_base.ts`                            | Ported                         | injected Git object reader; no checkout                                                |
| `ignored_impact.ts`                      | Ported                         | aggregate id/viewport evidence                                                         |
| `inventory.ts`                           | Ported                         | base/head screen maps and fragment inventory                                           |
| `review_ignore.ts`                       | Ported                         | fail-closed pair normalization                                                         |
| `review_json.ts`                         | Ported                         | deterministic schema-v1 `review.json`                                                  |
| `review_material.ts`                     | Ported                         | public stable SHA-256 material keys                                                    |
| `run.ts`                                 | Ported                         | check-before-compare orchestration                                                     |
| `artifact.tsx`                           | Ported for engine; Deferred UI | complete before/after panes and diagnostic pages exist; polished modes are milestone 7 |

## Styles, Fonts, And Generated State

| Accounting path                                    | Disposition          | Rationale                                                                     |
| -------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------- |
| `docs/mockups/mockbook.css`                        | Deferred UI/Retained | visual reference only; package will own neutral CSS, not copy product styling |
| `docs/mockups/fonts/InterVariable.woff2`           | Retained             | consumer asset until licensing and neutral shell assets are approved          |
| `docs/mockups/mockbook-manifest.json`              | Regenerated          | v2 is read only during cutover; package emits `mokabook-manifest.json` v3     |
| `docs/mockups/**/*.mobile.html` / `*.desktop.html` | Retained/regenerated | real Accounting fragments never move to this repository                       |

## Focused Test Disposition

| Accounting tests under `src/_tests_/`                                                                            | Disposition                                                                         |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `core.test.ts`, `legacy_screen_lint.test.ts`, `mock_link.test.ts`                                                | Generic cases ported to config/build tests; Accounting product cases remain         |
| `registry.test.ts`, `registry_tree.test.ts`                                                                      | Pure registry/nesting/collision behavior ported                                     |
| `mockbook_dev_server.test.ts`, `mockbook_serve.test.ts`                                                          | Safe routes, port zero, occupied ports, no-watch and watched lifecycle ported       |
| `mockbook_supervisor.test.ts`, `mockbook_supervisor_startup.test.ts`, `mockbook_watch_notification_gate.test.ts` | Readiness, buffering, ordering, stable port, and cleanup ported                     |
| `mockup_review.test.ts`, `review_ignore.test.ts`, `review_material.test.ts`, `review_summary.test.ts`            | Git comparison, malformed markers, material keys, JSON, and summary behavior ported |
| `review_ignore_shell.test.ts`                                                                                    | Generic marker rules ported; Accounting shell context stays with its adapter        |
| `nav_tree.test.ts`, `mockbook_client.test.ts`, `mockbook_head.test.ts`, `mockbook_live_updates.test.ts`          | Engine portions ported; final visual/client assertions deferred to milestone 7      |

The auxiliary `src/_tests_/mockbook_browser.cli.ts` and
`src/_tests_/mockbook_browser/{fixture,server}.ts` are **Deferred UI** browser
harnesses. The milestone-5 package has live HTTP/CLI integration coverage; its
browser harness will be introduced with the neutral shell rather than carrying
Bookfolio fixtures across.

## Consumer-Only Behavior That Must Survive Cutover

- Accounting's renderer continues to wrap screens with its Firna theme and
  collect React Native Web atomic styles.
- Marketing, app, email, and PDF stylesheet rules remain explicit Accounting
  configuration.
- Email template data remains an Accounting input with an explicit watch action.
- Historical route aliases, flat-family rules, allowlists, component names, and
  screen-cap exceptions remain in the Accounting adapter.
- Every real entry/page/component and all committed Accounting HTML stay in the
  Accounting repository.

This ledger must be re-audited against the then-current Accounting tip before
the dependency cutover deletes generic files.
