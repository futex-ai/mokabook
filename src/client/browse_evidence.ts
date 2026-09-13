/** Reconcile background catalogue evidence while retaining navigation nodes and choices. */
import { applyNavVisibility } from "./browse_navigation_state.js";

export function applyNavigationEvidence(doc: Document, next: Document): void {
  const tree = doc.querySelector<HTMLElement>("[data-mokly-nav-scroll]");
  const scroll = tree?.scrollTop ?? 0;
  const filter = doc.querySelector<HTMLElement>("[data-changes-status]");
  const nextFilter = next.querySelector<HTMLElement>("[data-changes-status]");
  if (filter && nextFilter) {
    filter.dataset["changesStatus"] = nextFilter.dataset["changesStatus"]!;
    copyChildren(
      filter.querySelector(".mbk-nav-filter-count"),
      nextFilter.querySelector(".mbk-nav-filter-count"),
    );
  }
  copyChildren(
    doc.querySelector("[data-nav-status]"),
    next.querySelector("[data-nav-status]"),
  );
  const nextRows = new Map(
    [...next.querySelectorAll<HTMLAnchorElement>("a[data-nav-row]")].map(
      (row) => [row.getAttribute("href"), row],
    ),
  );
  const removed = new Map<string | null, HTMLAnchorElement>();
  for (const row of doc.querySelectorAll<HTMLAnchorElement>(
    "a[data-nav-row]",
  )) {
    const replacement = nextRows.get(row.getAttribute("href"));
    if (!replacement) {
      if (row.hasAttribute("data-nav-removed")) row.remove();
      continue;
    }
    if (replacement.getAttribute("data-changed") === "true") {
      if (row.getAttribute("data-changed") !== "true")
        row.setAttribute("data-changed", "true");
    } else row.removeAttribute("data-changed");
    if (row.hasAttribute("data-nav-removed")) {
      removed.set(row.getAttribute("href"), row);
      copyChildren(row, replacement);
      for (const name of ["data-tags", "data-entry-id", "data-removed-page"]) {
        const value = replacement.getAttribute(name);
        if (value === null) row.removeAttribute(name);
        else row.setAttribute(name, value);
      }
    }
    nextRows.delete(row.getAttribute("href"));
  }
  let following: ChildNode | null = null;
  for (const row of [
    ...next.querySelectorAll<HTMLAnchorElement>("a[data-nav-removed]"),
  ].reverse()) {
    const retained =
      removed.get(row.getAttribute("href")) ?? doc.importNode(row, true);
    if (retained.parentElement !== tree || retained.nextSibling !== following)
      tree?.insertBefore(retained, following);
    following = retained;
  }
  applyNavVisibility(doc, "preserve");
  if (tree) tree.scrollTop = scroll;
}

/** Unchanged evidence does not replace descendants or disturb their focus. */
export function copyChildren(
  current: Element | null,
  next: Element | null,
): void {
  if (current && next && current.innerHTML !== next.innerHTML)
    current.replaceChildren(
      ...[...next.childNodes].map((node) =>
        current.ownerDocument.importNode(node, true),
      ),
    );
}
