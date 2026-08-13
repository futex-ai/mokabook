# Mokabook Build And Browse Runtime

## Source Of Truth

Consumer-authored registry modules and legacy page modules are the source of
truth. Generated fragments, legacy HTML, and the manifest remain committed in
consumer repositories so they can be reviewed without a server. Browse
consumes those same artifacts and definitions; it may not introduce a
second screen renderer or catalogue.

## Delivery Status

This document defines the release-ready runtime contract. The Build, Check,
watch, and server engines, the responsive package-owned Browse shell,
packed-package consumers, CI/release automation, and Playwright browser
coverage are implemented. The irreversible first publication and downstream
consumer cutover remain external steps.

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
- invalid `colorSchemes` config, per-screen `colorSchemes` declarations, or
  color-scheme subsets unsupported by the catalogue config;
- missing `lightStylesheets` / `darkStylesheets` files, or a stylesheet path one
  rule would link twice into the same fragment;
- invalid or colliding `darkFragments` manifest routes;
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
- `/__mokabook/base/<commit>/<route>` for branch-point documents when change
  detection resolved;
- package-owned client and update endpoints under `/__mokabook/`.

All ordinary routes support GET and HEAD. A HEAD request to the update endpoint
returns its response headers and completes without opening or registering an
event stream.

Collections are navigation folders, not destinations. Unknown ids and routes
return a not-found main view while keeping catalogue navigation available.
Static path handling rejects traversal and does not expose repository files
outside configured public roots.

## Browse Shell

The package owns a neutral, responsive Mokabook shell: a top bar with brand
and search; a catalogue navigation column with a
`Collapse all` control, an All/Changed filter, nested disclosure groups with
folder/screen/page/flow icons and indent guides; linked breadcrumbs with an id
chip; viewport and color-scheme switching; realistic phone and browser device
chrome; a per-frame expand-to-overlay toggle; and a collapsible details
inspector.
Consumer brand chrome does not appear in the shell. A small set of documented
CSS custom properties may tune the shell accent without replacing its
structural styles. The shell serves its packaged Inter variable font from
`/__mokabook/fonts/`. The All/Changed filter lives at the top of the navigation
column, shows the changed count, and derives from Git changes between the
current workspace and the merge base shared by `HEAD` and the serve base ref.
Commits reachable only from the base ref are not branch changes. Staged,
unstaged, and untracked workspace changes remain eligible. When the repository,
base ref, or common ancestor cannot be resolved, Browse omits the filter and
shows the full catalogue.
Route attribution compares each current manifest entry with its base entry and
matches changed generated fragments plus explicitly declared dependencies. The
automatically recorded registry source module is attribution metadata, not a
route dependency: changing a shared registry module alone must not mark its
unchanged sibling routes.
A screen whose only evidence is generated-fragment changes is confirmed
against its branch-point documents: both sides are normalized with the
review-ignore rules, and a screen whose changed views are byte-equal after
normalization does not count as changed. Manifest-metadata differences and
declared-dependency matches count without reading base documents.
A changed path matching a `changes.sharedImpact` glob marks every route that
links it as a configured stylesheet; a shared-impact path that is no route's
stylesheet marks every route changed.
When a screen is directly affected, every use case that embeds that screen's
fragments is affected too and remains visible in the changed-only filter.

A screen embeds its generated mobile and desktop fragments inside package-owned
device frames. A use case renders ordered steps that reference those same
fragments and link back to their standalone screens. A legacy page embeds the
whole generated document. Breadcrumb ancestors that resolve to a viewable
route (a legacy directory's Overview page) are links; structural collection
crumbs stay text. The details inspector may show description, rationale,
source and fragment paths including dark renders, the schemes a screen renders
in, related docs, dependencies, use cases, and comparison context.
Consumer fragments and legacy documents are sandboxed without script permission
so they cannot alter the same-origin Browse shell.

A catalogue with dark fragments offers a `Light | Dark` scheme switch; a
light-only catalogue offers none. One switch renders in the top bar and one in
the screen head band, and the shell reveals whichever suits the width: the top
bar at and above the breakpoint, the head band below it. The catalogue home has
no head band, so below the breakpoint it carries no scheme control. Choosing a
scheme marks the document, keeps every switch in sync, and swaps each embedded
frame — screen frames and use-case steps alike — between its light and dark
fragment URLs; only the inside of a device screen follows the selection, which
then survives in-shell navigation, Back, and Forward. A screen with no dark
render keeps its light fragments and names the fallback in its frame label
(`MOBILE — LIGHT ONLY`), while a use-case step, which has no label, simply
stays light.

Browse is server rendered first and progressively enhanced. Direct URLs,
refresh, missing routes, and JavaScript-disabled use remain functional. For an
eligible unmodified same-origin Browse link, the client replaces only the
route-owned main view and updates URL, title, active row, focus, and history.
Search, disclosure, filters, and catalogue scroll remain mounted; searching
temporarily force-opens navigation groups and restores their prior disclosure
when cleared. The details inspector is open until the user changes it, then its
disclosure is retained across in-shell navigation, durable navigation, and
browser reloads for that origin. Unavailable or malformed browser storage
leaves the server-rendered default intact; the latest choice still survives
in-shell navigation when writes fail. The browser-frame expand toggle overlays
one frame at a time and collapses on Escape, on an outside click, and on route
navigation. Clicking a screen or use-case ID chip labelled `#<id>` copies the
unprefixed ID without navigating. Clicking a frame address copies it to the
clipboard.

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
snapshot. Every Browse document loads the package-owned browser client,
which connects to the versioned event stream and reloads its current durable
URL after a higher version arrives. Watch classification derives only from
resolved config:

- the discovered or explicit config file reloads configuration, generated
  output, watch targets, and the child;
- entry/page/renderer inputs rebuild generated output;
- an input shared with shell metadata rebuilds before restarting the child;
- configured CSS/fonts/images reload the browser without rebuilding;
- header-proven generated output plus `.git`, `.context`, `node_modules`,
  `dist`, `target`, coverage, browser-test output, and Mokabook
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
config's comparison base.

Rebuilds are debounced and transactional. A failed rebuild keeps the last-good
server and output, reports the error, and waits for another authored change. A
successful rebuild or healthy restart publishes a new update version. Browsers
reload their current durable URL and restore search, changed-only selection,
collection and details disclosure, viewport and color-scheme selection,
responsive drawer, catalogue scroll, and per-region stage scroll once. Recovery
is strictly parsed, applies only when its durable URL exactly matches the
reloaded page, and is removed before application; a later manual refresh cannot
resurrect stale state.

Watch actions execute serially. Changes received during an active action are
coalesced by impact before the next action starts, so two rebuilds cannot race
to replace generated output or restart the same child. The parent assigns a
monotonic integer update version to each child and asset reload. An event
stream's first `ready` version establishes the page baseline; a higher version
after reconnection or an `update` event triggers one reload and one-shot state
recovery.

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

## Change Comparison Core

The package keeps an internal comparison engine shared by change detection: it
resolves the merge base shared by `HEAD` and the configured base ref, reads the
committed `mockupsDir` tree at that branch point without checking it out or
rebuilding it, and classifies each screen view. Commits reachable only from
the configured base do not enter a comparison.
Base reads inspect only the requested paths, grouping exact literal pathspecs
into count- and byte-bounded `ls-tree` operations, and read regular-file blobs
through output-byte- and object-count-bounded `cat-file` batches. A single blob
that cannot fit the output budget fails explicitly after metadata inspection
and before a `cat-file` content process is spawned. File modes are checked
before any blob is accepted, so batching does not weaken symlink or
non-regular-file rejection. Base documents must be regular Git files under the
public `mockupsDir` tree, never configured entry or legacy source roots.

Screens pair by stable manifest route. Views pair by route, viewport, and color
scheme, enumerated from the union of base and head manifest entries. Each side's
view set is `["light", ...(screen.darkFragments ? ["dark"] : [])]`: a dark
view present only in head is `added`, and one present only in base is
`removed`. Mobile and desktop still classify separately from their fragments.
Added, removed, changed, ignored-only, and unchanged states handle version 2
and version 3 manifests during Accounting migration; pre-dark bases simply have
no `darkFragments`. Configured shared-impact globs and manifest dependencies
identify changes that can affect many screens. A dependency is a repository
file or directory root: its own change or any descendant change affects the
entry, and the comparison records the matching changed path as evidence.

## Served Base Documents

When change detection resolves, the server pins the branch-point commit for
its lifetime and serves the committed catalogue tree at that commit below
`/__mokabook/base/<commit>/<route>`. Only the pinned commit is addressable;
any other commit is not found, and a server without a resolved branch point
serves no base routes. Responses are immutable-cacheable because the commit
names the content. A base document's relative stylesheet, font, and image
references resolve inside the same subtree, so a compared document renders
with its branch-point resources rather than the live workspace's. Requests are
confined to the public catalogue tree: traversal, configured entry and legacy
source roots, and non-regular Git files are rejected. A missing base document
renders the no-base placeholder document; a missing non-document resource is
not found. A watched rebuild restarts the child, which re-resolves the branch
point, so base routes always match the served changed-filter baseline.

## Review Ignore

`ReviewIgnore` marks repeated shell chrome with paired inert boundaries and no
layout wrapper. A stable kebab-case id is unique per generated document. A
comparison normalizes a region only when both sides contain one valid matching
boundary. One-sided adoption removes marker syntax but compares the real
children.

Stateful repeated chrome supplies a deterministic material key derived from the
complete typed props used to render it. The signal remains outside the ignored
region and part of classification. One-sided material-signal adoption compares
real children. Malformed, duplicate, nested, overlapping, mismatched, or invalid
signals fail closed with route context.

Ignoring changes classification only. Generated fragments keep the real
content. Ignored-only changes aggregate by id, viewport, and color scheme.
Primary screen content must never be ignored.

## Required Coverage

Before publication, unit, integration, packed-consumer, and browser tests cover
every contract in this document. At minimum they cover deterministic output,
stale/orphan checks, path safety, registry links, legacy coexistence, deep
links, no-JavaScript responses, progressive navigation, history/focus,
color-scheme switching, watch recovery, shutdown, base extraction, per-view
comparison, shared impact, and Review ignore.

## Related Docs

- [Package and authoring contract](./mokabook-package.md)
- [CI and npm release](./npm-release.md)
