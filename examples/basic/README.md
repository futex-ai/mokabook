# Basic Mokabook Consumer

This is a synthetic external-consumer fixture. It contains two distinct mobile
and desktop screens, one collection, one use case, id-addressed links, a custom
React context renderer, a local stylesheet, and a safe Review-ignore region.
It contains no Accounting or Juno product screen.

From the repository root:

```bash
npm run example:build
npm run example:check
node dist/cli/bin.js serve --config examples/basic/mokabook.config.ts --port 0 --no-watch
```

Generated HTML and the schema-v3 manifest are committed under `generated/` so
the fixture also exercises stale and deterministic-output checks.
