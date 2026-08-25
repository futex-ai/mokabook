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
navigation attributes express catalogue references. A logical `href` is valid
only on an HTML `<a>`/`<area>` or SVG `<a>` and makes that native link eligible
for Browse activation. A logical `href` on every other element, including HTML
resource elements and SVG `use`/`image`, fails the build instead of becoming an
accidental resource request. Authors use `data-nav-href` for metadata-only
references; it is valid on any element but does not invent click or keyboard
semantics. A logical `data-nav-href` may coexist with an eligible logical
`href`, in which case both must name the same destination. The id is stable
authoring identity; the entry's `route` is its current Browse location. A
collection remains an invalid destination. A use-case destination opens the
use-case page, even though its portable fragment fallback resolves through the
first screen in that use case.

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
- reject a logical `href` on any other element, a reserved marker supplied by
  consumer output, or conflicting logical destinations carried by two
  navigation attributes on one element.

Before invoking a compatibility transformer, the builder records a multiset of
complete logical-reference records: expected marker presence and value, the
native-link class (`html-a`, `html-area`, `svg-a`, or metadata-only), which of
`href` and `data-nav-href` carried the logical destination, and each such
attribute's resolved portable value. It reparses the transformed document and
requires the same multiset. Adding or removing a marker, preserving a marker
while changing its portable destination, element kind, or namespace, changing
a metadata-only reference into an activatable link, or moving logical identity
between navigation attributes fails the build. Unrelated attributes remain
consumer-owned. After every document has been transformed, the builder indexes
anchors from the final documents and repeats cross-view fragment validation for
every retained logical-reference record. A transformer that removes or renames
an anchor in any destination viewport or scheme therefore fails the build even
when the source link record itself is unchanged.

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

When an eligible marked native link from a manifest-owned generated document is
presented beneath `/static/` in served Browse or in the deployed Browse preview,
Mokabook authenticates its marker for trusted parent enhancement while retaining
the portable `href` and live `target`. The trusted-document set is exactly every
current manifest screen fragment, including dark fragments, plus every
generated legacy page in that manifest. Its generated header must name the same
`sourcePath` as that manifest entry. The parent derives the canonical
`/id/<encoded-id>` or
`/id/<encoded-id>?fragment=<encoded-fragment>` destination from the marker; it
never trusts the portable URL as route identity. The adapter removes any
consumer-authored `data-mokabook-target`, resolves the eligible link's effective
request from its own `target` or the document's applicable first `<base target>`,
parses it, and retains a valid non-self request only in newly derived inert
metadata. An invalid target receives no trusted metadata, so parent enhancement
declines it. A `download` link is not promoted, and `data-nav-href` without an
eligible logical `href` stays portable metadata rather than becoming a Browse
interaction.

The portable file on disk must not be mutated. The development server and
preview builder share one deterministic Browse-document adapter for marker
authentication and derived target metadata. Every HTML response or preview
copy beneath `/static/` passes through it. Only a route in the trusted set above
whose bytes retain that matching ownership header may promote a marker. The
adapter recomputes the source view's expected portable `href` and requires the
marked link to match it exactly. On any other HTML route, including
consumer-authored unowned files, it removes `data-mokabook-link` and
`data-mokabook-target` from the adapted copy and never promotes them. A missing
or mismatched ownership header, malformed or manifest-invalid marker, or
mismatched portable `href` on a trusted route yields HTTP 500 without serving
that document and fails the preview build. Neither environment promotes an
unmarked relative link or rewrites a live `href`, `target`, `formtarget`, or
`base` target.

One pure target parser is shared by the adapter and parent client. It does not
trim its input and returns exactly one typed state:

- absent, empty, or an ASCII-case-insensitive `_self` is `self`;
- ASCII-case-insensitive `_top`, `_parent`, and `_blank` are their corresponding
  reserved states;
- `/^[A-Za-z0-9][A-Za-z0-9._:-]*$/` is a named target, preserving its case; and
- every other value, including whitespace or control characters, is invalid.

The parent reparses adapter-produced target metadata with this same contract
and declines an invalid or context-inappropriate state.

Browse grants a fragment frame same-origin access only so trusted parent code
can inspect its immediate document. It never grants `allow-top-navigation`,
`allow-top-navigation-by-user-activation`, `allow-popups`, `allow-forms`,
`allow-scripts`, or `allow-downloads`. The top-navigation restriction remains
active for the generated document and is inherited by every descendant
browsing context it creates, including `srcdoc`, local, and cross-origin child
frames. Consumer-authored `_top`, `_parent`, named, `<base target>`, and
`formtarget` values therefore cannot replace the shell even when they live in
nested content the adapter cannot inspect. Trusted parent code is the only
outer-navigation authority. Portable and Review documents retain their original
bytes and Review keeps its stricter sandbox.

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
`fragment` value, validates the grammar, and applies the encoded hash to `src`,
`data-fragment-light`, and `data-fragment-dark` wherever each attribute exists
on every current screen frame. On a use-case page it updates only the first
step. Authored links already carry the builder's cross-view anchor proof, and
updating every swap source preserves the anchor through light/dark changes. A
direct preview URL whose syntactically valid fragment names no anchor simply
remains at the top of that frame. Without parent enhancement, served and preview
links keep their portable in-frame behavior; neither environment promises outer
page navigation or logical-fragment transport from a click. A top-level
`#fragment` is never logical-fragment transport because URL hashes are not sent
in an HTTP request.

## Enhanced Navigation And Safe Degradation

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
popup creation to the consumer frame. If enhancement is absent or fails, the
portable live link remains frame-owned and subject to the sandbox; Mokabook does
not grant native outer-navigation fallback.

Consumer scripts remain disabled. Browse permits same-origin inspection but
does not grant script, form, popup, download, or either top-navigation
capability to consumer documents. Review panes retain their stricter existing
sandbox.

External, raw relative, download, same-document hash, metadata-only, and
unmarked links retain their existing frame-owned behavior subject to the
sandbox. Consumer-authored targets remain byte-preserved, but the sandbox denies
their access to the outer shell and to popups. Mokabook must not infer product
navigation from URLs, `data-nav-href`, or visible labels.

## Active Catalogue Visibility

Every successful outer route change, including progressive navigation, Back,
and Forward, establishes one navigation invariant: when the route has a
catalogue row, that row is visible and marked `aria-current="page"`.

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
  `data-nav-href`, rejection of logical `href` on resource/non-link elements,
  dual navigation attributes, hashes, use-case ids, dark-to-light fallback,
  conflicts, and reserved-marker errors;
- served and preview adaptation without mutating committed fragments, including
  ownership-gated promotion, unowned reserved-metadata removal, secure target
  parsing, portable live attributes, and request-visible fragment transport;
- served cross-view fragment validation and JavaScript-disabled anchor
  injection, plus enhanced static-preview current/swap-source injection,
  scheme-toggle retention, and first-step use-case scoping;
- enhanced primary, keyboard, modified, non-self, Back, and Forward navigation
  from mobile, desktop, flow, and legacy frames where supported;
- safe failed/disabled-enhancement degradation without outer navigation;
- active-row selection, ancestor disclosure, conditional filter/search reset,
  nearest scrolling, responsive drawer closure, and preserved shell state; and
- continued script denial and top-navigation denial across direct, `srcdoc`,
  local, and cross-origin nested contexts; ancestor/named-context denial across
  HTML and SVG links, forms, marked, unmarked, download, and base targets;
  frame-owned external/download/hash behavior; and unchanged Review-pane links.

## Related Docs

- [Package and authoring contract](./mokabook-package.md)
- [Build, Browse, and Review runtime](./mokabook-runtime.md)
- [Shell design contract](./mokabook-shell-design.md)
- [Build pipeline](../architecture/build-pipeline.md)
