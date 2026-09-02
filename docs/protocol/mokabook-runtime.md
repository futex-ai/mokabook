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
Canonical outer navigation from links inside fragment frames, request-visible
fragment transport, ownership-aware preview adaptation, and active-tree
disclosure are implemented. Their delivery history is recorded in the completed
[in-frame catalogue link navigation plan](../../plans/in-frame-catalogue-link-navigation.md).

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
- missing collection children, duplicate child references, children claimed by
  multiple collections, collection cycles, missing use-case screens, or
  reciprocal memberships;
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
- `/static/<path>` for generated fragments, legacy pages, and consumer assets,
  always delivered with `Cache-Control: no-store` because watched rebuilds
  replace bytes at stable URLs;
- `/review` for the configured Git comparison, redirecting to the artifact
  index, with stable `/review/<path>` routes redirecting to immutable
  `/review/__generations/<version>/<path>` artifact files;
- package-owned client and update endpoints under `/__mokabook/`.

All ordinary routes support GET and HEAD. HEAD returns the same status and
headers without a body, including `/id` not-found and fragment-validation
errors. A HEAD request to the update endpoint completes without opening or
registering an event stream.

Collections are navigation folders, not destinations. Unknown ids and routes
return a not-found main view while keeping catalogue navigation available.
Static path handling rejects traversal and does not expose repository files
outside configured public roots. The shared relative-path decoder rejects
malformed encoding, absolute and empty paths, dot segments, and forward or
backslash separators introduced by decoding one original URL segment before
any filesystem resolution.

Browse caches the validated collection forest from manifest `childIds`.
Structured roots, nested navigation, and breadcrumbs all consume that one
model; serialized `navPath` labels from current or historical manifests never
override it. An unclaimed screen or use case renders directly at the catalogue
root with no invented `Catalogue` group or breadcrumb. Legacy pages remain a
separate route-directory tree because they have no structured collection
entries.

## Browse Shell

The package owns a neutral, responsive Mokabook shell: a top bar with brand,
search, and Browse/Review modes; a catalogue navigation column with a
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
Entry comparison uses an explicit projection of route-affecting fields plus
the ordered ancestor collection ids and titles derived from `childIds`.
Serialized `navPath` labels are compatibility output and cannot independently
mark a screen or use case as changed. Reparenting an entry or renaming one of
its ancestor collections marks the routed entry as changed.
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
so they cannot alter the same-origin Browse shell. Package-owned same-origin
inspection permits parent-owned outer navigation after explicit user
activation. Browse does not grant either
top-navigation sandbox token, so direct and nested consumer contexts retain the
active restriction that prevents them from replacing the shell. The
served/preview adapter authenticates markers only for current-manifest
screen fragments and generated legacy pages whose ownership header names that
entry's manifest `sourcePath`. The versioned header stores that identity as
canonical base64, keeping arbitrary repository filename bytes out of the HTML
comment grammar. The adapter shares the strict build/cleanup decoder and
accepts either LF or CRLF after that exact header. During migration it also
recognizes the former raw-path header only when its source is valid comment
content. Unowned HTML loses
package-reserved metadata in the adapted copy; a trusted route with
missing/mismatched ownership, invalid markers, or a marker/portable-href
mismatch fails closed. One strict typed
target parser supplies inert metadata only to trusted parent enhancement. A
trusted document that carries an activatable marker and `<base href>` also
fails closed, including if post-build tampering introduced the base URL;
consumer-authored `href`, `<base target>`, `target`, and `formtarget` values
otherwise remain portable and sandbox-confined. Consumer scripts, forms,
popups, downloads, and top navigation remain forbidden. Review panes retain
their stricter sandbox and byte-unmodified documents.

Every structured disclosure group uses `collection:<id>` as its rendered and
persisted identity. Legacy directory groups use
`legacy:<route-directory>`. Labels remain presentation only, so collections or
legacy directories with the same displayed title retain independent state.
Recovery data containing the former label-path values does not match a current
group and is ignored rather than risking application to the wrong collection.

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
Logical links activated inside a consumer frame navigate that same outer route
model rather than replacing only the iframe document. The shell opens the active
row's ancestor collections, conditionally clears a search or Changed filter
that would hide it, and scrolls it into view. The complete target,
portable-link, safe-degradation,
sandbox, fragment, and active-tree behavior is defined by the
[catalogue navigation contract](./mokabook-navigation.md).
Search, disclosure, filters, and catalogue scroll remain mounted. Each user
edit to search or the All/Changed filter opens groups to reveal its current
matches. Route changes and watched-reload restoration during active filtering
preserve groups the user subsequently collapsed, except for the destination's
ancestor path. Clearing all filtering restores the earlier disclosure state,
but a destination path opened by navigation stays open. Navigation groups and
the details inspector retain explicit disclosure choices across in-shell navigation,
durable navigation, and browser reloads for that origin. Unavailable or
malformed browser storage leaves the server-rendered default intact; the latest
choice still survives in-shell navigation when writes fail. The browser-frame
expand toggle overlays one frame at a time and collapses on Escape, on an
outside click, and on route navigation. Clicking a screen or use-case ID chip
labelled `#<id>` copies the unprefixed ID without navigating. Clicking a frame
address copies it to the clipboard.

The shell scrolls inside its stage, flow, and embed regions rather than the
document. Back and Forward restore the matching route and that history entry's
latest per-region scroll positions. Scroll persistence is limited to one
leading update per animation frame, and route-change focus never overrides the
restored positions. Overlapping requests are latest-wins. Review, download,
external, hash-only, metadata-only, and unmarked links retain their existing
frame-owned behavior. Trusted parent code owns primary and new-context
navigation for a marked catalogue link inside a Browse frame when enhancement
is available.
There is no native outer-navigation fallback; failed or disabled enhancement
keeps the portable link frame-owned and the sandbox prevents direct or nested
content from replacing the shell. Served Browse applies a request-visible
logical fragment during server rendering. The static deployed preview applies
it progressively to each current and light/dark swap source so scheme changes
retain the anchor.

The shell meets keyboard, focus, reduced-motion, contrast, semantics, and status
announcement requirements. Mobile and desktop shell variants are specified by
the design mockups in the basic example's `design/` catalogue, and the
[shell design contract](./mokabook-shell-design.md) records the approved CSS
custom properties, tokens, and responsive behavior the implementation
preserves. Intentional presentation differences between the mockups and the
shipped shell are recorded beside the design catalogue in the example notes.

## Watched Development

`mokabook serve` watches by default; `--no-watch` serves one deterministic
snapshot. Every Browse shell, served Review shell document, and retryable
Review failure page loads the package-owned browser client, which connects to
the versioned event stream and reloads its current durable URL after a higher
version arrives. Snapshot panes do not run this client. Watch classification
derives only from resolved config:

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
current collection disclosure, the disclosure baseline captured before active
filtering, details disclosure, viewport and color-scheme selection, responsive
drawer, catalogue scroll, and per-region stage scroll once. Recovery is strictly
parsed with one compatibility rule: a payload from before filter-baseline
capture treats that missing baseline as unavailable while restoring its other
valid state. Recovery applies only when its durable URL exactly matches the
reloaded page and is removed before application; a later manual refresh cannot
resurrect stale state.

When an authored rebuild reparents an entry, the new manifest relationships
move its navigation row and ancestor crumbs in the same reload. Disclosure
recovery still applies to every unchanged stable collection id; removed ids and
obsolete label-path keys have no target and are ignored.

When a successful rebuild leaves the manifest structure unchanged, or an
explicit watch rule requests a reload, the parent keeps the ready child and
recomputes the complete optional changed-route snapshot. One typed update
message replaces the child's shell snapshot before the event-stream version is
published. An available empty list keeps the filter visible at zero; an
unavailable comparison removes it. The following browser reload therefore
observes Changed rows and counts from the same successful watch action without
requiring a child restart.

Watch actions execute serially. Changes received during an active action are
coalesced by impact before the next action starts, so two rebuilds cannot race
to replace generated output or restart the same child. The parent assigns a
monotonic integer update version to each child and asset reload. Every served
Browse shell, server-owned Review shell document, and retryable Review failure
page carries the update version captured when its request began. The client
seeds its page baseline from that stamp: an equal event-stream `ready` version
is a no-op, while a higher `ready` version or `update` event triggers one reload
and one-shot state recovery. A document without a valid stamp retains
compatibility behavior in which its first `ready` version establishes the
baseline.

Publishing an update without restarting the child marks its cached served
Review artifact stale before notifying browsers. The first reloaded Review
top-level document request serially regenerates the artifact, while concurrent
requests reuse that regeneration and subresources remain pinned to their
document's immutable generation.

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
to `origin/main`. It resolves the merge base shared by `HEAD` and that ref, then
reads the committed `mockupsDir` tree at that branch point without checking it
out or rebuilding it. Commits reachable only from the configured base do not
enter the comparison. Head artifacts come from the current working tree after
`mokabook check` succeeds.
Review inspects only the requested base paths, grouping exact literal pathspecs
into count- and byte-bounded `ls-tree` operations, and reads regular-file blobs
through output-byte- and object-count-bounded `cat-file` batches. A single blob
that cannot fit the output budget fails explicitly after metadata inspection
and before a `cat-file` content process is spawned. The initial view document
set is one logical batch request; transitively referenced assets are grouped by
dependency depth. File modes are still checked before any blob is accepted, so
batching does not weaken symlink or non-regular-file rejection.

Screens pair by stable manifest route. Views pair by route, viewport, and color
scheme, enumerated from the union of base and head manifest entries. Each side's
view set is `["light", ...(screen.darkFragments ? ["dark"] : [])]`: a dark
view present only in head is `added`, and one present only in base is
`removed`. Mobile and desktop still classify separately from their fragments.
Added, removed, changed, and unchanged states handle version 2 and version 3
manifests during Accounting migration; pre-dark bases simply have no
`darkFragments`. Configured shared-impact globs and manifest dependencies
identify changes that can affect many screens. A dependency is a repository file
or directory root: its own change or any descendant change affects the entry,
and Review records the matching changed path as evidence. The active Review
artifact directory, including a `--out` override and its symlink-resolved
in-repository target, is excluded before changed-path and shared-impact evidence
is calculated.

The engine emits a static, self-contained artifact directory with:

- a deterministic index, with every page rendered in the Mokabook shell
  beside a changed-screens navigation column that groups changed, added,
  removed, and ignored-only screens, plus an impacted group for
  byte-identical screens with shared or dependency evidence;
- an explicit empty state only when no screen has either visual differences or
  impact evidence, with the same material/impacted totals in the CI summary;
- one compare page per view, linked to same-scheme sibling viewports through
  the page's viewport control and, for a screen compared in both schemes, to
  the same-viewport sibling scheme through its scheme control;
- one artifact-root navigation payload shared by all compare pages, while the
  index keeps complete inline navigation and a compare page without JavaScript
  keeps a direct fallback link to that index;
- a responsive changed-screens drawer opened by the top-bar menu button, plus
  a Review pill that links every compare page back to the artifact index;
- side-by-side, opacity-overlay, and difference modes on every compare page;
- before/head artifacts kept complete and unmodified;
- aggregate shared-impact and ignored-region evidence in the navigation
  column, screen impact evidence on compare pages, and per-view ignored-region
  evidence;
- deterministic `review.json` for CI summaries.

Artifact pages inline the package-owned shell styles so the directory remains
viewable without a server. Compare pages load their package-owned navigation
payload by relative path from the same artifact directory, and every embedded
pane stays in a script-disabled sandbox.
Light comparison pages keep the existing
`comparisons/<hash>/<viewport>/index.html` paths. Dark comparison pages use
`comparisons/<hash>/<viewport>.dark/index.html`; the page depth remains three
segments below the artifact root, so relative links and shared navigation paths
stay stable.

## Served Review

Serve exposes the same comparison in the shell's Review mode. The server
generates the artifact into the configured Review output directory lazily on
the first `/review` request and again when a request carries `?refresh=1`, so
the comparison reflects the workspace when viewed. A published watch update
also invalidates the cached artifact before browsers reload; generations
serialize so neither invalidation nor refresh races an in-flight run. Refresh
and invalidation requests that arrive during an unrelated run coalesce into one
follow-up generation. Every stable artifact path redirects to a server-owned
immutable generation URL.
Relative scripts, panes, and resources therefore stay pinned to that
generation. Replaced directories remain available for a bounded idle window,
and a watched top-level reload advances to the latest generation without
redirecting an old document's concurrent subresources. Package-owned archive
roots are passed into changed-path collection as explicit exclusions, so
consumer ignore policy cannot turn retained output into impact evidence. Every
artifact page includes the Review/index pill and self-contained responsive
drawer. Pages generated behind the server additionally add the Browse pill, a
recompute link, and the package-owned browser client for watched reloads;
static `mokabook review` artifacts omit those server-only hooks. Successful
redirects and artifact responses use `Cache-Control: no-store`. The server
stamps only top-level Review index and comparison documents with the request's
update version; snapshot panes and their resources are served from the retained
generation as their exact archived bytes. A generation failure restores the
previous served directory, answers with a version-stamped retryable error page
that remains connected to watched updates, and leaves the server running. The
next request retries the generation, while a later successful watched update
automatically reloads an already-open failure page into the recovered artifact.
Server shutdown stops new Review work, waits for active or queued generation to
settle, then removes retained temporary generations but not the configured
current output. Before archiving a current output, the server requires its
regular-file Review ownership marker and refuses an unowned replacement
without moving or deleting it. Failed-generation recovery likewise removes
only marker-owned incomplete output before restoring the prior artifact. A
server constructed without a Review provider keeps the launcher view that
points at the `mokabook review` command.

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
  schemaVersion: 2;
  baseRef: string;
  baseCommit: string; // merge base shared by HEAD and baseRef
  changedPaths: readonly string[];
  sharedImpact: readonly string[];
  ignoredImpact: readonly {
    id: string;
    viewport: "mobile" | "desktop";
    colorScheme: "light" | "dark";
    count: number;
  }[];
  screens: readonly {
    id: string;
    route: string;
    title: string;
    state: "added" | "removed" | "changed" | "ignored-only" | "unchanged";
    dependencies: readonly string[];
    sharedImpact: readonly string[];
    views: readonly {
      viewport: "mobile" | "desktop";
      colorScheme: "light" | "dark";
      state: "added" | "removed" | "changed" | "ignored-only" | "unchanged";
      beforePath?: string;
      afterPath?: string;
      ignoredIds: readonly string[];
    }[];
  }[];
}
```

Routes sort in deterministic catalogue order; views sort by viewport
(`mobile`, then `desktop`) and then color scheme (`light`, then `dark`).
Changed and impact paths sort lexically. No timestamp or absolute checkout path
enters the JSON. Before/after HTML remains unmodified in the artifact even when
ignore normalization changes classification.

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
the real content. Ignored-only changes aggregate by id, viewport, and color
scheme instead of adding every consumer screen. Primary screen content must
never be ignored.

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
links, no-JavaScript responses, progressive navigation, history/focus,
color-scheme switching, watch recovery, shutdown, base extraction, per-view
comparison, shared impact, Review ignore, and CI summary output.

## Related Docs

- [Package and authoring contract](./mokabook-package.md)
- [CI and npm release](./npm-release.md)
