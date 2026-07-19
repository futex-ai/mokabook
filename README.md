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

`build` writes viewport fragments and `mokabook-manifest.json` under
`mockupsDir`. `check` calculates those bytes without writing and reports
missing, stale, or orphan generated files. Browse currently uses a deliberately
plain diagnostic shell while the package-owned responsive UI is developed.
Consumer documents run in sandboxed frames. Review keeps unmodified base/head
documents in separate snapshot trees and copies their referenced local CSS,
fonts, and images so comparison artifacts do not depend on the live workspace.
Inside a fragment, use `MockLink` for catalogue destinations; logical screen
routes are Browse identifiers, not generated static files.

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

## Developer Setup

The repository requires Node.js 22.14 or newer, npm 11, and Rust 1.95 for its
repository tasks.

```bash
npm ci
npm run build
npm test
npm run example:build
npm run example:check
cargo xtask check
```

The synthetic fixture at [`examples/basic`](./examples/basic/README.md) proves
custom rendering, stylesheets, id links, collections, use cases, and
Review-ignore markers without importing an application.

### Key Code

- [`src/index.ts`](./src/index.ts) — supported public authoring API.
- [`src/config`](./src/config) — config discovery, loading, and confinement.
- [`src/build`](./src/build) — single-graph bundling, compilation, links, check,
  and transactional writes.
- [`src/server`](./src/server) — manifest-backed HTTP and watched child lifecycle.
- [`src/review`](./src/review) — Git extraction, comparison, ignore normalization,
  and static artifacts.
- [`src/legacy`](./src/legacy) — opt-in migration sources and component expansion.
- [`xtask`](./xtask/README.md) — full repository checks and post-push review.

### Related Docs

- [Protocol index](./docs/protocol/README.md)
- [Package ownership boundary](./docs/architecture/package-boundary.md)
- [Accounting migration inventory](./docs/migration/accounting-framework-inventory.md)
- [Implementation plans](./plans/README.md)
