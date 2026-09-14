# Review

Review compares checked catalogue output with its Git branch point and retains
isolated before/after snapshots. Component ownership, paired ignored regions,
and validated resource graphs provide the evidence used by Changes.

## CSS rule attribution

`css/` provides standalone parsing, diffing, and document matching for
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
name, prelude, and complete body for conservative treatment by the matcher.

Lightning CSS's normal optimizer merges declarations and separates important
declarations from ordinary declarations. `source.ts` recovers the original runs;
`serialization.ts` removes trivia while preserving declaration order and strings.
Native header serialization omits nullable optional AST fields when returning them
to Lightning CSS, whose visitor decoder expects those fields to be absent.
The parser requires Lightning CSS's optional native package for the host platform;
the installed Node package has no automatic WASM fallback.

For one stylesheet and view, call the shared reduction entry point:

```ts
import { parse } from "parse5";

import { analyzeStylesheetChange } from "./css/analyze.js";

const outcome = analyzeStylesheetChange(
  ".button { color: red; }",
  ".button { color: blue; }",
  { after: parse('<!doctype html><button class="button">Save</button>') },
);
// { kind: "kept", status: "matched", selectors: [".button"] }
```

Pass the already-normalized before/after parse5 documents; either side may be
absent for added/removed views. An absent stylesheet is passed as an empty string.
`matchCssRules(diff, documents)` retains a decision for each diffed rule;
`analyzeStylesheetChange` composes the parser, diff, and match, returning one
`CssAnalysisOutcome`. The optional fourth argument injects a `CssRuleParser`.
Selectors are the kept rules' original serialized selectors, sorted and unique;
an unresolved rule takes precedence over matched rules in the reduction.

The closed keep-list, in contract order, is: unparseable selectors; shadow
selectors; universal/root/html/body selectors; unresolvable nesting; changed
custom properties; selector-less at-rules; changed imports/URLs; stylesheet
parse failures. These yield `unresolved`. Ordinary rules are `matched` when
either document matches and `excluded` otherwise. An unchanged custom property
or URL within an edited rule does not itself trigger unresolved evidence.

Nested parents are combined through `:is()` for matching. Interactive states and
pseudo-elements use the base compound, with negation handled conservatively;
media/container/supports/layer conditions stay unevaluated. The parse5 adapter
preserves inert template boundaries, document quirks, and foreign-element name
case. `css-what`, also used by `css-select`, is a direct dependency so selector
rewrites use its typed syntax tree rather than string or regular-expression
substitution of pseudo-selectors. No direct domhandler/domutils dependency is
needed and HTML reference discovery is unchanged.

## Development

```bash
node --import tsx --test tests/review_css_*.test.ts
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
- `css/analyze.ts`, `css/match.ts`, `css/match_types.ts`: view reduction, the
  ordered keep policy, per-rule decisions, and contained selector errors.
- `css/document.ts`, `css/document_query.ts`: default parse5 adapter and queries
  that retain HTML/SVG/MathML name semantics.
- `css/nesting.ts`, `css/pseudos.ts`: parent substitution and static match bounds.
- `css/material.ts`: changed custom-property and URL-reference detection.

See the [Changes contract](../../docs/protocol/mokly-changes.md),
[component attribution contract](../../docs/protocol/mokly-component-changes.md),
and [component result schema](../../docs/protocol/mokly-component-review.md).
