# Mokabook Catalogue Navigation Contract

## Delivery Status

This is the approved target contract. Implementation is tracked by the active
[in-frame catalogue link navigation plan](../../plans/in-frame-catalogue-link-navigation.md).
Until that plan completes, served links still navigate only their fragment
iframe and the progressive client does not reveal a newly active row's ancestor
collections.

## Scope

This document defines how links authored inside generated mockup documents
behave in portable output, served Browse, and the deployed Browse preview. It
also defines how the Browse shell keeps its route identity and catalogue tree
aligned after every navigation.

Mokabook owns navigation between catalogue entries. Consumers continue to own
their product's application routes and the behavior of ordinary document,
asset, external, download, and same-document links.

## Logical Catalogue Links

`MockLink`, `mockLink`, and complete `mock:<id>[#fragment]` values in supported
`href` or `data-nav-href` attributes express catalogue references. Only an
`<a>` or `<area>` whose own `href` carried the logical value is an activatable
catalogue link in Browse. `data-nav-href` on any element, and `href` on any
other element, remains validated portable metadata; Mokabook does not invent
click or keyboard semantics for it. A logical `data-nav-href` may coexist with
an activatable logical `href`, in which case both must name the same
destination. The id is stable authoring identity; the entry's `route` is its
current Browse location. A collection remains an invalid destination. A
use-case destination opens the use-case page, even though its portable fragment
fallback resolves through the first screen in that use case.

A logical fragment begins with an ASCII letter and then contains only ASCII
letters, digits, `_`, `:`, `.`, or `-`. It names an HTML `id`, not a CSS
selector. The builder validates that it exists in every generated mobile,
desktop, light, and applicable dark artifact that Browse may show for the
destination screen. For a use case, this requirement applies to its first
screen. This cross-view rule lets one canonical outer route drive every visible
frame without silently losing the anchor in another viewport or color scheme.

The builder must:

- validate the destination id and optional fragment before writing output;
- rewrite the actual `href` and `data-nav-href` to the relative generated
  artifact for the source viewport and color scheme, retaining light fallback;
- add one package-owned `data-mokabook-link` marker containing the original
  `<id>[#fragment]` destination only to an activatable native link; and
- reject a reserved marker supplied by consumer output or conflicting logical
  destinations carried by two navigation attributes on one element.

Before invoking a compatibility transformer, the builder records a multiset of
complete logical-reference records: expected marker presence and value, the
native-link class (`a`, `area`, or metadata-only), which of `href` and
`data-nav-href` carried the logical destination, and each such attribute's
resolved portable value. It reparses the transformed document and requires the
same multiset. Adding or removing a marker, preserving a marker while changing
its portable destination or element kind, changing a metadata-only reference
into an activatable link, or moving logical identity between navigation
attributes fails the build. Unrelated attributes remain consumer-owned.

The marker is inert metadata, not a second resource URL. HTML escaping must be
deterministic, and link/resource validation continues to inspect the portable
attributes rather than treating the marker as a file reference.

Raw relative links do not become catalogue links merely because they happen to
resolve to a generated fragment. This keeps catalogue intent explicit and
prevents Mokabook from taking over product or asset navigation accidentally.

## Portable And Review Output

Committed generated documents keep their relative artifact `href` values.
They must remain navigable when opened directly or copied without the Browse
shell. Review snapshot trees copy the same portable documents and do not
promote their marked links into Browse routes; link activation inside a Review
pane retains the existing sandbox behavior.

## Browse Presentation

When an eligible marked `<a>` or `<area>` is presented beneath `/static/` in
served Browse or in the deployed Browse preview, Mokabook adapts its `href` to
the stable `/id/<id>` route. Without a fragment, that is the complete
destination. With a fragment, the destination is
`/id/<encoded-id>?fragment=<encoded-fragment>`. An absent, empty, or `_self`
target receives the package-owned `_top` target for native fallback. Any other
valid requested target is copied into adapter-produced inert
`data-mokabook-target` metadata while its live target becomes `_blank`; the
popup-denying sandbox means only trusted parent enhancement can honor that
request. Target keywords are matched ASCII-case-insensitively, and a named
target must satisfy the HTML navigable-target-name grammar. An invalid target
also receives the inert live `_blank` value but no trusted metadata, so parent
enhancement declines it. The adapter removes any consumer-authored copy of its
target metadata before deriving this value. A `download` link is not promoted,
and `data-nav-href` without an eligible logical `href` stays portable metadata
rather than becoming a Browse interaction.

The portable file on disk must not be mutated. The development server and
preview builder share one deterministic Browse-document adapter for canonical
link rewriting and top-navigation sanitization. The server validates marker
values against the loaded manifest and neither environment promotes an unmarked
relative link.

Before Browse frames receive user-activated top-navigation permission, that
adapter removes `target` from every `<base>` element and neutralizes every
consumer-authored non-self target. On unmarked, metadata-only, and download
elements it maps `_top`/`_parent` to `_self` and every other non-self value to
`_blank`, which the popup-denying sandbox makes inert. This prevents a named
target from selecting an existing outer browsing context. On an eligible
marked link it retains a valid request only in the trusted metadata above and
uses the same popup-denied live target. It preserves a `<base href>` and
ordinary unmarked self navigation. Only a validated, non-download marked
default/`_self` link may receive the package-owned `_top` target. The portable
and Review documents retain their original bytes and stricter sandbox.

In served Browse, the `/id/<id>` redirect preserves the optional
request-visible `fragment` query on
`/view/<route>?fragment=<encoded-fragment>`. The server accepts at most one
value, decodes it exactly once, checks the grammar and cross-view anchor
existence above, and returns HTTP 400 without injecting a fragment when
validation fails. It renders the validated value as an encoded hash on every
current screen iframe source and its light/dark swap sources. A use-case page
applies it only to the first step, matching the portable fallback. The query
remains on the outer history URL while scheme changes retain the iframe hashes.

The deployed preview is a static snapshot and has no request handler that can
render query-dependent HTML. Its progressive parent client reads at most one
`fragment` value, validates the grammar, and applies the encoded hash to the
appropriate same-origin iframe sources; authored links already carry the
builder's cross-view anchor proof. A direct preview URL whose syntactically
valid fragment names no anchor simply remains at the top of that frame. Without
JavaScript, preview links still reach the correct canonical Mokabook page but do
not promise anchor scrolling. A top-level `#fragment` is never logical-fragment
transport because URL hashes are not sent in an HTTP request.

## Enhanced And Native Navigation

With Browse enhancement available, an unmodified primary or keyboard activation
of a default/`_self` marked link asks the outer shell to navigate through its
existing latest-wins route transition. The resulting history entry has the
canonical `/view/<route>[?fragment=...]` URL; the title, breadcrumbs, heading,
details inspector, frames, focus, and status announcement all describe the
destination. Back and Forward return through those outer route entries and
restore their route-owned scroll.

The same trusted parent enhancement exclusively handles modified activation
and explicit non-self targets after validating the marker and canonical
destination. A requested `_top` or `_parent` uses the normal outer route
transition. When a new or named browsing context is requested, package-owned
parent code opens the canonical Mokabook URL with `noopener`; it never delegates
popup creation to the consumer frame. If enhancement is absent or fails, an
unmodified user activation of a default or `_self` marked link may navigate the
outer browsing context natively. Modified and non-self activation is
intentionally declined by the popup-denying fallback.

Consumer scripts remain disabled: Browse may permit same-origin inspection and
top navigation by explicit user activation, but must not grant script, form,
popup, or automatic top-navigation capabilities to consumer documents. Review
panes retain their stricter existing sandbox.

External, raw relative, download, same-document hash, metadata-only, and
unmarked links retain their existing frame-owned behavior subject to the
sandbox. Consumer-authored non-self and `<base target>` values are the security
exception: the adapted Browse copy neutralizes them on marked, unmarked, and
download elements so a reserved keyword or matching named context cannot
replace the shell. Mokabook must not infer product navigation from URLs,
`data-nav-href`, or visible labels.

## Active Catalogue Visibility

Every successful outer route change, including progressive navigation, native
navigation, Back, and Forward, establishes one navigation invariant: when the
route has a catalogue row, that row is visible and marked
`aria-current="page"`.

To establish the invariant, Browse must:

1. remove `aria-current` from every other row;
2. open each ancestor `details[data-nav-collection]` of the active row;
3. preserve unrelated collection disclosures;
4. clear a search query only when it would hide the destination;
5. switch Changed to All only when the destination is not changed;
6. reapply navigation visibility after those adjustments; and
7. scroll the active row into the nearest visible part of the catalogue pane.

The responsive drawer closes after navigation so it does not cover the new
screen. Its tree retains the opened destination path for the next time it is
opened. A user may collapse the active path afterward; the next route change
re-establishes the invariant.

Enhanced navigation preserves the selected viewport, color scheme, and details
disclosure. It collapses an expanded frame before installing the destination.
Filters and search remain unchanged when the destination is already visible.

## Verification Contract

Coverage must prove:

- portable output, eligible native-link markers, metadata-only
  `data-nav-href`, dual navigation attributes, hashes, use-case ids,
  dark-to-light fallback, conflicts, and reserved-marker errors;
- served and preview adaptation without mutating committed fragments, including
  secure top-target sanitization and request-visible fragment transport;
- served cross-view fragment validation and JavaScript-disabled anchor
  injection, plus enhanced static-preview injection and its documented
  page-level no-JavaScript fallback;
- enhanced primary, keyboard, modified, non-self, Back, and Forward navigation
  from mobile, desktop, flow, and legacy frames where supported;
- JavaScript-disabled served default/`_self` outer navigation without popup
  capability;
- active-row selection, ancestor disclosure, conditional filter/search reset,
  nearest scrolling, responsive drawer closure, and preserved shell state; and
- continued script denial; ancestor/named-context denial for marked, unmarked,
  download, and base targets; frame-owned external/download/hash behavior; and
  unchanged Review-pane links.

## Related Docs

- [Package and authoring contract](./mokabook-package.md)
- [Build, Browse, and Review runtime](./mokabook-runtime.md)
- [Shell design contract](./mokabook-shell-design.md)
- [Build pipeline](../architecture/build-pipeline.md)
