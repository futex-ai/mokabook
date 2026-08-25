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
`href` or `data-nav-href` attributes express catalogue navigation. The id is
stable authoring identity; the entry's `route` is its current Browse location.
A collection remains an invalid destination. A use-case destination opens the
use-case page, even though its portable fragment fallback resolves through the
first screen in that use case.

The builder must:

- validate the destination id and optional fragment before writing output;
- rewrite the actual `href` and `data-nav-href` to the relative generated
  artifact for the source viewport and color scheme, retaining light fallback;
- add one package-owned `data-mokabook-link` marker containing the original
  `<id>[#fragment]` destination to the element; and
- reject a reserved marker supplied by consumer output or conflicting logical
  destinations carried by two navigation attributes on one element.

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

When a marked anchor is presented beneath `/static/` in served Browse or in the
deployed Browse preview, Mokabook adapts its navigation destination to the
stable `/id/<id>` route. The default and `_self` cases target the outer Browse
page. An explicit non-self target keeps its native target semantics but uses
the canonical catalogue destination. A `download` link is not promoted.

The portable file on disk must not be mutated. The development server and
preview builder share one deterministic adaptation path so local and deployed
Browse cannot disagree. The server validates marker values against the loaded
manifest and never promotes unmarked relative links.

An optional logical fragment is carried through the id redirect to the
canonical view route. Screen pages apply it to every currently shown viewport
fragment and retain it when the color scheme changes. A use-case destination
applies it to the first step, matching the portable fallback. Invalid fragment
input fails closed rather than becoming an unchecked selector or URL.

## Enhanced And Native Navigation

With Browse enhancement available, an unmodified primary activation of a
marked link asks the outer shell to navigate through its existing latest-wins
route transition. The resulting history entry has the canonical
`/view/<route>` URL; the title, breadcrumbs, heading, details inspector, frames,
focus, and status announcement all describe the destination. Back and Forward
return through those outer route entries and restore their route-owned scroll.

Modified activation retains browser behavior against the adapted canonical
link, including opening a Mokabook page in a new tab. If enhancement is absent
or fails, a user-activated link may navigate the outer browsing context
natively. Consumer scripts remain disabled: Browse may permit same-origin
inspection and top navigation by explicit user activation, but must not grant
script, form, popup, or automatic top-navigation capabilities to consumer
documents. Review panes retain their stricter existing sandbox.

External, raw relative, download, same-document hash, and unmarked links retain
their existing behavior. Mokabook must not infer product navigation from their
URLs or visible labels.

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

- portable output, stable markers, dual navigation attributes, hashes,
  use-case ids, dark-to-light fallback, conflicts, and reserved-marker errors;
- served and preview adaptation without mutating committed fragments;
- primary, keyboard, modified, JavaScript-disabled, Back, and Forward
  navigation from mobile, desktop, flow, and legacy frames where supported;
- active-row selection, ancestor disclosure, conditional filter/search reset,
  nearest scrolling, responsive drawer closure, and preserved shell state; and
- continued script denial and unchanged behavior for unmarked, external,
  download, same-document, and Review-pane links.

## Related Docs

- [Package and authoring contract](./mokabook-package.md)
- [Build, Browse, and Review runtime](./mokabook-runtime.md)
- [Shell design contract](./mokabook-shell-design.md)
- [Build pipeline](../architecture/build-pipeline.md)
