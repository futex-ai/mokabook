# Package And Consumer Boundary

## Rule

Mokabook owns the mechanics shared by any React mockup catalogue. A consumer
owns everything that gives a screen application meaning or appearance. The
boundary is enforced through peer dependencies, a renderer hook, declarative
paths, and synthetic tests.

| Mokabook owns                           | Consumer owns                    | Configured at the boundary |
| --------------------------------------- | -------------------------------- | -------------------------- |
| Registry definitions and validation     | Product screens and fixture data | Source and output roots    |
| esbuild discovery and one-graph loading | Product component library        | Renderer module            |
| Static fragments and manifest schema    | Theme/tokens/providers           | Stylesheet rules           |
| Generated-file ownership and check      | Product CSS/fonts/images         | Legacy aliases and lints   |
| Safe Browse routes and watch lifecycle  | Application navigation semantics | Additional watch inputs    |
| Git comparison and Review-ignore rules  | Product Review policy            | Base, output, impact globs |

## Dependency Direction

`mokabook` has React and React DOM peer dependencies. It does not depend on
React Native, React Native Web, `@firna/ui`, Accounting, Juno, or a consumer's
workspace layout. At build time, React imports are resolved from the consumer's
config file and every React-bearing source is bundled in one graph.

The renderer is synchronous and returns a complete HTML document. This is the
only place an app should install theme providers, collect React Native Web's
`AppRegistry` styles, inject product fonts, or establish other render context.
Those actions depend on app-owned packages and policy, so moving them into the
library would make Mokabook app-specific and risk two React runtimes.

## Legacy Boundary

Legacy `.source.ts`, `.source.tsx`, and `.source.html` discovery is generic.
Comment components use an explicitly configured module exporting
`renderComponent(name, attributes)`. Route aliases, maximum-screen exemptions,
stage-id policy, and component names have no defaults. Accounting keeps its
existing component registry and supplies it as an adapter during migration.

## Runtime Boundary

Browse serves only the configured mockups root and rejects authored entry and
legacy source trees, traversal, and symlink escapes. Watch targets come only
from resolved config; package files in `node_modules` or an npx cache are never
consumer inputs. Review reads the base tree through Git object access and never
checks it out over the worktree.

## Related Docs

- [Build pipeline](./build-pipeline.md)
- [Package and authoring protocol](../protocol/mokabook-package.md)
- [Runtime protocol](../protocol/mokabook-runtime.md)
