# Basic Mokabook Consumer

This is a synthetic external-consumer fixture. It contains two distinct mobile
and desktop product-style screens built with `@firna/ui` controls, nested
collections, one use case, id-addressed links, a Firna renderer adapter, local
stylesheets, and a safe Review-ignore region. It contains no Accounting or
Juno product screen.

## Firna renderer adapter

`renderer.tsx` is the reference consumer adapter for react-native-web
component libraries: it wraps every screen in `SharedUiThemeProvider` (themed
by `theme.ts`), renders one React tree with `react-dom/server`, collects
react-native-web's atomic styles through `AppRegistry`, and injects them into
the document head. `mokabook.config.ts` pairs it with the `moduleResolution`
settings such a stack needs — the `react-native` → `react-native-web` alias,
`react-native`-first conditions and main fields, `.web.*`-first resolve
extensions, and the `.js` → `jsx` loader. Consumers that render plain
React DOM need none of this and can keep a plain `renderToStaticMarkup`
adapter.

The `Design` navigation group is the approved design catalogue for Mokabook's
own Browse and Review shell: thirteen screens covering the Browse home,
selected screen and use case, details panel, missing route, narrow navigation,
and the changed, added, removed, difference, shared-impact, ignored-only, and
empty Review states, each with distinct mobile and desktop variants. The
recorded tokens and responsive rules live in
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
server into `.context/mokabook-preview` for Cloudflare Pages, including the
complete static Review comparison against `origin/main`; it is the same artifact
used by the main and pull-request preview workflow.
