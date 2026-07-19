# Mockbook Build, Browse, And Review Runtime

## Source Of Truth

Consumer-authored registry modules and legacy page modules are the source of
truth. Generated fragments, legacy HTML, and the manifest remain committed in
consumer repositories so they can be reviewed without a server. Browse and
Review consume those same artifacts and definitions; neither may introduce a
second screen renderer or catalogue.

## Build

`mockbook build` performs this transaction:

1. Load and validate config.
2. Discover and bundle all configured entry, renderer, and legacy modules.
3. Validate registry metadata, routes, relationships, and output collisions.
4. Render screen fragments and configured legacy pages in deterministic order.
5. Resolve id links and validate document links and anchors.
6. Build the version 3 manifest.
7. Stage every generated file before changing the last-good output.
8. Atomically replace generated files and remove proven generated orphans.

An error leaves the last-good generated tree unchanged. Build output and
diagnostics use repo-relative paths and deterministic ordering.

## Check

`mockbook check` computes expected output without mutating committed files. It
fails for:

- invalid config or registry metadata;
- duplicate ids/routes or route/fragment/legacy collisions;
- missing collection children, use-case screens, or reciprocal memberships;
- unresolved `mock:` links, raw document links, or anchors;
- missing stylesheets and declared dependencies;
- stale, missing, or proven-orphan generated output;
- malformed Review-ignore markers or material keys;
- configured source, screen-cap, stage-id, or legacy-policy violations.

The failure report groups problems by class and tells the author whether to run
`mockbook build` or edit source/config. `check` never rewrites output.

## Catalogue And Routes

Browse validates the manifest before binding its listening port. It exposes:

- `/` for the catalogue home;
- `/view/<route>` for screens, use cases, and configured legacy pages;
- `/id/<id>` as a canonical redirect for routed registry entries;
- `/static/<path>` for generated fragments, legacy pages, and consumer assets;
- `/review` for the configured Git comparison;
- package-owned client and update endpoints under `/__mockbook/`.

Collections are navigation folders, not destinations. Unknown ids and routes
return a not-found main view while keeping catalogue navigation available.
Static path handling rejects traversal and does not expose repository files
outside configured public roots.

## Browse Shell

The package owns a neutral, responsive Mockbook shell: top-level Browse/Review
navigation, search, changed/all filter, nested catalogue, breadcrumbs, viewport
switching, device frames, and a collapsible details panel. Consumer brand chrome
does not appear in the shell. A small set of documented CSS custom properties
may tune the shell accent without replacing its structural styles.

A screen embeds its generated mobile and desktop fragments inside package-owned
device frames. A use case renders ordered steps that reference those same
fragments and link back to their standalone screens. A legacy page embeds the
whole generated document. Details may show description, rationale, source and
fragment paths, related docs, dependencies, use cases, and comparison context.

Browse is server rendered first and progressively enhanced. Direct URLs,
refresh, missing routes, and JavaScript-disabled use remain functional. For an
eligible unmodified same-origin Browse link, the client replaces only the
route-owned main view and updates URL, title, active row, focus, and history.
Search, disclosure, filters, and catalogue scroll remain mounted.

Back and Forward restore matching route and scroll state. Overlapping requests
are latest-wins. Review, static, iframe, download, external, target, hash-only,
and modified-click links retain native browser behavior. A failed enhancement
falls back to normal document navigation.

The shell meets keyboard, focus, reduced-motion, contrast, semantics, and status
announcement requirements. Mobile and desktop shell variants are specified in
the repository mockups before UI implementation.

## Watched Development

`mockbook serve` watches by default; `--no-watch` serves one deterministic
snapshot. Watch classification derives only from resolved config:

- entry/page/renderer inputs rebuild generated output;
- an input shared with shell metadata rebuilds before restarting the child;
- configured CSS/fonts/images reload the browser without rebuilding;
- generated output, dependency trees, test output, and temporary files ignore;
- additional inputs use the explicit action declared in config.

Package source under `node_modules` or an npx cache is never treated as consumer
source. Development of Mockbook itself uses repository tooling rather than a
hidden consumer-specific self-reload path.

Watchers attach before the initial child is announced healthy. Notifications
during startup are buffered. A child validates the catalogue and binds before
readiness. Port `0` resolves once and the resolved port remains stable across
child restarts. Initial validation/bind failure exits non-zero without leaking
watchers.

Rebuilds are debounced and transactional. A failed rebuild keeps the last-good
server and output, reports the error, and waits for another authored change. A
successful rebuild or healthy restart publishes a new update version. Browsers
reload their current durable URL and restore directory state once; a later
manual refresh must not resurrect stale recovery state.

Shutdown closes watchers, timers, child processes, HTTP servers, event streams,
and ports. Tests must prove no orphan process remains after normal shutdown,
failed startup, or interruption.

## Review Comparison

`mockbook review` compares the workspace with a configured base ref, defaulting
to `origin/main`. It resolves the base to a commit and reads the committed
`mockupsDir` tree from Git without checking out or rebuilding the base. Head
artifacts come from the current working tree after `mockbook check` succeeds.

Screens pair by stable manifest route. Mobile and desktop classify separately
from their fragments. Added, removed, changed, and unchanged states handle
version 2 and version 3 manifests during Accounting migration. Configured
shared-impact globs and manifest dependencies identify changes that can affect
many screens.

Review emits a static, self-contained directory with:

- a changed-screen summary grouped by state;
- one compare page per material route;
- side-by-side, opacity-overlay, and difference modes;
- mobile, desktop, and combined viewport controls;
- before/head artifacts kept complete and unmodified;
- aggregate shared-impact and ignored-region evidence;
- deterministic `review.json` for CI summaries.

Visual differences are review information, not a failing check. Invalid input,
missing base data, unsafe Git paths, malformed ignore markers, or artifact
generation errors fail the command.

## Review Ignore

`ReviewIgnore` marks repeated shell chrome with paired inert boundaries and no
layout wrapper. A stable kebab-case id is unique per generated document. Review
normalizes a region only when both sides contain one valid matching boundary.
One-sided adoption removes marker syntax but compares the real children.

Stateful repeated chrome supplies a deterministic material key derived from the
complete typed props used to render it. The signal remains outside the ignored
region and part of classification. One-sided material-signal adoption compares
real children. Malformed, duplicate, nested, overlapping, mismatched, or invalid
signals fail closed with route context.

Ignoring changes classification only. Stored fragments and compare panes keep
the real content. Ignored-only changes aggregate by id and viewport instead of
adding every consumer screen. Primary screen content must never be ignored.

## CI Review Integration

Consumer repositories may run Review only when configured mockup paths change.
The job uses the pull request merge base, uploads the artifact, and appends a
compact `review.json` summary. Tool errors fail the job; expected visual changes
do not. Generated-output, registry, and link errors remain blocking `check`
failures in the consumer's normal CI.

## Required Coverage

Unit, integration, packed-consumer, and browser tests cover every contract in
this document. At minimum they cover deterministic output, stale/orphan checks,
path safety, registry links, legacy coexistence, deep links, no-JavaScript
responses, progressive navigation, history/focus, watch recovery, shutdown,
base extraction, per-viewport comparison, shared impact, Review ignore, and CI
summary output.

## Related Docs

- [Package and authoring contract](./mockbook-package.md)
- [CI and npm release](./npm-release.md)
