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
renderer({ node, entry, viewport, stylesheets })
        |
        v
resolve mock:id links -> compatibility bridge -> validate markers/links/resources
        |
        v
mobile/desktop HTML + schema-v3 manifest in memory
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
stylesheet rule matching the screen's catalogue route, applies it to both
viewports, and resolves each emitted URL relative to that viewport's generated
fragment route. It then calls the configured renderer, or its neutral default.
The renderer receives:

```ts
interface RenderInput {
  entry: ScreenDefinition;
  node: ReactNode;
  stylesheets: readonly string[];
  viewport: "mobile" | "desktop";
}

type Renderer = (input: RenderInput) => string;
```

The returned string must be a complete HTML document. Mokabook then converts
`ReviewIgnore` templates into inert comments and resolves complete `href`
values of the form `mock:<id>` in `href` and `data-nav-href` to
viewport-matched fragments. The same pass covers legacy pages. Text, scripts,
styles, and unrelated attributes containing the same characters remain
unchanged. A use-case link resolves through its first screen; collections are
intentionally not linkable.

During a staged migration only, a configured consumer transformer receives the
complete document, current route/viewport, repository-relative output path,
available static/output routes, and viewport-resolved logical routes. The
transformed document must remain complete and then passes every normal
Review-marker, link, resource, path, and ownership check.

React Native Web style collection is not a second conversion stage. If an app
uses it, its renderer wraps the node in the app provider, registers or renders
the tree with the app's React Native Web version, obtains that version's style
element, and inserts the result in the returned document. Mokabook sees only
the completed HTML string.

## 4. Validation And Commit

Registry ids, routes, relationships, files, output collisions, stylesheets,
links, anchors, local HTML resource attributes, `srcset`, inline/style-block
CSS, transitive CSS imports/URLs, Review-ignore/material markers, legacy
policies, and manifest data are validated before output changes. All expected
bytes are held in memory. `check` compares those bytes with disk and reports
grouped missing, stale, and proven-orphan paths.

Pending generated orphans are derived once from the same ownership rule used by
Check and the output transaction. Link/resource validation and the temporary
compatibility route inventory exclude those routes before any write begins, so
a document cannot validate against a file that the successful transaction will
remove.

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
