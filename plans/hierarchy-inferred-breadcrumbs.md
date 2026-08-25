# Hierarchy-Inferred Breadcrumbs

**Goal:** Make collection membership the single source of truth for structured
catalogue navigation and breadcrumbs, so Mokabook authors never provide a
separate `navPath` that can drift from the hierarchy.

**Architecture:** Build one validated collection forest from `childIds`. Every
structured entry has zero or one collection parent, roots have no parent, and
the breadcrumb for a screen or use case is the ordered title trail of its
ancestor collections. The same hierarchy model feeds manifest generation,
Browse navigation, and screen heads. Manifest schema v3 retains `navPath` as a
derived compatibility field for existing readers, but authoring inputs no
longer expose it and Browse does not trust it as hierarchy input.

**Tech stack:** TypeScript ESM, React 19 server rendering, Node 22 tests via
`tsx --test`, Playwright browser coverage, generated example fixtures, and the
Rust `xtask` verification/review gate.

## Contract Decisions

- Collection `childIds` define the structured catalogue forest. Route folders,
  source-file folders, and ids do not imply hierarchy.
- A collection may contain collections, screens, and use cases. A child may
  have at most one parent; duplicate child references, multiple parents,
  self-reference, and longer collection cycles are invalid.
- Entries not claimed by a collection are catalogue roots. If authors want a
  visible root group or root breadcrumb, they define a real root collection.
- Breadcrumb labels come from ancestor collection `title` values, ordered from
  root to immediate parent. The active entry title stays in the heading and is
  not repeated as a crumb.
- Structured collection crumbs remain plain text because collections do not
  own routes. Legacy-page crumbs keep their existing route-directory inference
  and link to a directory's real Overview page when one exists.
- `navPath` is removed from `EntryInput`, routed entry inputs, and `RootInput`.
  Schema-v3 manifests continue to emit `navPath`, but Mokabook derives it and
  ignores historical values when building the served hierarchy.
- `defineRoot` without root collection metadata places its children at the
  catalogue root. Root collection `title` moves into
  `RootCollectionInput`, so a requested root group is represented by an actual
  collection rather than an otherwise invisible label.
- Existing v2/v3 base manifests remain readable for cross-version Review.
  Their collection relationships drive the normalized hierarchy; their stored
  `navPath` values are compatibility data only.
- This feature intentionally changes no breadcrumb markup, shell layout, CSS,
  or visual design. No mockup milestone is needed. If implementation discovers
  a visual delta, add and complete a `Tags: mockup` milestone before resuming
  the UI milestone.

## Milestones

---

### Milestone 1: Specify the hierarchy contract

Summary: make the protocol complete before implementation by defining how
parents, roots, ancestor titles, invalid graphs, and legacy manifests behave.

- [ ] Update `docs/protocol/mokabook-package.md` to remove author-supplied
      `navPath` from the public API, define `RootInput`/root collection
      semantics, specify the collection-forest invariants, and document the
      schema-v3 `navPath` field as derived compatibility output.
- [ ] Update `docs/protocol/mokabook-runtime.md` so registry validation includes
      duplicate children, multiple parents, and cycles, and so Browse
      navigation and breadcrumbs explicitly consume the same validated
      hierarchy model.
- [ ] Record the migration rule: replace every synthetic `navPath` group that
      should remain visible with a real parent collection; leave genuinely
      top-level entries unclaimed.
- [ ] Check the protocol docs for contradictions with manifest compatibility,
      changed-route attribution, collection routing, and legacy Overview links.
- [ ] Run Prettier over the changed Markdown, validate relative links, and
      inspect `git diff --check` plus the documentation diff.

At completion, the target behavior and migration boundary are unambiguous while
the released implementation remains unchanged and functional.

---

### Milestone 2: Add one validated hierarchy model

Summary: implement and test a reusable hierarchy analysis boundary, remove
`navPath` from consumer authoring, and derive compatibility metadata without
changing the shell rendering yet.

- [ ] Add failure-first tests in a focused registry hierarchy test module for:
      roots and ordered ancestor collection titles; nested collections; a root
      screen/use case; duplicate child ids; one child claimed by two parents;
      direct self-reference; a multi-collection cycle; unknown children; and
      deterministic, source-attributed diagnostics.
- [ ] Add `src/registry/hierarchy.ts` with a typed hierarchy result containing
      root entries, parent lookup, and ordered ancestors. Keep traversal
      iterative or cycle-guarded so malformed consumer or manifest data cannot
      recurse forever.
- [ ] Reuse the hierarchy analyzer from both source-registry and manifest
      relationship validation rather than maintaining parallel graph rules.
      Map structural problems to specific author-facing violation codes and to
      typed `manifest-invalid` failures at the persisted-data boundary.
- [ ] Update `src/authoring/types.ts` and `src/authoring/definitions.ts`: remove
      `navPath`, move the root title into `RootCollectionInput`, stop threading
      label arrays during nested flattening, and preserve real `childIds`
      relationships and route construction.
- [ ] Update `src/registry/manifest.ts` to derive every schema-v3 `navPath` from
      the hierarchy result. Keep the serialized field and schema number stable
      so older package consumers and branch-point manifests remain compatible.
- [ ] Extend manifest parsing/regression coverage to prove malformed hierarchy
      graphs fail safely while historical v2/v3 `navPath` values neither
      override collection ancestry nor prevent cross-version Review.
- [ ] Build a cached structured hierarchy in `src/server/catalogue.ts` for the
      shell to consume in the next milestone; keep legacy pages outside this
      model because their hierarchy remains route-derived.
- [ ] Refactor the non-visual model in `src/server/shell/nav_tree.ts` to produce
      structured roots, children, and ancestor crumbs by stable entry id rather
      than label-keyed `navPath` groups. Retain alphabetical presentation and
      legacy directory folding, and keep the existing shell functional until
      it switches to this model in the next milestone.
- [ ] Update direct type fixtures and helper factories affected by the public
      API change, extracting shared hierarchy fixture builders where that
      removes repeated collection graphs.
- [ ] Run `npm run build` and the authoring, registry, manifest, compatibility,
      changed-route, and Review regression tests. Keep all focused tests at a
      100% pass rate.

At completion, valid catalogues have one canonical hierarchy, generated
manifests contain deterministic ancestor paths, invalid graphs fail before
rendering, and existing shell behavior still compiles against the derived data.

---

### Milestone 3: Drive Browse navigation and crumbs from hierarchy

Tags: ui

Summary: switch the existing shell markup to the canonical hierarchy without a
visual redesign.

- [ ] Add failure-first shell tests proving nested collection ancestry produces
      matching navigation and breadcrumb trails without authored `navPath`, a
      reparented entry changes both surfaces together, root entries gain no
      invented ancestor, and duplicate collection titles remain distinct by id.
- [ ] Add/adjust browser coverage in `tests/browser/browse.spec.ts` to assert the
      visible and accessible crumb trail for a deeply nested screen and use
      case, including progressive navigation and Back/Forward transitions.
- [ ] Update `src/server/shell/nav.tsx`, `src/server/shell/head.tsx`, and the
      document wiring to consume the cached catalogue hierarchy. Structured
      crumbs use ancestor collections; only legacy crumbs use Overview route
      resolution.
- [ ] Preserve the existing `Crumbs` semantics, accessible label, separator,
      id chip, navigation disclosure behavior, active row, and
      `data-nav-collection` hooks; do not change CSS or rendered product copy.
- [ ] Run `npm run build` and the focused shell/browser tests, then smoke-test a
      deep screen, a use case, a top-level entry, and a legacy Overview child at
      desktop and mobile widths.

At completion, the hierarchy shown in navigation is exactly the hierarchy
shown in breadcrumbs, with no second author-controlled path.

---

### Milestone 4: Migrate the example and public guidance

Summary: remove all consumer-facing `navPath` usage while preserving the
example's intentional visible groups through real collection relationships.

- [ ] Migrate `examples/basic/entries/**` and every consumer fixture under
      `tests/fixtures/**`: remove `navPath`, add real `Example`/`Design` parent
      collections where those visible groups must remain, and avoid changing
      stable screen ids or routes.
- [ ] Remove inline `navPath` metadata from generated test module strings and
      direct manifest builders. Use explicit collections in tests that care
      about ancestry and empty root ancestry in tests that do not.
- [ ] Update the root `README.md` authoring example and configuration guidance
      to show hierarchy-driven breadcrumbs, and update
      `examples/basic/README.md` with the example's collection ownership and
      migration behavior.
- [ ] Search the repository for remaining consumer-authored `navPath` uses;
      allow only the generated-manifest compatibility type, serializer,
      validator/compatibility tests, and protocol text that documents it.
- [ ] Run `npm run example:build` and commit the regenerated schema-v3 manifest
      and HTML. Do not hand-edit generated output.
- [ ] Run `npm run example:check`, `npm run package:check`,
      `npm run package:smoke`, and the full Node test suite with a 100% pass
      rate.
- [ ] Start `mokabook serve --no-watch --port 0` against `examples/basic`, open
      representative deep screen/use-case/legacy routes, verify breadcrumb and
      navigation alignment, then shut the server down cleanly.

At completion, package docs, examples, fixtures, and generated output all use
the hierarchy-only authoring contract and demonstrate the intended migration.

---

### Milestone 5: Full verification, commit, push, and review

Summary: run the complete repository gate, preserve mainline work, and hand the
post-push diff to the required AI reviewer.

- [ ] Run `npm run format`; then ensure `npm run format:check`,
      `npm run lint`, `npm run typecheck`, `npm test`,
      `npm run example:check`, and `npm run test:browser` all pass.
- [ ] Run `cargo xtask check` and keep working until every check passes. If the
      command cannot run for an external reason, record the blocker and every
      focused check already completed.
- [ ] Fetch `origin/main`, audit additions from the captured source tip, and
      inspect `git diff --name-status origin/main`, deletion-only changes, the
      complete diff, and generated artifacts. Do not remove or override
      mainline features.
- [ ] Run `git add -A`; confirm every new source, test, doc, and generated file
      is tracked; commit with a Conventional Commit title no longer than 50
      characters (for example, `feat: infer breadcrumbs from hierarchy`); and
      push the current branch without renaming it.
- [ ] After the push, run `cargo xtask review` against the local diff from
      `origin/main`. Do not automatically fix findings.
- [ ] Report every review finding as a numbered item with severity, relevant
      codebase/feature context, impact of doing nothing, lettered solution
      options, and a recommended option. For each recommendation, consider
      whether a broader validation rule, test, lint, or abstraction would
      prevent the same class of issue more effectively than a local patch.

At completion, the implementation is fully tested, committed, pushed, and
independently reviewed, with any follow-up decision left to the user.
