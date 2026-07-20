# Package And Consumer Boundary

## Rule

Mokabook owns the mechanics shared by any React mockup catalogue. A consumer
owns everything that gives a screen application meaning or appearance. The
boundary is enforced through peer dependencies, a renderer hook, declarative
paths, and synthetic tests.

| Mokabook owns                           | Consumer owns                    | Configured at the boundary |
| --------------------------------------- | -------------------------------- | -------------------------- |
| Registry definitions and validation     | Product screens and fixture data | Source and output roots    |
| esbuild discovery and one-graph loading | Product component library        | Renderer/module resolution |
| Static fragments and manifest schema    | Theme/tokens/providers           | Stylesheet rules           |
| Generated-file ownership and check      | Product CSS/fonts/images         | Legacy policy/bridge       |
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

Module-resolution configuration is likewise consumer-owned: aliases,
conditions, package fields, extensions, loaders, and package roots describe the
consumer component tree. Mokabook validates and applies them without supplying
React Native Web, Accounting, or Juno defaults.

## Legacy Boundary

Legacy `.source.ts`, `.source.tsx`, and `.source.html` discovery is generic.
Comment components use an explicitly configured module exporting
`renderComponent(name, attributes)`. Route aliases, maximum-screen exemptions,
stage-id policy, and component names have no defaults. Accounting keeps its
existing component registry and supplies it as an adapter during migration.
Source-relative exclusions and the complete-document compatibility transformer
are temporary cutover tools. They remain explicit, deterministic consumer code,
and their result receives the same package validation as newly authored output.

## Runtime Boundary

Browse serves only the configured mockups root and rejects authored entry and
legacy source trees, traversal, and symlink escapes. Watch targets come only
from resolved config; package-owned dependency/build/test/output trees are
pruned before broad consumer rules, while explicit source modules and
stylesheets retain their required action. Output HTML is pruned only when its
generated header proves package ownership; consumer-authored public HTML may
use explicit watch rules. A child closes on either an orderly message/signal or
loss of its parent IPC channel, and supervisor shutdown waits for confirmed
exit while escalating from IPC to SIGTERM and SIGKILL. Review reads the base
tree through Git object access, matches directory dependencies recursively,
rejects non-portable base resource URLs, and never checks the base out over the
worktree.

## Related Docs

- [Build pipeline](./build-pipeline.md)
- [Package and authoring protocol](../protocol/mokabook-package.md)
- [Runtime protocol](../protocol/mokabook-runtime.md)
