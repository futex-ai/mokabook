# Mokly Package And Authoring Contract

## Scope

Mokly is shared developer tooling for repositories that keep visual mockups
as code and committed static artifacts. The package owns catalogue definitions,
generation, validation, browsing, and on-demand comparisons. A consumer owns all product
screens, product copy, product components, styling, theme setup, and generated
product output.

The package must be usable by Accounting and Juno without importing either
application or recognizing application-specific route names. Synthetic screens
may exist only under examples and test fixtures.

## Delivery Status

This document describes implemented pre-release package and authoring behavior.
The catalogue-link implementation and its verification history are recorded in
the completed
[in-frame catalogue link navigation plan](../../plans/in-frame-catalogue-link-navigation.md).

[Whole-document pages](./mokly-pages.md) use the same IDs and hierarchy as
screens and flows. Current manifests require v5. The
[breaking migration](./mokly-page-migration.md) removes legacy configuration,
discovery, and rendering adapters; consumers use ordinary page definitions.

## Package Identity

- The public package name is `@mokly/mokly`.
- The package exposes one executable named `mokly`.
- With no subcommand, the executable runs watched Browse mode.
- Install with `npm install --save-dev @mokly/mokly react react-dom`, then use
  `npx mokly`. Zero-install usage explicitly selects the scoped package with
  `npx --package @mokly/mokly mokly`.
- The scoped package is always public. Mokly is its author, and the `mokly`
  npm organization manages approved maintainer-team access and the release
  workflow.
- The unscoped `mokly`, `mokabook`, and `mockbook` names are not package aliases.
  The latter two are not executable aliases either. Config discovery continues
  to use `mokly.config.*`; generator identities, ownership markers, and
  `MOKLY_*` environment variables do not include the npm scope.

The initial supported runtime is Node.js 22.14 or newer. CI must exercise the
minimum supported release and the current Firna release runtime. Unsupported
Node versions fail immediately with an actionable version error.

## CLI

The public commands are:

```text
mokly                 Alias for `mokly serve`
mokly serve           Serve the catalogue and diffs; watch by default
mokly build           Generate static artifacts and the manifest
mokly check           Validate source and committed generated output
mokly export --out <path>  Build a complete static catalogue for hosting
mokly publish         Export and upload to a configured catalogue service
mokly --help          Show commands, options, and config discovery
mokly --version       Show the installed package version
```

Common options include `--config <path>` and opt-in `--debug-timings`
([diagnostic contract](./mokly-timings.md)). Serve accepts `--port`, `--base`,
`--watch`, and `--no-watch`. Export requires `--out` and accepts `--base`;
Publish accepts an optional `--out` and the options in the
[upload contract](./mokly-upload.md). `--out` on other commands and the removed
`review` command are rejected.
Screen comparisons are requested from the catalogue. A flag after
the package name belongs to Mokly; docs must show npx arguments in a form
that is unambiguous to current npm.

The consumer `export` command and its config-relative `--out` option follow the
[static export contract](./mokly-export.md). It builds first, packages
comparisons using the configured or overridden Git base, and never uploads.
It adds no public JavaScript API or hosting-provider dependency.

Serve uses `4173` as its default starting port. An occupied concrete starting
port advances one at a time through `65535` until binding succeeds; exhausting
that range fails. Port `0` delegates free-port selection to the operating
system.

Unknown commands, invalid values, absent configuration, and invalid catalogue
data exit non-zero. Expected author errors do not print JavaScript stacks unless
diagnostic output is explicitly requested.

## Configuration Discovery

Mokly searches upward from the current working directory for
`mokly.config.ts`, `mokly.config.mts`, `mokly.config.js`, or
`mokly.config.mjs`, unless `--config` is supplied. Discovery stops at the
filesystem root and reports every filename it attempted when none is found.

The config's filesystem paths resolve relative to the config file, never
relative to the installed package or transient npx cache. Repository-matching
globs operate on repo-relative POSIX paths. `defineConfig` validates and types
the following contract:

- `mockupsDir`: output/catalogue root, such as `docs/mockups`;
- `entriesDir`: structured `*.mockup.ts` and `*.mockup.tsx` source directory;
- a light-only or light-and-dark catalogue rendering set;
- optional renderer-module path and declarative route-to-stylesheet rules;
- optional consumer package roots, aliases, conditions, fields, extensions, and
  loaders for app-owned module resolution;
- default Git base ref used to find the `HEAD` branch point, and internal comparison
  directory;
- shared-impact globs for comparisons;
- additional authored inputs and static assets for watched Serve;
- an optional temporary document transformer for an existing consumer cutover.

The resolved config has one repository root, one mockups root, and normalized
repo-relative POSIX paths. Config validation rejects path traversal, output
outside the repository (including through symlinks), overlapping
authored/generated roots, duplicate rules, and a watch path that cannot be
classified safely.

No default may encode `docs/mockups` as a mandatory location, Accounting route
families, Bookfolio/Firna product tokens, email-template paths, or a TypeScript
workspace layout. A conventional `docs/mockups` layout may be offered by an
explicit initializer or documented example, not hidden in runtime logic.

The normative configuration shape is:

```ts
type ColorScheme = "dark" | "light";

type ModuleLoader =
  | "base64"
  | "binary"
  | "css"
  | "dataurl"
  | "empty"
  | "file"
  | "js"
  | "json"
  | "jsx"
  | "text"
  | "ts"
  | "tsx";

interface MoklyConfig {
  colorSchemes?: readonly ColorScheme[]; // ["light"]
  entriesDir: string;
  mockupsDir: string;
  repoRoot?: string; // config directory
  renderer?: string;
  moduleResolution?: {
    aliases?: Readonly<Record<string, string>>;
    conditions?: readonly string[];
    loaders?: Readonly<Record<string, ModuleLoader>>;
    mainFields?: readonly string[];
    packageRoots?: readonly string[];
    resolveExtensions?: readonly string[];
  };
  stylesheets?: readonly {
    match: string;
    stylesheets: readonly string[];
    lightStylesheets?: readonly string[];
    darkStylesheets?: readonly string[];
  }[];
  review?: {
    base?: string; // origin/main; merge base with HEAD
    outDir?: string; // .context/mokly-review
    sharedImpact?: readonly string[];
  };
  watch?: {
    debounceMs?: number; // 75
    rules?: readonly {
      action: "ignore" | "rebuild" | "reload" | "restart";
      paths: readonly string[];
    }[];
  };
  compatibility?: {
    readManifestV2?: boolean; // false
    transformer?: string;
  };
}
```

Filesystem fields (`repoRoot`, `entriesDir`, `mockupsDir`, `renderer`,
compatibility transformer, module-resolution package
roots, and Review `outDir`) are config-relative. Stylesheet file paths are
relative to `mockupsDir`; HTTP(S) stylesheet URLs are allowed.
`colorSchemes` is a non-empty, duplicate-free subset of `"light" | "dark"`
that must include `"light"`; it defaults to `["light"]` and normalizes to
light-first order. Shared `stylesheets` apply to every generated view, with a
matching `lightStylesheets` or `darkStylesheets` list appended in declaration
order.
`watch.rules[].paths` and Review `sharedImpact` are repository-relative POSIX
globs, while stylesheet `match` matches catalogue routes. `repoRoot` defaults to the config directory. Duplicate stylesheet
matches and watch paths are invalid. Additional watch rules cannot override
configured source/module rebuilds, reloads for configured stylesheets and
referenced resources, or package-owned ignores for dependency, build, test, Review, header-proven
generated, and transaction paths. An unowned public HTML file below
`mockupsDir` remains consumer-authored and can match an explicit watch rule.
Authored source directories may sit below `mockupsDir` for a `docs/mockups/src`
layout, but they may not equal each other or the output root; generated routes
are collision-checked against those sources before writing. Review output must
not overlap a source or output root in either direction. That rule applies
to configured comparison output and the transactional writer boundary. The
[npm CLI](#cli) has no Review command or output override; the repository-only
[preview builder](./mokly-publication.md#publication-option) separately accepts
`--out` for its published catalogue. Export's
required `--out` has the additional source/runtime/ownership confinement rules
in the [export contract](./mokly-export.md).

`moduleResolution` has no defaults beyond esbuild's platform behavior. Package
roots must be in-repository directories containing `package.json`; their
`node_modules` directories supplement consumer lookup. Aliases accept bare
package specifiers only. Conditions, package fields, and extensions are ordered,
deduplicated lists, while loader keys are extensions and values are supported
esbuild loader names. React and React DOM still resolve through Mokly's
consumer-peer plugin so these options cannot introduce a second React runtime.

The `legacy` config key is rejected, including `legacy: undefined`. Register
complete documents explicitly with `definePage` or nested `page`, following the
[source-preserving migration](./mokly-page-migration.md). Historical manifest
compatibility does not restore source discovery or legacy configuration.

## Public Authoring API

The root package export supplies typed, documented authoring helpers:

- `defineConfig`;
- `defineScreen`, `definePage`, `defineCollection`, and `defineUseCase`;
- `defineRoot`, `collection`, `screen`, and `page` for nested trees;
- `defineComponent` and its schema-derived props, variants, and control types;
- `mockLink` and `MockLink` for id-addressed links;
- `ReviewIgnore`, `ReviewIgnoreScope`, and `reviewMaterialKey`.

The root also exports the authoring input/definition types, including
`PageInput`, `PageDefinition`, and `NestedPageInput`, plus configuration,
renderer, and compatibility-transformer interfaces. `ColorScheme` is exactly
`"dark" | "light"`; `Viewport` is `"desktop" | "mobile"`.

The [registered component contract](./mokly-components.md) owns the complete
`defineComponent` shape, slots, repeated-instance identity, dependencies, saved
variants, and runtime prop schema. It returns a renderable `Component` facade
and a registry `entry`; collections can reference that entry like a screen.
Component pages and controls use the existing consumer renderer and providers.

A screen owns one mobile React node and one desktop React node. A collection is
structural and owns child ids but no route. A use case owns ordered references
to existing screens and never defines a screen inline. A page owns one
complete HTML document from a synchronous render callback, with no device or
color variants. The [page contract](./mokly-pages.md) defines both explicit
and nested authoring forms. Ids are explicit,
globally unique kebab-case values and remain stable across navigation changes.

Each entry provides a title, description, related docs, and dependency paths.
A dependency may identify an existing repository file or directory; Review
matches the path itself and every descendant and reports the concrete changed
path as impact evidence. Dependency declarations and source paths alone do not
add entries to Browse Changes: that filter compares output, rendered resources,
reviewable metadata, and collection ancestry, then propagates affected screens
to their flows. See [the Changes contract](./mokly-changes.md).
Screens, pages, and use cases provide a stable relative `.html` route; use cases live
under `user-flows/`. Screens may
provide an address-bar label and use-case membership. Nested definitions
inherit declared metadata, but ids never derive from tree position.

Collection `childIds` are the only structured navigation hierarchy. Each child
may have at most one collection parent. A collection cannot repeat one child,
reference itself, participate in a longer collection cycle, or reference an
unknown id. Entries that no collection claims are catalogue roots. Breadcrumbs
are the root-to-parent sequence of ancestor collection titles; authors never
provide a separate breadcrumb or navigation-label path.

The common and nested-root input boundary is:

```ts
interface EntryInput {
  dependencies: readonly string[];
  description: string;
  id: string;
  rationale?: string;
  relatedDocs: readonly string[];
  title: string;
}

interface CollectionInput extends EntryInput {
  childIds: readonly string[];
}

interface RootCollectionInput {
  address?: string;
  dependencies?: readonly string[];
  description: string;
  id: string;
  rationale?: string;
  relatedDocs?: readonly string[];
  title: string;
}

interface RootInput {
  children: readonly NestedChild[];
  collection?: RootCollectionInput;
  path: string;
}
```

`defineRoot` always flattens nested children into ordinary definitions and
preserves their real `childIds` relationships. With `collection` metadata it
also emits that titled collection as the parent of every direct child. Without
`collection`, its direct children remain catalogue roots. A migration that
previously used a synthetic path label must add a real parent collection if
that visible group and breadcrumb should remain; genuinely top-level entries
stay unclaimed.

`defineScreen` and nested `screen` inputs may declare `colorSchemes`. When
omitted, a screen inherits the catalogue set; `colorSchemes: ["light"]` is the
supported opt-out from a dark-enabled catalogue. A declaration must be
non-empty, duplicate-free, include `"light"`, and be a subset of the config.
Nested trees do not inherit this field from their collections or root.

`defineScreen`, `definePage`, `defineUseCase`, and nested `screen` and `page`
inputs may also declare
`tags`, a classification list whose values use the same lowercase kebab-case
grammar as ids. A list must not repeat a tag, and authored order is preserved
rather than sorted. Collections are structural and reject the field, and nested
trees never inherit it from a collection or root. A collection is rejected for
carrying the key at all, so `tags: undefined` is as much a violation as
`tags: ["forms"]`. Tags are optional catalogue vocabulary, not a second
hierarchy: an untagged catalogue stays valid.

Imports of `@mokly/mokly` from modules beneath `entriesDir` bind the authoring
helpers to that importing module. Definitions created at module evaluation or
later through a shared helper factory therefore retain the helper module's
repo-relative source path without process-global attribution state.

Every catalogue-route segment starts with an ASCII letter or digit and then
uses only URL-unreserved ASCII letters, digits, `.`, `_`, `~`, or `-`. A
segment's filename stem must not be a Windows device name, and the complete
route must end in `.html`. Mokly percent-encodes each path segment whenever
it emits a URL in HTML or an HTTP redirect, including configured static asset
paths whose filenames contain other characters.

Logical screen and use-case routes are catalogue identifiers, not generated
documents. Fragment links must target a generated fragment or public static
asset with a relative URL; root-absolute links are rejected as non-portable.
Authors use `mockLink(id, fragment?)` or
`<MockLink to={id} fragment={fragment}>` for id-addressed catalogue navigation.
Complete raw `mock:<id>[#fragment]` values may also appear in `href` or
`data-nav-href`. The fragment is a bare HTML id without `#` or percent-encoding.
Both helpers immediately apply the registry's lowercase kebab-case id grammar
and reject fragment, percent-encoded, or `mock:` syntax in the id/`to` value;
only the separate fragment input or complete raw logical attribute form may
carry a fragment. The shared runtime predicates reject non-string values before
regular-expression evaluation, so untyped JavaScript callers cannot rely on
implicit coercion for either field. Generated documents retain a portable
relative target plus stable marker metadata on native HTML/SVG links so Browse
can open the canonical catalogue page without changing standalone or Review
behavior.
Metadata-only references use `data-nav-href`, and resource elements must keep
real resource URLs. A document with an activatable logical `href` must not
contain `<base href>`; the builder rejects that combination before and after
compatibility transformation while continuing to support `<base target>`. The
complete behavior is defined by the
[catalogue navigation contract](./mokly-navigation.md).
`MockLink asChild` explicitly adapts one consumer-styled control into that
native-link contract during static generation. Child attributes stay on the
child, inactive controls remain metadata-only, and ambiguous markup fails the
build. The complete API and rendering rules are in
[Styled catalogue link controls](./mokly-link-controls.md).
Local resource URLs in HTML source attributes, `srcset`, inline/style-block
CSS, and transitively referenced HTML/CSS must likewise resolve to public
static files beneath `mockupsDir` that remain after the pending build. An owned
generated file absent from the next output set is a pending orphan, never a
valid link or resource target merely because it still exists before commit.

All public exports ship ESM JavaScript and declarations usable by NodeNext and
bundler TypeScript resolution. The package export map and packed-tarball tests
define the public boundary; consumers must not import `dist` internals.

## Rendering Boundary

Mokly provides a plain React static renderer. A consumer may configure one
renderer module that receives the screen node, entry metadata, viewport,
resolved stylesheet links, and render context, and returns one complete HTML
document synchronously.

The renderer module is consumer code. It is where Accounting may add a Firna UI
theme provider or collect React Native Web atomic styles. Mokly must not
depend on `@firna/ui`, React Native Web, Accounting tokens, or Juno components.

The renderer module has one default synchronous export with this exact
contract:

```ts
import type { ReactNode } from "react";
import type {
  ColorScheme,
  ScreenDefinition,
  ComponentDefinition,
  ComponentStyleOwnership,
  ComponentResourceOwnership,
  Viewport,
} from "@mokly/mokly";

interface RenderInput {
  colorScheme: ColorScheme;
  entry: ScreenDefinition | ComponentDefinition;
  variantId?: string;
  componentProps?: Readonly<Record<string, unknown>>;
  node: ReactNode;
  stylesheets: readonly string[];
  viewport: Viewport;
}

interface RenderResult {
  html: string;
  styles?: readonly ComponentStyleOwnership[];
  resources?: readonly ComponentResourceOwnership[];
}

export default function render(input: RenderInput): string | RenderResult;
```

The string or `html` field must contain a complete `<html>` document. Optional
style/resource records provide exact component ownership; unclaimed or mixed
material stays conservative. The [component contract](./mokly-components.md)
and [attribution contract](./mokly-component-changes.md) define validation. Mokly
serializes Review-ignore markers, adapts opt-in `MockLink asChild` controls,
and rewrites every complete
`mock:<id>[#fragment]` value found in `href` or `data-nav-href` after this
function returns, including when one element has both attributes. The rewrite
is element-aware and applies to complete page output: logical `href` is valid only on
native HTML/SVG links, every other owner fails the build, documents with an
activatable logical link reject `<base href>`, and final compatibility output
is checked through that fail-closed contract. The
package declares `react` and `react-dom` `>=19.0.0` as peers and does not ship a
private runtime. The builder resolves both peers and their subpaths from
consumer config, then bundles every React-bearing input in one internal graph.

The builder invokes the renderer once for every effective viewport and color
scheme. Light stays the default and canonical render. The consumer renderer
uses `colorScheme` to select its theme and may stamp `color-scheme` or a data
hook on the complete document; Mokly does not own product theme state.

All entry modules and the renderer are bundled into one build-time graph with
one React instance. This must work when Mokly is installed locally and when
it is fetched into npm's npx cache. Consumer dependencies resolve from the
consumer project, while imports of `@mokly/mokly` resolve to the executing
package version.
Config dependencies are bundled from the config directory before the temporary
module is evaluated, so bare workspace/package imports never resolve from the
operating-system temporary directory or npx cache.

### Temporary Document Compatibility

A consumer with already-authored output may configure one synchronous
`compatibility.transformer` module. It is bundled into the same consumer graph
and default-exports this contract:

```ts
interface CompatibilityTransformInput {
  availableRoutes: readonly string[];
  colorScheme: "dark" | "light";
  content: string;
  logicalRoutes: Readonly<Record<string, string>>;
  outputPath: string;
  route: string;
  viewport: "mobile" | "desktop";
}

type CompatibilityTransformer = (input: CompatibilityTransformInput) => string;
```

`availableRoutes` contains the complete pending output plus retained existing
public static files; generated files scheduled for orphan removal are excluded.
`logicalRoutes` maps screen/use-case catalogue routes to concrete artifacts for
the current viewport and color scheme. A dark document targets dark fragments
when the destination supports them and otherwise falls back to the light
fragment. `outputPath` is repository-relative; no absolute checkout path is
exposed. Mokly applies the transformer after id links resolve and before
Review-marker, link, resource, and ownership validation. It must return a
complete document, retain the exact generated source owner, remain
deterministic, and stay consumer-owned. The shared ownership parser accepts LF
or CRLF after the header and strictly decodes its versioned canonical-base64
source field, but a missing or changed source identity fails before write. This
keeps source filenames out of HTML comment syntax; former raw-path headers are
accepted only when their source is comment-safe so existing files can be
recognized for migration. A transformer must retain the current encoded form
and cannot weaken final validation. New catalogues should author portable links
directly and leave this option unset.

Stylesheet rules are ordered, declarative consumer configuration. Their globs
match the catalogue route before viewport fragments are derived, so one exact
screen-route rule applies to both viewports and every enabled scheme. Shared
stylesheets come first, followed by the matching scheme-specific list.
Generated fragment links are relative to the fragment route and URL-encoded by
segment.
Shell and device-frame CSS is package-owned and self-contained; product CSS is
never copied into the npm package.

## Generated Contract

`mokly build` writes deterministic output under `mockupsDir`:

- `<screen>.mobile.html` and `<screen>.desktop.html` fragments for each screen;
- `<screen>.mobile.dark.html` and `<screen>.desktop.dark.html` when that screen's
  effective schemes include dark;
- one complete HTML document at each page route;
- `mokly-manifest.json` using schema version 5.

Screen and use-case routes are durable identifiers and do not imply a composed
HTML file. A screen's fragments are bare product renders with required head
content but without Mokly shell chrome. Collections generate no page.
Light fragments remain canonical and unsuffixed. Turning dark off makes the
previous dark documents proven generated orphans: `check` reports them and
`build` removes them through the normal ownership-safe lifecycle.

Manifest source and output paths are repository-relative; routes are relative
to `mockupsDir`. The manifest includes every entry, fragment, source input,
relationship, related doc, and dependency needed by Browse and Review. It is
stable across operating systems and independent of absolute checkout paths.
Repository paths are canonical POSIX paths with no empty, dot, parent, drive,
or backslash segments; generated manifests are self-validated before writing.

Generated documents carry a generic generated-file header. After compatibility
transformation, every pending document must retain the expected source path in
that header. The same parser accepts LF and CRLF and lets Build remove only
files proven to have been generated by the configured catalogue: an HTML
header's source must belong to the current entries root even when
that source was just deleted. It never deletes an unknown or foreign-catalogue
file.

All catalogues emit [manifest v5](./mokly-component-manifest.md), including
pages, source inventory, saved component variants and per-view invocation/ownership
records. Historical readers accept v3, both disjoint v4 formats, and opt-in v2.
The common current shape is:

```ts
interface ManifestV5 {
  schemaVersion: 5;
  generatedBy: "mokly";
  entries: readonly ManifestEntry[];
  sourceFiles: readonly string[];
}

interface CommonEntry {
  id: string;
  kind: "screen" | "collection" | "use-case" | "page" | "component";
  title: string;
  description: string;
  rationale?: string;
  navPath: readonly string[];
  sourcePath: string;
  relatedDocs: readonly string[];
  dependencies: readonly string[];
  declaredDependencies: readonly string[];
}

type ManifestEntry =
  | ManifestComponent // See the component manifest contract for the complete shape.
  | (CommonEntry & { kind: "page"; route: string; tags?: readonly string[] })
  | (CommonEntry & {
      kind: "screen";
      route: string;
      address?: string;
      tags?: readonly string[];
      componentViews?: readonly ComponentViewRecord[];
      darkFragments?: { mobile: string; desktop: string };
      fragments: { mobile: string; desktop: string };
      viewports: readonly ["mobile", "desktop"];
      useCaseIds: readonly string[];
    })
  | (CommonEntry & {
      kind: "collection";
      childIds: readonly string[];
    })
  | (CommonEntry & {
      kind: "use-case";
      route: string;
      tags?: readonly string[];
      steps: readonly {
        screenId: string;
        title?: string;
        description?: string;
      }[];
    });
```

Entries sort by route then id; source inputs, dependencies, and generated files
sort lexically. Optional properties are omitted, not emitted as `null`.
`navPath` is derived output derived from collection ancestry;
it contains the ordered ancestor collection titles and is empty for catalogue
roots. It is not an authoring input and it is not a second source of hierarchy.
`darkFragments` is present exactly when the screen's effective schemes include
dark. Its routes use the `.mobile.dark.html` and `.desktop.dark.html` names and
participate in the same safe-route and collision validation as light fragments.
Light-only manifests omit the field.
`tags` carries the authored classification list, in authored order and never
sorted, and is written only for a page, screen, or use case that declares a non-empty
one; an absent or empty declaration is omitted, so an untagged catalogue
serializes exactly as it did before the field existed.
`sourcePath`, related docs, and dependencies use repo-relative POSIX paths.
Manifest dependencies retain the file-or-directory-root matching semantics of
the authoring API.

## Page Migration And Historical Comparisons

`legacy` configuration is rejected, including an explicitly undefined value.
Register complete synchronous HTML with `definePage` or nested `page`; move
comment components, source allowlists, and stage policy into consumer code.
The [migration contract](./mokly-page-migration.md) specifies safe archival
of verified old artifacts without weakening generated-file ownership.

Current reads accept only canonical `mokly-manifest.json` schema v5 with a
`mokly` generator identity and validate the
[resolved source inventory](./mokly-source-protection.md). Git comparisons
prefer that filename, then accept the former `mokabook-manifest.json` and
normalize its `mokabook` generator identity. They accept v5, historical v3, and
both disjoint historical v4 formats. A v2 `mockbook-manifest.json` is considered
only when both newer historical filenames are absent and
`compatibility.readManifestV2` is enabled. Invalid higher-precedence history
never falls back. Historical readers never execute consumer code.

The [page contract](./mokly-pages.md) defines the public page inputs,
rendering pipeline, exact routes, inheritance, and schema validation.

## Non-Goals

- Owning or publishing Accounting, Bookfolio, or Juno screens.
- Replacing a consumer's product component library or design tokens.
- Deploying a hosted Mokly service.
- Hydrating product fragments into interactive application replicas.
- Requiring a monorepo, npm-workspace layout, or one fixed mockup directory.

## Related Docs

- [Build, Browse, and Review runtime](./mokly-runtime.md)
- [CI and npm release](./npm-release.md)
