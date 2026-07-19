# Mokabook

Mokabook is the planned app-independent browser, static generator, validation
tool, and visual-review harness for Firna mockup catalogues. It will be
published as the public npm package `mokabook` and shared by repositories
such as Accounting and Juno without owning either product's screens, styles, or
brand configuration.

The repository currently contains the target contracts and implementation plan;
the npm package has not been implemented or released yet.

## Planned Interface

From a repository with a `mokabook.config.ts` file:

```bash
npx mokabook
npx mokabook build
npx mokabook check
npx mokabook review --base origin/main
```

Installing `mokabook` as a development dependency also exposes the local
`mokabook` binary for npm scripts and `npx mokabook`. The package will default to
the watched Browse server when no subcommand is supplied.

## Scope

- Structured screen, collection, and use-case definitions.
- Deterministic static screen fragments and a committed catalogue manifest.
- A watched Browse server with durable links and progressive navigation.
- Git-based Review artifacts for changed mockups.
- Configurable rendering, styles, paths, watch inputs, and review impact rules.
- Synthetic example screens and packed-package consumer tests.

Accounting and Juno screens, product components, theme tokens, generated
product HTML, and app-specific route compatibility remain in their owning
repositories.

## Developer Get Started

Implementation has not started. Begin with the protocol and active plan:

- [Protocol index](./docs/protocol/README.md)
- [Implementation plans](./plans/README.md)

The completed package will use `cargo xtask check` as the single full
verification command and `cargo xtask review` for the required post-push review.
