# Review

Review compares checked catalogue output with its Git branch point and retains
isolated before/after snapshots. Component ownership, paired ignored regions,
and validated resource graphs provide the evidence used by Changes.

## CSS rule attribution

`css/` provides parsing, diffing, and document matching for
[CSS change attribution](../../docs/protocol/mokly-css-attribution.md).
Both result versions, live membership, watched updates and publishing use it to
exclude changed stylesheets whose changed rules cannot match a view. Public
resource globs cannot bypass the graph or restore excluded stylesheets. These
review interfaces are internal; the package authoring API is unchanged.

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
Comments between identifiers and opening parentheses retain token separation,
so an invalid function spelling cannot cancel a valid function in a rule diff.

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

`ResourceComparison.compare(before?, after?, excluded?, matching?)` reads and
validates resource closures before passing changed resources to
`CssResourceAnalysis.analyze(resources, documents)`. Component ownership controls
reachability independently of matching against actual normalized markup. Embedded
documents also supply matching trees. Base resource reads are batched by graph
depth; optional counterpart CSS reads distinguish missing files from invalid
ones. Per-side readers cache bytes, and the injected parser caches identical CSS
text for the run. Live resource validation additionally retains its alias and
verified-deletion behavior.

Both result versions retain optional view `reasons` (with stylesheet `analysis`)
and `excludedResources`. Entry reasons merge by path and union selectors, with
unresolved evidence taking precedence. The shared browser/server decoder rejects
invalid or contradictory evidence; canonical artifact serialization preserves it.
Owned CSS retained at an actual invocation also keeps its component in Changes
when saved variants exclude it. Exact screen declarations remain independent
only for retained CSS; non-CSS declarations keep their existing file-level policy.
Inspector presentation is tracked separately from this classification work.

## Development

```bash
node --import tsx --test tests/review_css_*.test.ts
npm run typecheck
cargo xtask check
```

Key code:

- `compare.ts`, `screen_compare.ts`: screen comparisons and retained artifacts.
- `component_classification.ts`, `component_view.ts`: component ownership policy.
- `component_resource_attribution.ts`: actual-invocation CSS ownership and entry
  evidence aggregation without inventing saved variants.
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
- `resource_comparison.ts`, `css/resource_analysis.ts`: shared resource evidence
  and the classification-scoped parser cache.
- `result_resources.ts`: browser-safe validation of retained/excluded evidence.
- `resource_documents.ts`: one paired normalization for embedded-document
  discovery and matching; normalized ignore tokens are never parsed a second time.
- `artifact_resources.ts`: validation of evidence against retained snapshot resources.

See the [Changes contract](../../docs/protocol/mokly-changes.md),
[component attribution contract](../../docs/protocol/mokly-component-changes.md),
and [component result schema](../../docs/protocol/mokly-component-review.md).
