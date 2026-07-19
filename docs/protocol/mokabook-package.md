# Mokabook Package And Authoring Contract

## Scope

Mokabook is shared developer tooling for repositories that keep visual mockups
as code and committed static artifacts. The package owns catalogue definitions,
generation, validation, Browse, and Review behavior. A consumer owns all product
screens, product copy, product components, styling, theme setup, and generated
product output.

The package must be usable by Accounting and Juno without importing either
application or recognizing application-specific route names. Synthetic screens
may exist only under examples and test fixtures.

## Package Identity

- The public package name is `mokabook`.
- The package exposes one executable named `mokabook`.
- With no subcommand, the executable runs watched Browse mode.
- Zero-install and locally installed usage both use `npx mokabook`; npm can
  infer the package's sole executable.
- The unscoped package is always public. Firna is its author and controls the
  approved npm maintainer accounts, owner list, and release workflow.
- `mockbook` and `@firna/mockbook` are not package or executable aliases. The
  old spelling appears only when documenting the Accounting source being
  migrated.

The initial supported runtime is Node.js 22.14 or newer. CI must exercise the
minimum supported release and the current Firna release runtime. Unsupported
Node versions fail immediately with an actionable version error.

## CLI

The public commands are:

```text
mokabook                 Alias for `mokabook serve`
mokabook serve           Serve Browse and Review; watch by default
mokabook build           Generate static artifacts and the manifest
mokabook check           Validate source and committed generated output
mokabook review          Generate a static comparison artifact
mokabook --help          Show commands, options, and config discovery
mokabook --version       Show the installed package version
```

Common options include `--config <path>`. Serve accepts `--port`, `--base`,
`--watch`, and `--no-watch`. Review accepts `--base` and `--out`. A flag after
the package name belongs to Mokabook; docs must show npx arguments in a form
that is unambiguous to current npm.

Unknown commands, invalid values, absent configuration, and invalid catalogue
data exit non-zero. Expected author errors do not print JavaScript stacks unless
diagnostic output is explicitly requested.

## Configuration Discovery

Mokabook searches upward from the current working directory for
`mokabook.config.ts`, `mokabook.config.mts`, `mokabook.config.js`, or
`mokabook.config.mjs`, unless `--config` is supplied. Discovery stops at the
filesystem root and reports every filename it attempted when none is found.

The config's paths resolve relative to the config file, never relative to the
installed package or transient npx cache. `defineConfig` validates and types the
following contract:

- `mockupsDir`: output/catalogue root, such as `docs/mockups`;
- `entriesDir`: structured `*.mockup.ts` and `*.mockup.tsx` source directory;
- optional legacy page discovery and rendering settings;
- optional renderer-module path and declarative route-to-stylesheet rules;
- default Git base ref and Review output directory;
- shared-impact globs for Review;
- additional authored inputs and static assets for watched Serve;
- optional legacy link aliases and lint policy needed by that consumer.

The resolved config has one repository root, one mockups root, and normalized
repo-relative POSIX paths. Config validation rejects path traversal, output
outside the repository, overlapping authored/generated roots, duplicate rules,
and a watch path that cannot be classified safely.

No default may encode `docs/mockups` as a mandatory location, Accounting route
families, Bookfolio/Firna product tokens, email-template paths, or a TypeScript
workspace layout. A conventional `docs/mockups` layout may be offered by an
explicit initializer or documented example, not hidden in runtime logic.

## Public Authoring API

The root package export supplies typed, documented authoring helpers:

- `defineConfig`;
- `defineScreen`, `defineCollection`, and `defineUseCase`;
- `defineRoot`, `collection`, and `screen` for nested trees;
- `mockLink` and `MockLink` for id-addressed links;
- `ReviewIgnore`, `ReviewIgnoreScope`, and `reviewMaterialKey`.

A screen owns one mobile React node and one desktop React node. A collection is
structural and owns child ids but no route. A use case owns ordered references
to existing screens and never defines a screen inline. Ids are explicit,
globally unique kebab-case values and remain stable across navigation changes.

Each entry provides a title, description, navigation path, related docs, and
dependency paths. Screens and use cases provide a stable relative `.html`
route; use cases live under `user-flows/`. Screens may provide an address-bar
label and use-case membership. Nested definitions inherit declared metadata,
but ids never derive from tree position.

All public exports ship ESM JavaScript and declarations usable by NodeNext and
bundler TypeScript resolution. The package export map and packed-tarball tests
define the public boundary; consumers must not import `dist` internals.

## Rendering Boundary

Mokabook provides a plain React static renderer. A consumer may configure one
renderer module that receives the screen node, entry metadata, viewport,
resolved stylesheet links, and render context, and returns one complete HTML
document synchronously.

The renderer module is consumer code. It is where Accounting may add a Firna UI
theme provider or collect React Native Web atomic styles. Mokabook must not
depend on `@firna/ui`, React Native Web, Accounting tokens, or Juno components.

All entry modules and the renderer are bundled into one build-time graph with
one React instance. This must work when Mokabook is installed locally and when
it is fetched into npm's npx cache. Consumer dependencies resolve from the
consumer project, while imports of `mokabook` resolve to the executing
package version.

Stylesheet rules are ordered, declarative consumer configuration. Generated
fragment links are relative to the fragment route. Shell and device-frame CSS
is package-owned and self-contained; product CSS is never copied into the npm
package.

## Generated Contract

`mokabook build` writes deterministic output under `mockupsDir`:

- `<screen>.mobile.html` and `<screen>.desktop.html` fragments for each screen;
- legacy HTML only when legacy support is configured;
- `mokabook-manifest.json` using schema version 3.

Screen and use-case routes are durable identifiers and do not imply a composed
HTML file. A screen's fragments are bare product renders with required head
content but without Mokabook shell chrome. Collections generate no page.

Manifest source and output paths are repository-relative; routes are relative
to `mockupsDir`. The manifest includes every entry, fragment, legacy page,
relationship, related doc, and dependency needed by Browse and Review. It is
stable across operating systems and independent of absolute checkout paths.

Generated documents carry a generic generated-file header. Build removes only
files that it can prove were previously generated by the same configured
catalogue. It never deletes an unknown file.

## Legacy Compatibility

Legacy `.source.ts`, `.source.tsx`, and `.source.html` generation is an optional
transition feature. Generic discovery, bundling, stale/orphan detection, link
validation, screen-cap validation, and comment-component expansion belong to
the package.

Application-specific route repairs, allowlists, component registries, and
source-layout rules belong in the consumer config or adapter. Accounting's
historical app-family rewrites must not become defaults. New structured entries
must not rely on legacy route repair.

Manifest readers may accept Accounting's `mockbook-manifest.json` version 2
during the Accounting cutover, but every new build emits
`mokabook-manifest.json` version 3. Compatibility code has explicit fixtures
and a removal policy; it is not an undocumented fallback.

## Non-Goals

- Owning or publishing Accounting, Bookfolio, or Juno screens.
- Replacing a consumer's product component library or design tokens.
- Deploying a hosted Mokabook service.
- Hydrating product fragments into interactive application replicas.
- Requiring a monorepo, npm-workspace layout, or one fixed mockup directory.

## Related Docs

- [Build, Browse, and Review runtime](./mokabook-runtime.md)
- [CI and npm release](./npm-release.md)
