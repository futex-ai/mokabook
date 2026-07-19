# Basic Mokabook Consumer

This is a synthetic external-consumer fixture. It contains two distinct mobile
and desktop product-style screens, nested collections, one use case,
id-addressed links, a custom React context renderer, local stylesheets, and a
safe Review-ignore region. It contains no Accounting or Juno product screen.

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
```

Generated HTML and the schema-v3 manifest are committed under `generated/` so
the fixture also exercises stale and deterministic-output checks. The
hand-authored stylesheets (`styles.css`, `design.css`, `design-stage.css`,
`design-review.css`) also live under `generated/` because it doubles as the
public static root.
