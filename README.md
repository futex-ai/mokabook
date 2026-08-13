# Mokabook

Mokabook turns React-authored mobile and desktop mockups into committed static
HTML and serves the resulting catalogue during development, with Git-based
change detection built into Browse. It is app-independent: product screens,
component libraries, themes, styles, and compatibility adapters stay in the
consuming repository.

The public [npm package](https://www.npmjs.com/package/mokabook) and executable
are both named `mokabook`. Releases remain pre-1.0 while the consumer contract
settles.

## Use Mokabook

Install Mokabook and its React peers in the repository that owns the screens:

```bash
npm install --save-dev mokabook react react-dom
```

Create `mokabook.config.ts`:

```ts
import { defineConfig } from "mokabook";

export default defineConfig({
  colorSchemes: ["light", "dark"],
  repoRoot: ".",
  entriesDir: "docs/mockups/src/entries",
  mockupsDir: "docs/mockups",
  renderer: "docs/mockups/src/renderer.tsx",
  stylesheets: [{ match: "app/**/*.html", stylesheets: ["app.css"] }],
  changes: {
    base: "origin/main",
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
    mobile: <MockLink to="account-detail">Details</MockLink>,
    desktop: <MockLink to="account-detail">Details</MockLink>,
    relatedDocs: ["docs/account.md"],
    dependencies: ["src/account/home.tsx"],
    useCaseIds: [],
  }),
];
```

`mobile` and `desktop` accept any React node; real screens usually wrap their
content in a `<main>` landmark because each fragment is generated as its own
standalone page.

Color-scheme adoption has two steps: enable `colorSchemes: ["light", "dark"]`
in the config, then select the consumer theme from `input.colorScheme` in the
configured renderer. Mokabook re-renders the same mobile and desktop nodes for
dark output; authors do not duplicate screen trees. A deliberately light-only
screen opts out in either `defineScreen` or a nested `screen` marker:

```tsx
defineScreen({
  // Other screen fields stay unchanged.
  colorSchemes: ["light"],
});
```

Light-only catalogues omit `colorSchemes`, keep their existing renderer, and
produce the same fragment names and manifest bytes as before.

Run the CLI through a local dependency or directly with npx:

```bash
npx mokabook                         # build, serve, and watch
npx mokabook serve --no-watch --port 0
npx mokabook build
npx mokabook check
```

Options follow the command, so an explicit config is
`npx mokabook build --config path/to/mokabook.config.ts`. With a local
development dependency, `npx --no-install mokabook` guarantees npm does not
fall back to the registry. After the first release, a clean machine may use
`npx --package mokabook mokabook` without adding a dependency.

| Command              | Outcome                                                |
| -------------------- | ------------------------------------------------------ |
| `mokabook`           | Build, serve, and watch using a stable development URL |
| `mokabook serve`     | Serve Browse; add `--no-watch` for one child process   |
| `mokabook build`     | Validate and transactionally write generated output    |
| `mokabook check`     | Compare expected and committed bytes without writing   |
| `mokabook --help`    | Show commands and their supported options              |
| `mokabook --version` | Print the installed package version                    |

Serve starts at port `4173`. If that port, or a concrete `--port` value, is
already occupied, Mokabook tries each following port in order until one is
free. `--port 0` instead asks the operating system to choose a free port.
Watched Serve keeps the first resolved port for later child restarts so its URL
stays stable.

`build` writes one fragment per effective viewport and color-scheme view plus
`mokabook-manifest.json` under `mockupsDir`. `check` calculates those bytes
without writing and reports missing, stale, or orphan generated files. Browse
serves the package-owned Mokabook shell — catalogue navigation with
folder/screen/flow icons and an All/Changed filter, linked breadcrumbs with
hash-prefixed copyable ID chips, realistic browser chrome with an
expand-to-overlay toggle, phone chrome whose screen reserves a clock, signal,
Wi-Fi, and battery status band above the mobile fragment, header viewport
controls, a Light/Dark switch when the catalogue has dark fragments, use-case
flows, a details inspector that remembers its disclosure across routes and
reloads, id redirects, and watched updates. The Changed filter compares
route-level manifest metadata, generated fragments, and explicitly declared
dependencies with the branch point shared by `HEAD` and the configured Git
base. Commits added only to the base branch after divergence do not appear as
branch changes; staged, unstaged, and untracked workspace edits still do. A
registry module that defines many routes does not make every route appear
changed merely because the module's imports or composition changed.
A declared dependency may be a file or directory; a changed descendant of a
directory is reported as the screen's change evidence.

Consumer documents run in sandboxed frames.
Inside a fragment, use `MockLink` for catalogue destinations; root-absolute and
logical screen routes are not portable links in generated static files. Build
and check rewrite and validate every supported `href` and `data-nav-href`, plus
local HTML resource attributes and transitive CSS URLs. Watched Serve keeps its
resolved port, transactionally reloads a changed consumer config with a ready
replacement watcher, and serially replaces a child that exits unexpectedly
after readiness. A watched child also closes its server when the parent IPC
channel disconnects. Header-proven generated output plus package-owned
dependency, build, test, and transaction paths are pruned even when a
custom rule watches the repository root; an unowned public HTML file can still
use an explicit watch rule, and configured stylesheets retain reload
precedence. Shutdown interrupts replacement-watcher readiness, closes the
candidate before draining the remaining lifecycle, and waits for child exit
through graceful, terminate, and force-kill stages. Open Browse pages
connect to the versioned event stream and reload after a newer build or asset
version arrives. A
watched reload restores the current Browse search, filter, disclosures,
viewport, drawer, and scroll state once on the same durable URL.
Browse also retains each history entry's latest document position for Back and
Forward.
A rejected config or failed candidate build leaves the last-good watcher,
output, and child active.

## Configuration

Mokabook discovers `mokabook.config.ts`, `.mts`, `.js`, or `.mjs` by walking
upward from the current directory. Every filesystem path is relative to that
file and confined to `repoRoot`.

- `entriesDir` and `mockupsDir` select structured source and generated output.
- `colorSchemes` defaults to `["light"]`; `["light", "dark"]` enables dark
  fragments catalogue-wide, with per-screen light-only opt-outs.
- `renderer` and ordered `stylesheets` keep product themes and CSS
  consumer-owned. A stylesheet rule may append `lightStylesheets` or
  `darkStylesheets` after its shared list for the matching output.
- `moduleResolution` configures package roots, aliases, export conditions,
  package fields, file extensions, and esbuild loaders for cross-platform
  component trees.
- `legacy` opts into `.source.*` pages, component expansion, route aliases,
  excluded migration sources, and generic lints.
- `watch` classifies additional consumer inputs after proven package-owned
  ignores and configured stylesheets; this includes authored static HTML under
  `mockupsDir`. `changes` selects the Git base ref used to find the branch
  point and the shared-impact globs.
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

`npm run test:browser` drives the served Browse shell
in Chromium via Playwright; it uses the installed Chrome channel by default and
honors `PLAYWRIGHT_CHANNEL` for an alternative browser install. Parallel
workspaces can set `MOKABOOK_PLAYWRIGHT_PORT` to an available port.

`cargo xtask check` is the authoritative local gate. It includes formatting,
lint, typechecking, unit/integration tests, the committed example, package
allowlist and license checks, clean packed ESM/NodeNext/npx/Accounting/Juno
consumers, Chromium tests, and all Rust checks.

## Preview Deployments

`npm run preview:build` turns the real `examples/basic` Browse catalogue into a
static Cloudflare Pages artifact at `.context/mokabook-preview`. It snapshots
every catalogue route through Mokabook's HTTP server, copies the package shell
and public example assets, preserves id redirects, and excludes the
development-only live-reload connection. The snapshot compares the catalogue
with `origin/main`, so Browse includes its All/Changed filter even when the
changed count is zero. The artifact is not part of the npm package.

The Preview workflow deploys `main` to the Cloudflare Pages project `mokabook`
at `https://mokabook.pages.dev`. Same-repository, non-release pull requests use
the stable `pr-<number>` branch alias at
`https://pr-<number>.mokabook.pages.dev`; a sticky `<!-- mokabook-preview -->`
comment reports the deployment status and link. Preview checkouts retain full
Git history so `origin/main` and route-level changes can be resolved. Closing a
pull request marks that comment inactive and attempts to remove its
deployments. Fork pull requests do not receive Cloudflare credentials, and
Release Please pull requests are skipped because their source changes were
already previewed.

Maintainers must create the direct-upload Pages project with `main` as its
production branch, then configure repository variable `CLOUDFLARE_ACCOUNT_ID`
and repository secret `CLOUDFLARE_PAGES_API_TOKEN` (or
`CLOUDFLARE_API_TOKEN`). The token needs Pages write access for deploy and
cleanup operations.

```bash
npx --no-install wrangler pages project create mokabook --production-branch main
```

## Releasing

Changes use Conventional Commits. On `main`, release-please maintains the
reviewed version/changelog PR; merging that PR creates an immutable `vX.Y.Z`
release. The same [Release workflow](./.github/workflows/release.yml) checks the
tag, reruns the full gate, packs and smoke-tests the exact tarball, guards an
already-published version, and publishes through npm trusted publishing. A
bounded post-publish check tolerates npm metadata, tarball, dist-tag, and
signature propagation before proving the registry artifact. A manual
`publish_ref` retries only an existing tag. See the
[release protocol](./docs/protocol/npm-release.md) for the one-time `0.0.0`
bootstrap and maintainer settings; do not add an npm write token to GitHub.

The synthetic fixture at [`examples/basic`](./examples/basic/README.md) proves
custom rendering, stylesheets, id links, collections, use cases, and
Review-ignore markers without importing an application. Its screens use
`@firna/ui` through a react-native-web renderer adapter, so the example also
proves the consumer contract against a real cross-platform component stack.
Its `Design` catalogue holds the approved Browse shell mockups
recorded by the
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
- [`src/changes`](./src/changes) — Git extraction, comparison, and ignore
  normalization for change detection.
- [`src/legacy`](./src/legacy) — opt-in migration sources and component expansion.
- [`xtask`](./xtask/README.md) — full repository checks and post-push review.

### Related Docs

- [Protocol index](./docs/protocol/README.md)
- [Package ownership boundary](./docs/architecture/package-boundary.md)
- [Accounting migration inventory](./docs/migration/accounting-framework-inventory.md)
- [Implementation plans](./plans/README.md)
