# Mokabook

Mokabook turns React-authored mobile and desktop mockups into committed static
HTML, serves the resulting catalogue during development, and creates Git-based
Review artifacts. It is app-independent: product screens, component libraries,
themes, styles, and compatibility adapters stay in the consuming repository.

The public npm package and executable are both named `mokabook`. The package is
currently pre-release and has not yet been published to npm.

## Use Mokabook

Install Mokabook and its React peers in the repository that owns the screens:

```bash
npm install --save-dev mokabook react react-dom
```

Create `mokabook.config.ts`:

```ts
import { defineConfig } from "mokabook";

export default defineConfig({
  repoRoot: ".",
  entriesDir: "docs/mockups/src/entries",
  mockupsDir: "docs/mockups",
  renderer: "docs/mockups/src/renderer.tsx",
  stylesheets: [{ match: "app/**/*.html", stylesheets: ["app.css"] }],
  review: {
    base: "origin/main",
    outDir: ".context/mokabook-review",
    sharedImpact: ["src/components/**", "src/tokens/**"],
  },
});
```

An entry module ends in `.mockup.ts` or `.mockup.tsx` and exports `mockups`:

```tsx
import { defineScreen, MockLink } from "mokabook";

export const mockups = [
  defineScreen({
    id: "account-home",
    title: "Account home",
    description: "The account landing screen.",
    navPath: ["Account"],
    route: "account/home.html",
    mobile: (
      <main>
        <MockLink to="account-detail">Details</MockLink>
      </main>
    ),
    desktop: (
      <main>
        <MockLink to="account-detail">Details</MockLink>
      </main>
    ),
    relatedDocs: ["docs/account.md"],
    dependencies: ["src/account/home.tsx"],
    useCaseIds: [],
  }),
];
```

Run the CLI through a local dependency or directly with npx:

```bash
npx mokabook                         # build, serve, and watch
npx mokabook serve --no-watch --port 0
npx mokabook build
npx mokabook check
npx mokabook review --base origin/main
```

Options follow the command, so an explicit config is
`npx mokabook build --config path/to/mokabook.config.ts`. With a local
development dependency, `npx --no-install mokabook` guarantees npm does not
fall back to the registry. After the first release, a clean machine may use
`npx --package mokabook mokabook` without adding a dependency.

| Command              | Outcome                                                 |
| -------------------- | ------------------------------------------------------- |
| `mokabook`           | Build, serve, and watch using a stable development URL  |
| `mokabook serve`     | Serve Browse; add `--no-watch` for one child process    |
| `mokabook build`     | Validate and transactionally write generated output     |
| `mokabook check`     | Compare expected and committed bytes without writing    |
| `mokabook review`    | Compare Git base/head screens and write a static Review |
| `mokabook --help`    | Show commands and their supported options               |
| `mokabook --version` | Print the installed package version                     |

`build` writes viewport fragments and `mokabook-manifest.json` under
`mockupsDir`. `check` calculates those bytes without writing and reports
missing, stale, or orphan generated files. Browse provides responsive catalogue
navigation, viewport controls, use-case steps, details, id redirects, and
watched updates. Review provides summary, side-by-side, overlay, and difference
views as a static artifact.

Consumer documents run in sandboxed frames. Review keeps unmodified base/head
documents in separate snapshot trees and copies their referenced local CSS,
fonts, and images so comparison artifacts do not depend on the live workspace.
Base resources must be regular Git files outside configured source roots.
Inside a fragment, use `MockLink` for catalogue destinations; root-absolute and
logical screen routes are not portable links in generated static files. Build
and check also validate local HTML resource attributes and transitive CSS URLs.
Watched Serve keeps its resolved port, transactionally reloads a changed
consumer config with a ready replacement watcher, and serially replaces a child
that exits unexpectedly after readiness. Open Browse and Review pages connect to its
versioned event stream and reload after a newer build or asset version arrives.
A watched reload restores the current Browse search, filter, disclosures,
viewport, drawer, and scroll state once on the same durable URL.
A rejected config or failed candidate build leaves the last-good watcher,
output, and child active.

## Configuration

Mokabook discovers `mokabook.config.ts`, `.mts`, `.js`, or `.mjs` by walking
upward from the current directory. Every filesystem path is relative to that
file and confined to `repoRoot`.

- `entriesDir` and `mockupsDir` select structured source and generated output.
- `renderer` and ordered `stylesheets` keep product themes and CSS consumer-owned.
- `moduleResolution` configures package roots, aliases, export conditions,
  package fields, file extensions, and esbuild loaders for cross-platform
  component trees.
- `legacy` opts into `.source.*` pages, component expansion, route aliases,
  excluded migration sources, and generic lints.
- `watch` classifies additional consumer inputs; `review` selects the Git base,
  artifact directory, and shared-impact globs.
- `compatibility.readManifestV2` reads Accounting's old manifest only when v3
  is absent. A temporary `compatibility.transformer` may deterministically
  repair already-authored documents during a consumer cutover; final links and
  resources are still validated.

Use `MockLink` for catalogue destinations. Raw relative links remain suitable
for real static assets and legacy documents, but logical screen/use-case routes
do not name generated files in schema v3.

## Rendering Boundary

The default renderer produces neutral static HTML. A consumer renderer can wrap
the React node in its theme/context and return a complete document. Accounting,
for example, will keep React Native Web style collection in that adapter rather
than making React Native Web a Mokabook dependency.

Entries, the renderer, and legacy TypeScript sources are bundled into one
build-time graph. React and React DOM resolve from the consumer config location,
which prevents duplicate React instances even when the executable came from an
npx cache. See [the build pipeline](./docs/architecture/build-pipeline.md) for
the complete raw-React-to-static-HTML flow.

The configuration module itself is also bundled from its own directory, so
imports of consumer workspace packages resolve before the temporary config
module is evaluated.

Consumer module-resolution overrides are explicit and contain no React Native
or app defaults. `packageRoots` must identify in-repository directories with a
`package.json`; Mokabook searches their `node_modules` directories while still
forcing React peers to the consumer's one runtime.

## Troubleshooting

- **No config found:** run from the consumer repository or pass `--config`
  after the command.
- **A generated file is stale:** run `mokabook build`, inspect the diff, then
  rerun `mokabook check`.
- **Mokabook refuses an overwrite:** the existing HTML lacks a valid Mokabook
  ownership header. Move it or choose a non-colliding route; the tool will not
  delete an authored file.
- **A package or React peer cannot resolve:** install React/React DOM in the
  consumer and configure the correct `moduleResolution.packageRoots` for a
  nested npm workspace.
- **A link fails validation:** use `MockLink` for an entry id and a relative URL
  for a real generated/static file. Root-absolute and source-tree links are not
  portable.
- **A watched edit fails:** fix the reported candidate build/config error. The
  last-good server remains active and adopts the next valid change.

## Developer Setup

The repository requires Node.js 22.14 or newer, npm 11, and Rust 1.95 for its
repository tasks.

```bash
npm ci
npm run build
npm test
npm run test:browser
npm run example:build
npm run example:check
cargo xtask check
```

`npm run test:browser` drives the served Browse shell and static Review pages
in Chromium via Playwright; it uses the installed Chrome channel by default and
honors `PLAYWRIGHT_CHANNEL` for an alternative browser install.

`cargo xtask check` is the authoritative local gate. It includes formatting,
lint, typechecking, unit/integration tests, the committed example, package
allowlist and license checks, clean packed ESM/NodeNext/npx/Accounting/Juno
consumers, Chromium tests, and all Rust checks.

## Releasing

Changes use Conventional Commits. On `main`, release-please maintains the
reviewed version/changelog PR; merging that PR creates an immutable `vX.Y.Z`
release. The same [Release workflow](./.github/workflows/release.yml) checks the
tag, reruns the full gate, packs and smoke-tests the exact tarball, guards an
already-published version, and publishes through npm trusted publishing. A
manual `publish_ref` retries only an existing tag. See the
[release protocol](./docs/protocol/npm-release.md) for the one-time `0.0.0`
bootstrap and maintainer settings; do not add an npm write token to GitHub.

The synthetic fixture at [`examples/basic`](./examples/basic/README.md) proves
custom rendering, stylesheets, id links, collections, use cases, and
Review-ignore markers without importing an application. Its `Design` catalogue
holds the approved Browse and Review shell mockups recorded by the
[shell design contract](./docs/protocol/mokabook-shell-design.md).

### Key Code

- [`src/index.ts`](./src/index.ts) — supported public authoring API.
- [`src/config`](./src/config) — config discovery, loading, and confinement.
- [`src/build`](./src/build) — single-graph bundling, compilation, links, check,
  and transactional writes.
- [`src/server`](./src/server) — manifest-backed HTTP, the responsive shell,
  and the watched child lifecycle.
- [`src/client`](./src/client) — progressive Browse navigation and versioned
  live updates served to the browser.
- [`src/review`](./src/review) — Git extraction, comparison, ignore normalization,
  and static artifacts.
- [`src/legacy`](./src/legacy) — opt-in migration sources and component expansion.
- [`xtask`](./xtask/README.md) — full repository checks and post-push review.

### Related Docs

- [Protocol index](./docs/protocol/README.md)
- [Package ownership boundary](./docs/architecture/package-boundary.md)
- [Accounting migration inventory](./docs/migration/accounting-framework-inventory.md)
- [Implementation plans](./plans/README.md)
