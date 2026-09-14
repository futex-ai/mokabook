# CSS Change Attribution

## Delivery Status

Approved target, not yet implemented. Tracked by
[CSS Change Attribution](../../plans/css-change-attribution.md). Until that
plan's classification milestone lands, a changed linked stylesheet remains
file-level dependency evidence as described in
[Changes and screen comparisons](./mokly-changes.md).

## Purpose

A linked stylesheet edit is conservative evidence that a screen may render
differently. Without further analysis, every screen that loads the stylesheet
is kept in Changes, even when the edit adds rules that no element on that
screen can match. This contract narrows that evidence to the views whose
documents a changed rule could apply to, while never claiming a screen is
unchanged when a rule could apply.

The analysis is a sound exclusion, not a visual proof. It can prove that no
changed rule matches a document. It cannot prove that a matching rule has a
visible effect, and it does not try to. Browser-verified refinement is a
separate future contract.

## Inputs

The analysis runs only for a CSS resource that is already in `changedPaths`
and already reachable from a view's document through the existing resource
graph: linked stylesheets, transitive `@import` chains, and stylesheets
referenced by embedded documents. It examines the resource's branch-point
bytes and working-tree bytes, and the view's branch-point and working-tree
documents after the same paired ignore normalization the comparison engine
uses. It never widens the set of examined files; unreferenced public files and
broad `review.sharedImpact` globs continue to add nothing on their own.

Resources that are not stylesheets, including fonts, images, and embedded
documents, keep their existing file-level attribution unchanged.

## Stages

1. **Rule diff.** Parse both sides of the stylesheet into an ordered list of
   rules. Each rule carries its selector list, its declarations, and its
   enclosing conditions: `@media`, `@container`, `@supports`, `@layer`, and
   nesting parents. Diff the two lists into changed, added, and removed rules.
   Whitespace, comments, and formatting differences produce no rules. A rule
   that moves without changing its selectors, declarations, or conditions
   produces no rule.
2. **Matchability.** Test each diffed rule's selectors against the view's
   branch-point document and working-tree document. A match on either side
   keeps the rule. Enclosing conditions are not evaluated: a rule inside
   `@media` or `@container` is tested exactly like a rule outside it.
   Evaluating conditions needs a viewport and element sizes, which belongs to
   browser refinement.
3. **Reduce.** If at least one rule is kept, the resource remains a dependency
   reason for that view and the reason records the kept selectors. If no rule
   is kept, the resource is recorded on the view as examined and excluded, and
   it does not contribute to Changes membership for that view.

## Kept Constructs

Every case the analysis cannot resolve keeps the rule and marks the reason
`unresolved`. The list is closed; an implementation must not add silent
exclusions beyond it.

- A selector the matcher cannot parse.
- Shadow-scoped selectors: `:host`, `:host()`, `:host-context()`, `::part()`,
  and `::slotted()`.
- Universal, `:root`, `html`, and `body` selectors.
- A rule inside a nesting parent whose combined selector cannot be resolved.
- Any changed custom property declaration (`--*`), because inheritance can
  reach any descendant.
- Selector-less at-rules: `@font-face`, `@keyframes`, `@property`,
  `@counter-style`, `@page`, and any other at-rule without a selector list.
- A changed `@import` or `url()` reference. The resource graph already
  attributes the referenced file; the analysis must not weaken that path.
- A parse failure on either side of the stylesheet.

## Membership Rule

A CSS dependency reason keeps a view in Changes only when its analysis status
is `matched` or `unresolved`. A view whose only CSS dependency evidence is
excluded resources is not in Changes for that evidence. Every other Changes
signal is unchanged: added or removed views, material document changes,
metadata, caller inputs, structure, non-CSS resources, component ownership, and
use-case screen reasons. Both viewports and every color scheme are analysed
separately against their own documents.

A formatting-only stylesheet edit therefore leaves every consumer out of
Changes. That is intended: the resource is still listed in the comparison
details as examined and excluded, and the comparison snapshots still contain
the real bytes.

## Evidence Schema

A dependency reason gains an optional `analysis` record. Absent `analysis`
means the analysis did not run for that path, which is the case for non-CSS
resources and for historical results.

```ts
interface DependencyAnalysis {
  status: "matched" | "unresolved";
  selectors: readonly string[];
}

type DependencyReason = {
  kind: "dependency";
  path: string;
  analysis?: DependencyAnalysis;
};
```

`selectors` lists the kept rule selectors in their serialized form, sorted
lexically by UTF-16 code units and duplicate-free. For `unresolved` reasons it
lists the selectors that could be serialized and may be empty when the kept
construct has no selector.

Examined-and-excluded resources are recorded on the view, not as reasons:

```ts
interface ExcludedResource {
  path: string;
  reason: "no-matching-rule";
}

interface ViewReview {
  // existing fields unchanged
  excludedResources?: readonly ExcludedResource[];
}
```

Both the schema-v2 `ReviewResult` and the schema-v3 `ReviewResultV3` carry
these fields. Schema versions do not change. Results without them remain valid
and mean the analysis did not run.

## Validation

- An `excludedResources` path must be in `changedPaths` and must be a
  stylesheet reachable from that view's document on at least one side.
- A path may not appear both as a dependency reason and as an excluded
  resource on the same view.
- `analysis.selectors` must be sorted and duplicate-free.
- `analysis` may appear only on stylesheet paths.
- Optional fields are omitted when empty, matching the existing canonical
  output rules.
- Browse's lightweight classification, complete comparison generation,
  publishing, and the selected live endpoint use one analysis implementation
  and produce identical membership and evidence.

## Shell Presentation

The inspector shows kept selectors under a dependency reason and lists
excluded resources in a secondary details section. Headline copy is product
language, for example "This stylesheet changed, but none of the changed styles
apply to this screen"; selector text appears only in the details list. Excluded
resources never produce Changes rows.

The approved design is the stylesheet-evidence group of the design catalogue,
recorded in the
[shell design inventory](./mokly-shell-design.md#design-mockups) as
`design-review-style-matched`, `design-review-style-unresolved`, and
`design-review-style-excluded`. It fixes three presentation rules:

- A `matched` or `unresolved` reason reads as one outcome in the preview
  heading, "Styles this screen uses changed". The two statuses differ only in
  the secondary details: `matched` lists the changed styles that apply to the
  screen, while `unresolved` says the change can apply anywhere on the screen
  before listing what it could serialize.
- An excluded resource leads with the outcome, "This stylesheet changed, but
  none of the changed styles apply to this screen", and lists the stylesheet
  under an "Examined and excluded" heading. The screen's own status stays "No
  changes to this screen".
- Selector text, status names, and analysis vocabulary never appear in a
  heading or in the catalogue tree; they appear only inside the secondary
  details list, and only where the detail has review value.

## Non-goals

- Evaluating media, container, or supports conditions.
- Specificity, cascade order, or override detection.
- Inheritance beyond the custom-property keep rule.
- Pixel or screenshot comparison.
- Inferring ownership from CSS Modules, CSS-in-JS, or bundled output.
