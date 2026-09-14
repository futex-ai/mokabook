# Review

Review compares checked catalogue output with its Git branch point and retains
isolated before/after snapshots. Component ownership, paired ignored regions,
and validated resource graphs provide the evidence used by Changes.

## CSS rule parsing and diffing

`css/` provides the standalone first stage of
[CSS change attribution](../../docs/protocol/mokly-css-attribution.md).
Classification continues to use its existing dependency policy until the later
integration milestone. This module does not change Review JSON, Changes membership,
or generated example output, and is not exported through the package authoring API.

```ts
import { diffCssRules } from "./css/diff.js";
import { LightningCssRuleParser } from "./css/rules.js";

const result = diffCssRules(
  ".button { color: red; }",
  ".button { color: blue; }",
  new LightningCssRuleParser(),
);
if (result.status === "resolved") {
  // result.changed retains the before and after rules, ordered by after ordinal.
  console.log(result.changed);
} else {
  console.log(result.failures);
}
```

Depend on `CssRuleParser.parse(stylesheet: string): CssRuleParseResult` for
injection. Tests can return typed fixtures without invoking a native parser.
Parsing and diffing return typed unresolved results instead of throwing failures.
Duplicate rules are counted, exact matches are cancelled before edited rules are
paired, and moving an identical rule produces no change. Conditions stay in their
outermost-first order and are never evaluated. Selector-less at-rules retain their
name, prelude, and complete body for conservative treatment by the later matcher.

Lightning CSS's normal optimizer merges declarations and separates important
declarations from ordinary declarations. `source.ts` recovers the original runs;
`serialization.ts` removes trivia while preserving declaration order and strings.
Native header serialization omits nullable optional AST fields when returning them
to Lightning CSS, whose visitor decoder expects those fields to be absent.
The parser requires Lightning CSS's optional native package for the host platform;
the installed Node package has no automatic WASM fallback.

## Development

```bash
node --import tsx --test tests/review_css_rules.test.ts tests/review_css_diff.test.ts
npm run typecheck
cargo xtask check
```

Key code:

- `compare.ts`, `screen_compare.ts`: screen comparisons and retained artifacts.
- `component_classification.ts`, `component_view.ts`: component ownership policy.
- `assets.ts`, `component_resources.ts`, `resource_graph.ts`: confined reads and
  traversal shared by resource evidence and snapshots.
- `css/types.ts`: rule records, the parser interface, and result/error contracts.
- `css/rules.ts`: native parsing and ordered context-aware rule collection.
- `css/source.ts`, `css/serialization.ts`: source boundaries and normalization.
- `css/diff.ts`: deterministic multiset diffing with an injected parser.

See the [Changes contract](../../docs/protocol/mokly-changes.md),
[component attribution contract](../../docs/protocol/mokly-component-changes.md),
and [component result schema](../../docs/protocol/mokly-component-review.md).
