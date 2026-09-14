# Package And Consumer Boundary

## Rule

Mokly owns the mechanics shared by any React mockup catalogue. A consumer
owns everything that gives a screen application meaning or appearance. The
boundary is enforced through peer dependencies, a renderer hook, declarative
paths, and synthetic tests.

| Mokly owns                              | Consumer owns                    | Configured at the boundary |
| --------------------------------------- | -------------------------------- | -------------------------- |
| Registry definitions and validation     | Product screens and fixture data | Source and output roots    |
| esbuild discovery and one-graph loading | Product component library        | Renderer/module resolution |
| Static fragments and manifest schema    | Theme/tokens/providers           | Stylesheet rules           |
| Generated-file ownership and check      | Product CSS/fonts/images         | Document transformer       |
| Safe routes and catalogue navigation    | Product route semantics          | Additional watch inputs    |
| Git comparison and Review-ignore rules  | Comparison policy                | Base, output, impact globs |
| Complete static catalogue export        | Hosting, credentials, deployment | Export output and Git base |

## Dependency Direction

`@mokly/mokly` has React and React DOM peer dependencies. It does not depend on
React Native, React Native Web, `@firna/ui`, Accounting, Juno, or a consumer's
workspace layout. At build time, React imports are resolved from the consumer's
config file and every React-bearing source is bundled in one graph.

The renderer is synchronous and returns a complete HTML document, either as a
string or as `RenderResult` with optional validated style/resource ownership. This is the
only place an app should install theme providers, collect React Native Web's
`AppRegistry` styles, inject product fonts, or establish other render context.
Those actions depend on app-owned packages and policy, so moving them into the
library would make Mokly app-specific and risk two React runtimes.

Module-resolution configuration is likewise consumer-owned: aliases,
conditions, package fields, extensions, loaders, and package roots describe the
consumer component tree. Mokly validates and applies them without supplying
React Native Web, Accounting, or Juno defaults.

## Registered Components

Consumers declare component props, saved variants, slots, controls and owned
resources through the public registration API. Mokly records actual render
invocations in the same React graph; import lists do not imply usage. The package
owns validation, attribution, variant pages and inspection. During local Serve,
a bounded worker reevaluates the retained successful consumer bundle and renders
controlled edits through its renderer. Preview documents/resources stay immutable
and in memory; controls do not change source, committed fragments or Changes.
Static export carries saved variants and inspection without the local capability.
See the [component contract](../protocol/mokly-components.md).

## Complete-Document Boundary

Consumers register complete HTML with `definePage` or nested `page`. A callback
may reuse an existing render helper, but discovery, comment expansion, route
aliases, and legacy lint settings are removed. Consumer policy owns source
allowlists and document-stage rules. A configured complete-document transformer
remains an explicit, deterministic consumer boundary whose result receives all
normal validation. Historical v2/v3 support belongs only to Git comparisons.

## Runtime Boundary

Browse serves only the configured mockups root and rejects protected authoring inputs, traversal, and symlink escapes. Watch targets come from resolved config and the complete source inventory; package-owned dependency/build/test/output trees are
pruned before broad consumer rules, while explicit source modules and
stylesheets retain their required action. Output HTML is pruned only when its
versioned, comment-safe generated header decodes to a source beneath an authored
root; consumer-authored public HTML may use explicit watch rules. A child closes
on either an orderly message/signal or loss of its parent IPC channel, and
supervisor shutdown waits for confirmed exit while escalating from IPC to
SIGTERM and SIGKILL. On-demand comparisons read the base
tree through bounded Git object batches, matches directory dependencies
recursively, rejects non-portable base resource URLs, and never checks the base
out over the worktree. No separate report pages or navigation payload are generated.
The comparison server redirects metadata requests to immutable generation URLs and retains
superseded directories for a bounded idle window. Responses disable HTTP
caching, while the versioned paths keep a comparison's panes and assets
on the same generation during regeneration. In-flight invalidations coalesce
behind the active generation, and only a marker-owned current output may enter
the server's temporary archive lifecycle. Archive roots are explicit
changed-path exclusions rather than consumer-owned ignore policy, and shutdown
drains generation work before removing them.

Browse promotes only explicit id-addressed
catalogue links from manifest-owned generated fragments and complete pages
whose ownership header matches the entry's manifest `sourcePath` into outer
Browse routes. Adapted public unowned HTML loses reserved-looking metadata and
is never trusted. A generated document with an activatable catalogue link
rejects `<base href>` so its relative fallback cannot resolve differently from
the portable bytes Browse authenticates. Browse uses same-origin inspection
for parent enhancement but no top-navigation capability, so direct and nested
consumer contexts remain unable to replace the shell. Portable generated files
keep relative artifact fallbacks, while ordinary product, asset, and
external links remain consumer-owned. The
[catalogue navigation protocol](../protocol/mokly-navigation.md) defines the
link marker, sandbox boundary, and active-tree invariant.

## Export Boundary

`src/export` orchestrates existing Build, Browse rendering, and comparison
boundaries. Its only new consumer interface is the CLI: no deep imports or
hosting SDK is required. Typed shell-owned delivery metadata supplies exact
static routes and immutable comparison URLs. The exporter owns file selection,
input consistency, exclusive output reservation, replacement, and rollback;
`scripts/preview` captures one already-built Browse snapshot with optional Changes
and adds Pages URL/header metadata and old-preview migration. Both paths share
artifact validation, deployment identity, and the output transaction, and reuse
the same shell renderer and comparison engine. Watch ignores inventory-listed
export files while traversing output directories for new authored files.

## Related Docs

- [Build pipeline](./build-pipeline.md)
- [Package and authoring protocol](../protocol/mokly-package.md)
- [Runtime protocol](../protocol/mokly-runtime.md)
- [Static export contract](../protocol/mokly-export.md)
- [Static delivery contract](../protocol/mokly-export-delivery.md)
