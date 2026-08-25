# Basic Mokabook Consumer

This is a synthetic external-consumer fixture. It contains two distinct mobile
and desktop product-style screens built with `@firna/ui` controls, nested
collections, one use case, id-addressed links, a Firna renderer adapter, local
stylesheets, light and dark product fragments, and a safe Review-ignore region.
It contains no Accounting or Juno product screen.

The entry definitions use collection membership as their only navigation
hierarchy. The real `Example` collection owns `Screens` and the example tour;
the real `Design` collection owns the `Mokabook design` tree. Those parent
collections preserve the intended visible groups and automatically produce
the same breadcrumb ancestry. Consumer code does not provide `navPath`; when
migrating an older catalogue, keep a former synthetic group only by adding an
equivalent parent collection.

The Welcome screen uses
`<MockLink to="example-details" fragment="details">` to prove that generated
HTML keeps a portable relative artifact link while served and deployed Browse
navigate to the canonical Details page, retain its anchor through Light/Dark
swaps, and select the Details row in the catalogue tree. The reciprocal Details
link exercises the id-only form.

## Firna renderer adapter

`renderer.tsx` is the reference consumer adapter for react-native-web
component libraries: it wraps every screen in `SharedUiThemeProvider` (themed
by `theme.ts`), selects the light or dark theme from `input.colorScheme`,
renders one React tree with `react-dom/server`, collects react-native-web's
atomic styles through `AppRegistry`, and injects them into the document head.
The adapter also stamps the document's `data-color-scheme`/`color-scheme`
hooks and, for dark fragments, emits dark-safe body text and link colors for
plain HTML outside Firna components.
`mokabook.config.ts` enables both schemes and pairs the renderer with the
`moduleResolution` settings such a stack needs — the `react-native` →
`react-native-web` alias, `react-native`-first conditions and main fields,
`.web.*`-first resolve extensions, and the `.js` → `jsx` loader. Consumers that
render plain React DOM need none of this and can keep a plain
`renderToStaticMarkup` adapter.

The `Design` navigation group is the approved design catalogue for Mokabook's
own Browse and Review shell: sixteen screens covering the Browse home,
selected screen and use case, details panel, missing route, narrow navigation,
the dark-scheme and light-only stage states, and the changed, added, removed,
difference, dark-view, shared-impact, ignored-only, and empty Review states,
each with distinct mobile and desktop variants. The sixteen design screens
explicitly opt out with `colorSchemes: ["light"]` because they are light
documents that draw the Mokabook shell, including the three that depict the
shell with dark selected; the two product screens inherit the catalogue default
and prove dark generation. The recorded
tokens and responsive rules live in
[`docs/protocol/mokabook-shell-design.md`](../../docs/protocol/mokabook-shell-design.md).

From the repository root:

```bash
npm run example:build
npm run example:check
node dist/cli/bin.js serve --config examples/basic/mokabook.config.ts --port 0 --no-watch
npm run preview:build
```

Generated HTML and the schema-v3 manifest are committed under `generated/` so
the fixture also exercises stale and deterministic-output checks. The
hand-authored stylesheets (`styles.css`, `design.css`, `design-stage.css`,
`design-review.css`) also live under `generated/` because it doubles as the
public static root. `preview:build` snapshots this catalogue through the real
server into `.context/mokabook-preview` for Cloudflare Pages; it is the same
artifact used by the main and pull-request preview workflow. The snapshot
compares the catalogue with its branch point on `origin/main` and preserves
Browse's All/Changed filter, Light/Dark switch, client assets, and light/dark
fragment files, including when no routes changed. Public HTML copies pass
through the same ownership-aware link adapter as served Browse; direct preview
URLs apply one validated `fragment` query progressively in the parent shell.
