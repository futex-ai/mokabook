# Mokabook Build, Browse, And Review Runtime

## Source Of Truth

Consumer-authored registry modules and legacy page modules are the source of
truth. Generated fragments, legacy HTML, and the manifest remain committed in
consumer repositories so they can be reviewed without a server. Browse and
Review consume those same artifacts and definitions; neither may introduce a
second screen renderer or catalogue.

## Delivery Status

This document defines the release-ready runtime contract. The Build, Check,
watch, server, and Review engines, the responsive package-owned Browse shell,
the designed Review artifact pages, packed-package consumers, CI/release
automation, and Playwright browser coverage are implemented. The irreversible
first publication and downstream consumer cutover remain external steps.

## Build

`mokabook build` performs this transaction:

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

`mokabook check` computes expected output without mutating committed files. It
fails for:

- invalid config or registry metadata;
- duplicate ids/routes or route/fragment/legacy collisions;
- missing collection children, use-case screens, or reciprocal memberships;
- unresolved `mock:` links, raw document links, local HTML/CSS resources, or
  anchors;
- missing stylesheets and declared dependencies;
- stale, missing, or proven-orphan generated output;
- malformed Review-ignore markers or material keys;
- configured source, screen-cap, stage-id, or legacy-policy violations.

The failure report groups problems by class and tells the author whether to run
`mokabook build` or edit source/config. `check` never rewrites output.

## Catalogue And Routes

Browse validates the manifest before binding its listening port. It exposes:

- `/` for the catalogue home;
- `/view/<route>` for screens, use cases, and configured legacy pages;
- `/id/<id>` as a canonical redirect for routed registry entries;
- `/static/<path>` for generated fragments, legacy pages, and consumer assets;
- `/review` for the configured Git comparison, redirecting to the artifact
  index, with `/review/<path>` serving the generated artifact files;
- package-owned client and update endpoints under `/__mokabook/`.

All ordinary routes support GET and HEAD. A HEAD request to the update endpoint
returns its response headers and completes without opening or registering an
event stream.

Collections are navigation folders, not destinations. Unknown ids and routes
return a not-found main view while keeping catalogue navigation available.
Static path handling rejects traversal and does not expose repository files
outside configured public roots.

## Browse Shell

The package owns a neutral, responsive Mokabook shell: a top bar with brand,
search, and Browse/Review modes; a catalogue navigation column with a
`Collapse all` control, an All/Changed filter, nested disclosure groups with
folder/screen/page/flow icons and indent guides; linked breadcrumbs with an id
chip; viewport switching; realistic phone and browser device chrome; a
per-frame expand-to-overlay toggle; and a collapsible details inspector.
Consumer brand chrome does not appear in the shell. A small set of documented
CSS custom properties may tune the shell accent without replacing its
structural styles. The shell serves its packaged Inter variable font from
`/__mokabook/fonts/`. The All/Changed filter lives at the top of the
navigation column, shows the changed count, and derives from Git changes
against the serve base ref; when the repository or base cannot be resolved,
Browse omits the filter and shows the full catalogue.
Route attribution compares each current manifest entry with its base entry and
matches changed generated fragments plus explicitly declared dependencies. The
automatically recorded registry source module is attribution metadata, not a
route dependency: changing a shared registry module alone must not mark its
unchanged sibling routes.
When a screen is directly affected, every use case that embeds that screen's
fragments is affected too and remains visible in the changed-only filter.

A screen embeds its generated mobile and desktop fragments inside package-owned
device frames. A use case renders ordered steps that reference those same
fragments and link back to their standalone screens. A legacy page embeds the
whole generated document. Breadcrumb ancestors that resolve to a viewable
route (a legacy directory's Overview page) are links; structural collection
crumbs stay text. The details inspector may show description, rationale,
source and fragment paths, related docs, dependencies, use cases, and
comparison context.
Consumer fragments and legacy documents are sandboxed without script permission
so they cannot alter the same-origin Browse shell.

Browse is server rendered first and progressively enhanced. Direct URLs,
refresh, missing routes, and JavaScript-disabled use remain functional. For an
eligible unmodified same-origin Browse link, the client replaces only the
route-owned main view and updates URL, title, active row, focus, and history.
Search, disclosure, filters, and catalogue scroll remain mounted; searching
temporarily force-opens navigation groups and restores their prior disclosure
when cleared. The browser-frame expand toggle overlays one frame at a time and
collapses on Escape, on an outside click, and on route navigation. Clicking a
screen or use-case ID chip labelled `#<id>` copies the unprefixed ID without
navigating. Clicking a frame address copies it to the clipboard.

The shell scrolls inside its stage, flow, and embed regions rather than the
document. Back and Forward restore the matching route and that history entry's
latest per-region scroll positions. Scroll persistence is limited to one
leading update per animation frame, and route-change focus never overrides the
restored positions. Overlapping requests are latest-wins. Review, static,
iframe, download, external, target, hash-only, and modified-click links retain
native browser behavior. A failed enhancement falls back to normal document
navigation.

The shell meets keyboard, focus, reduced-motion, contrast, semantics, and status
announcement requirements. Mobile and desktop shell variants are specified by
the design mockups in the basic example's `design/` catalogue, and the
[shell design contract](./mokabook-shell-design.md) records the approved CSS
custom properties, tokens, and responsive behavior the implementation
preserves. Intentional presentation differences between the mockups and the
shipped shell are recorded beside the design catalogue in the example notes.

## Watched Development

`mokabook serve` watches by default; `--no-watch` serves one deterministic
snapshot. Every Browse and Review document loads the package-owned browser client,
which connects to the versioned event stream and reloads its current durable
URL after a higher version arrives. Watch classification derives only from
resolved config:

- the discovered or explicit config file reloads configuration, generated
  output, watch targets, and the child;
- entry/page/renderer inputs rebuild generated output;
- an input shared with shell metadata rebuilds before restarting the child;
- configured CSS/fonts/images reload the browser without rebuilding;
- header-proven generated output plus `.git`, `.context`, `node_modules`,
  `dist`, `target`, coverage, browser-test output, Review output, and Mokabook
  transaction trees are pruned from broad watches and classify as ignored;
- additional inputs use the explicit action declared in config.

Configured source roots and modules remain rebuild inputs even when intentionally
nested beneath an ordinarily ignored directory. Configured stylesheet files
remain reload inputs. Those package-owned classifications take precedence over
additional watch rules. Package source under `node_modules` or an npx cache is
never treated as consumer source. Development of Mokabook itself uses repository
tooling rather than a hidden consumer-specific self-reload path.
An unowned public HTML file beneath `mockupsDir` is an authored static input,
not generated merely because of its extension, so an explicit rule may reload,
restart, rebuild, or ignore it.

Watchers become ready before initial generation begins. Notifications during
generation and child startup are buffered. A child validates the catalogue and binds before
readiness. Initial startup tries a requested concrete port and then each higher
port in order when the address is occupied; port `0` delegates selection to the
operating system. The resolved port remains stable across child restarts, which
bind strictly rather than changing the published URL. Exhausting the valid port
range or encountering another bind error exits non-zero without leaking
watchers. An unexpected child failure after readiness reports its diagnostic,
clears the dead process, and enqueues a restart through the same serialized
action queue used for authored changes.

On a config-file change, the parent first loads and validates the candidate,
starts a replacement watcher and waits for readiness, then transactionally
builds the candidate output. Only after those steps succeed does it adopt the
new resolved config, close the old watcher, and restart the child. A load,
watcher-readiness, or candidate-build failure closes the candidate watcher and
retains the previous config, watcher, output, and child. An explicit CLI
`--base` remains pinned; without one, the restarted child uses the newly loaded
config's Review base.

Rebuilds are debounced and transactional. A failed rebuild keeps the last-good
server and output, reports the error, and waits for another authored change. A
successful rebuild or healthy restart publishes a new update version. Browsers
reload their current durable URL and restore search, changed-only selection,
collection and details disclosure, viewport selection, responsive drawer,
catalogue scroll, and per-region stage scroll once. Recovery is strictly
parsed,
applies only when its durable URL exactly matches the reloaded page, and is
removed before application; a later manual refresh cannot resurrect stale
state.

Watch actions execute serially. Changes received during an active action are
coalesced by impact before the next action starts, so two rebuilds cannot race
to replace generated output or restart the same child. The parent assigns a
monotonic integer update version to each child and asset reload. An event
stream's first `ready` version establishes the page baseline; a higher version
after reconnection or an `update` event triggers one reload and one-shot state
recovery.

Publishing an update without restarting the child marks its cached served
Review artifact stale before notifying browsers. The first reloaded Review
request serially regenerates the artifact, while concurrent requests reuse
that regeneration.

Shutdown first stops queued work and waits for any active configuration
transaction, then closes the final adopted watcher, timers, child processes,
HTTP servers, event streams, and ports. A candidate watcher is discarded if
shutdown begins before adoption: shutdown interrupts an outstanding candidate
readiness wait and closes that watcher before the action queue finishes
draining. No later child restart is started. Tests must prove no orphan process
remains after normal shutdown, failed startup, or interruption. The child also
runs the same idempotent server close when its parent IPC channel disconnects,
so an abruptly terminated parent cannot leave a listening orphan. Parent-driven
shutdown first requests graceful IPC closure, then sends SIGTERM and SIGKILL at
bounded intervals when necessary; the supervisor does not finish closing until
the child exit notification arrives.

## Review Comparison

`mokabook review` compares the workspace with a configured base ref, defaulting
to `origin/main`. It resolves the base to a commit and reads the committed
`mockupsDir` tree from Git without checking out or rebuilding the base. Head
artifacts come from the current working tree after `mokabook check` succeeds.

Screens pair by stable manifest route. Mobile and desktop classify separately
from their fragments. Added, removed, changed, and unchanged states handle
version 2 and version 3 manifests during Accounting migration. Configured
shared-impact globs and manifest dependencies identify changes that can affect
many screens. A dependency is a repository file or directory root: its own
change or any descendant change affects the entry, and Review records the
matching changed path as evidence. The active Review artifact directory,
including a `--out` override and its symlink-resolved in-repository target, is
excluded before changed-path and shared-impact evidence is calculated.

The engine emits a static, self-contained artifact directory with:

- a deterministic index, with every page rendered in the Mokabook shell
  beside a changed-screens navigation column that groups changed, added,
  removed, and ignored-only screens, plus an impacted group for
  byte-identical screens with shared or dependency evidence;
- an explicit empty state only when no screen has either visual differences or
  impact evidence, with the same material/impacted totals in the CI summary;
- one designed compare page per screen viewport, linked to its sibling
  viewport through the page's viewport control;
- a responsive changed-screens drawer opened by the top-bar menu button, plus
  a Review pill that links every compare page back to the artifact index;
- side-by-side, opacity-overlay, and difference modes on every compare page;
- before/head artifacts kept complete and unmodified;
- aggregate shared-impact and ignored-region evidence in the navigation
  column, screen impact evidence on compare pages, and per-viewport
  ignored-region evidence;
- deterministic `review.json` for CI summaries.

Artifact pages inline the package-owned shell styles so the directory remains
viewable without a server, and every embedded pane stays in a script-disabled
sandbox.

## Served Review

Serve exposes the same comparison in the shell's Review mode. The server
generates the artifact into the configured Review output directory lazily on
the first `/review` request and again when a request carries `?refresh=1`, so
the comparison reflects the workspace when viewed. A published watch update
also invalidates the cached artifact before browsers reload; generations
serialize so neither invalidation nor refresh races an in-flight run. Every
artifact page includes the Review/index pill and self-contained responsive
drawer. Pages generated behind the server additionally add the Browse pill, a
recompute link, and the package-owned browser client for watched reloads;
static `mokabook review` artifacts omit those server-only hooks. A generation
failure answers with a
retryable error page and leaves the server running, and the next request
retries the generation. A server constructed without a Review provider keeps
the launcher view that points at the `mokabook review` command.

Base and head panes live under separate route-preserving snapshot roots. Local
resources referenced by pane HTML or CSS are copied transitively, including
binary fonts and images, while explicit HTTP(S)/data resources remain external.
Root-absolute, protocol-relative, and other scheme-qualified resource URLs are
not portable in a disk-viewable artifact and fail Review instead of being
silently omitted.
Current-worktree resources must resolve to regular public files. Every base
resource, including the pane document itself and each transitive dependency,
must be a regular Git file. Neither side may read from configured entry or
legacy source roots. Pane documents remain byte-unmodified and run in
script-disabled sandboxes.
Comparison-page routes use bounded route hashes and fail on any artifact-path
collision rather than overwriting an earlier screen.

Visual differences are review information, not a failing check. Invalid input,
missing base data, unsafe Git paths, malformed ignore markers, or artifact
generation errors fail the command.

`review.json` is the normative machine-readable result:

```ts
interface ReviewResult {
  schemaVersion: 1;
  baseRef: string;
  baseCommit: string;
  changedPaths: readonly string[];
  sharedImpact: readonly string[];
  ignoredImpact: readonly {
    id: string;
    viewport: "mobile" | "desktop";
    count: number;
  }[];
  screens: readonly {
    id: string;
    route: string;
    title: string;
    state: "added" | "removed" | "changed" | "ignored-only" | "unchanged";
    dependencies: readonly string[];
    sharedImpact: readonly string[];
    viewports: readonly {
      viewport: "mobile" | "desktop";
      state: "added" | "removed" | "changed" | "ignored-only" | "unchanged";
      beforePath?: string;
      afterPath?: string;
      ignoredIds: readonly string[];
    }[];
  }[];
}
```

Routes and viewports sort in deterministic catalogue order; changed and impact
paths sort lexically. No timestamp or absolute checkout path enters the JSON.
Before/after HTML remains unmodified in the artifact even when ignore
normalization changes classification.

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

Before publication, unit, integration, packed-consumer, and browser tests cover
every contract in this document. At minimum they cover deterministic output,
stale/orphan checks, path safety, registry links, legacy coexistence, deep
links, no-JavaScript responses, progressive navigation, history/focus, watch
recovery, shutdown, base extraction, per-viewport comparison, shared impact,
Review ignore, and CI summary output.

## Related Docs

- [Package and authoring contract](./mokabook-package.md)
- [CI and npm release](./npm-release.md)
