# React To Static HTML Build Pipeline

## Overview

```text
mokabook.config.ts
        |
        v
discover *.mockup.tsx + renderer + optional legacy/compatibility modules
        |
        v
one esbuild graph, with React resolved from the consumer
        |
        v
validate definitions and cross-references in memory
        |
        v
renderer({ node, entry, viewport, colorScheme, stylesheets })
        |
        v
resolve mock:id links -> compatibility bridge -> validate markers/links/resources
        |
        v
mobile/desktop light and optional dark HTML + schema-v3 manifest in memory
        |
        +---- check: compare with committed bytes, write nothing
        |
        `---- build: stage, back up owned files, rename, roll back on failure
```

## 1. Config Loading

Mokabook searches upward from the process working directory, or loads the path
given by `--config`. Config code is bundled to a temporary ESM module so `.ts`,
`.mts`, `.js`, and `.mjs` work from a local install or npx cache. Every path is
then resolved from the config file and confined to `repoRoot`.

## 2. One Consumer Graph

Structured `*.mockup.ts(x)` files, the configured renderer, optional legacy
TypeScript sources, an optional legacy component adapter, and an optional
temporary compatibility transformer are imported by a single virtual entry and
bundled together. The internal bundle is CommonJS so Node-oriented consumer
dependencies can retain dynamic built-in imports.

An esbuild resolver uses `createRequire(configPath)` for `react`, React
subpaths, `react-dom`, and React DOM subpaths. Imports of `mokabook` resolve to
the executing package. The result is one React runtime even when Mokabook itself
lives in npm's transient npx directory.

Consumer-owned aliases, export conditions, package fields, loaders, resolution
extensions, and in-repository package roots pass directly to this graph after
strict config validation. This supports React Native Web or other workspace
layouts without putting an app alias or TypeScript-root assumption in Mokabook.

Every module beneath `entriesDir` imports a module-bound Mokabook authoring
facade. Each definition or nested marker is therefore attributed at the helper
call itself, including calls made later through a shared helper factory, without
sticky process-global state or an absolute checkout path.

## 3. Rendering

Each screen owns a mobile and desktop React node. Mokabook selects the first
stylesheet rule matching the screen's catalogue route, applies it to each
effective viewport/color-scheme view, and resolves each emitted URL relative to
that view's generated fragment route. It then calls the configured renderer, or
its neutral default. The renderer receives:

```ts
interface RenderInput {
  entry: ScreenDefinition;
  node: ReactNode;
  stylesheets: readonly string[];
  viewport: "mobile" | "desktop";
  colorScheme: "light" | "dark";
}

type Renderer = (input: RenderInput) => string;
```

The returned string must be a complete HTML document. Mokabook currently
converts `ReviewIgnore` templates into inert comments and resolves every
complete value of the form `mock:<id>[#fragment]` found in `href` or
`data-nav-href` to viewport-matched fragments in the same color scheme, falling
back to light when the destination screen has no dark view. This rewrite is
attribute-based and does not yet distinguish the owning element. Both
attributes are resolved when they coexist, and the same pass covers legacy
pages, which remain light-only. Text, scripts, styles, and unrelated attributes
containing the same characters remain unchanged. A use-case link resolves
through its first screen; collections are intentionally not linkable.

The approved, not-yet-implemented
[catalogue navigation extension](../protocol/mokabook-navigation.md) will also
retain the stable id and optional fragment in a reserved `data-mokabook-link`
marker when an HTML `<a>`/`<area>` or SVG `<a>` has a logical `href`. A
`data-nav-href`-only reference remains validated portable metadata and does not
gain Browse interaction. The extension will reject logical `href` on every
non-link or resource element, validate matching destinations when both
navigation attributes coexist, reject consumer-authored markers, verify
fragment anchors across every target view, and bind expected marker presence,
element namespace/native-link class, and each logical attribute to the exact
portable value produced for that element. Until the active plan completes,
generated documents do not contain this marker or enforce that owner-based
`href` restriction.

During a staged migration only, a configured consumer transformer receives the
complete document, current route/viewport/color scheme, repository-relative
output path, available static/output routes, and view-resolved logical routes. The
transformed document must remain complete and then passes every normal
Review-marker, link, resource, path, and ownership check.

Once the navigation extension ships, this boundary will preserve complete
catalogue-reference records rather than markers alone. A transformer will not
be permitted to add, remove, or alter an expected marker, change a
metadata-only reference into an activatable link, change the owning element's
namespace or native-link class, change the set of navigation attributes that
carried its logical destination, or alter those attributes' resolved portable
values. After transforming the complete output set, the build will re-index
anchors from those final documents and repeat every logical fragment's
cross-view check. This keeps Browse, standalone, and Review navigation aligned.

React Native Web style collection is not a second conversion stage. If an app
uses it, its renderer wraps the node in the app provider, registers or renders
the tree with the app's React Native Web version, obtains that version's style
element, and inserts the result in the returned document. Mokabook sees only
the completed HTML string.

## 4. Validation And Commit

Registry ids, routes, relationships, files, output collisions, stylesheets,
ordinary and `data-nav-href` links, anchors, local HTML resource attributes,
`srcset`, inline/style-block CSS, transitive CSS imports/URLs,
Review-ignore/material markers, legacy policies, and manifest data are
validated before output changes. All expected bytes are held in memory.
`check` compares those bytes with disk and reports grouped missing, stale, and
proven-orphan paths.

Declared dependency paths may be files or directories. The manifest preserves
that declaration, and downstream Browse/Review impact matching treats a
directory as a root containing every changed descendant rather than requiring
an exact Git path match.

Pending generated orphans are derived once from the same ownership rule used by
Check and the output transaction. Link/resource validation and the temporary
compatibility route inventory exclude those routes before any write begins, so
a document cannot validate against a file that the successful transaction will
remove.

Watched Serve reuses that header-based ownership proof when pruning generated
HTML. Public HTML without the header remains a consumer-owned static input and
may be classified by an explicit watch rule.

Catalogue routes use portable URL-unreserved segments, reject Windows device
filename stems, and end in `.html`. Framework-generated links and redirects
still percent-encode every path segment defensively; static asset paths may
therefore contain characters such as spaces without corrupting HTML attributes
or URL query/fragment boundaries.

`build` writes a same-filesystem staging tree, backs up only files identified by
Mokabook's generated header and a source path beneath this config's authored
roots, or by the reserved manifest name. It installs staged files by rename and
restores backups on error. It refuses to overwrite an unknown or foreign HTML
file, rejects lexical or symlink-resolved targets beneath authored roots, and
never recursively replaces the consumer's mixed source/asset root.
