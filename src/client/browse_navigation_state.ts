/** Catalogue-tree filtering and active-route visibility invariants. */

/** Facts needed to decide which active-row constraints must change. */
export interface NavigationConstraintFacts {
  changed: boolean;
  changedOnly: boolean;
  query: string;
  route: string;
  text: string;
}

/** Minimal control changes needed to reveal one destination row. */
export interface NavigationConstraintChanges {
  clearQuery: boolean;
  showAll: boolean;
}

/** How a visibility update should affect navigation-group disclosure. */
export type NavigationDisclosurePolicy = "preserve" | "reveal-matches";

/** Why the active route's navigation path is being revealed. */
export type NavigationRevealCause = "navigation" | "recovery";

/** Determine which user constraints actually hide a destination. */
export function navigationConstraintChanges(
  facts: NavigationConstraintFacts,
): NavigationConstraintChanges {
  const query = facts.query.trim().toLowerCase();
  const matchesQuery =
    query === "" ||
    facts.text.toLowerCase().includes(query) ||
    facts.route.toLowerCase().includes(query);
  return {
    clearQuery: !matchesQuery,
    showAll: facts.changedOnly && !facts.changed,
  };
}

/** Apply the current navigation controls with an explicit disclosure policy. */
export function applyNavVisibility(
  doc: Document,
  disclosure: NavigationDisclosurePolicy,
): void {
  const query =
    doc
      .querySelector<HTMLInputElement>("[data-mokabook-search]")
      ?.value.trim()
      .toLowerCase() ?? "";
  const changedOnly =
    doc
      .querySelector('[data-filter="changed"]')
      ?.getAttribute("aria-pressed") === "true";
  for (const row of doc.querySelectorAll<HTMLElement>("[data-nav-row]")) {
    const matchesQuery =
      query === "" ||
      (row.textContent ?? "").toLowerCase().includes(query) ||
      (row.getAttribute("data-route") ?? "").toLowerCase().includes(query);
    const matchesFilter =
      !changedOnly || row.getAttribute("data-changed") === "true";
    row.hidden = !(matchesQuery && matchesFilter);
  }
  applyGroupVisibility(doc, query !== "" || changedOnly, disclosure);
}

/** Select one route and disclose, reveal, and scroll its catalogue row. */
export function selectAndRevealRoute(
  doc: Document,
  pathname: string,
  baseHref: string,
  cause: NavigationRevealCause,
): HTMLAnchorElement | undefined {
  const rows = [...doc.querySelectorAll<HTMLAnchorElement>("a[data-nav-row]")];
  let active: HTMLAnchorElement | undefined;
  for (const row of rows) {
    const matches =
      active === undefined &&
      new URL(row.getAttribute("href") ?? "", baseHref).pathname === pathname;
    if (matches) {
      active = row;
      row.setAttribute("aria-current", "page");
    } else {
      row.removeAttribute("aria-current");
    }
  }
  if (!active) return undefined;
  const search = doc.querySelector<HTMLInputElement>("[data-mokabook-search]");
  const changedOnly =
    doc
      .querySelector('[data-filter="changed"]')
      ?.getAttribute("aria-pressed") === "true";
  const changes = navigationConstraintChanges({
    changed: active.getAttribute("data-changed") === "true",
    changedOnly,
    query: search?.value ?? "",
    route: active.getAttribute("data-route") ?? "",
    text: active.textContent ?? "",
  });
  if (changes.clearQuery && search) search.value = "";
  if (changes.showAll) {
    for (const option of doc.querySelectorAll<HTMLElement>("[data-filter]")) {
      option.setAttribute(
        "aria-pressed",
        option.getAttribute("data-filter") === "all" ? "true" : "false",
      );
    }
  }
  applyNavVisibility(doc, "preserve");
  let ancestor = active.closest<HTMLDetailsElement>(
    "details[data-nav-collection]",
  );
  while (ancestor) {
    const wasOpen = ancestor.open;
    ancestor.open = true;
    if (
      ancestor.dataset["filterOpen"] !== undefined &&
      (cause === "navigation" || !wasOpen)
    ) {
      ancestor.dataset["filterOpen"] = "1";
    }
    ancestor =
      ancestor.parentElement?.closest<HTMLDetailsElement>(
        "details[data-nav-collection]",
      ) ?? null;
  }
  active.scrollIntoView({ block: "nearest" });
  return active;
}

function applyGroupVisibility(
  doc: Document,
  filtering: boolean,
  disclosure: NavigationDisclosurePolicy,
): void {
  const groups = [
    ...doc.querySelectorAll<HTMLDetailsElement>("details[data-nav-collection]"),
  ];
  if (filtering) {
    for (const group of groups) {
      if (group.dataset["filterOpen"] === undefined) {
        group.dataset["filterOpen"] = group.open ? "1" : "0";
      }
      if (disclosure === "reveal-matches") group.open = true;
    }
    for (const group of [...groups].reverse()) {
      const visible = [
        ...group.querySelectorAll<HTMLElement>("[data-nav-row]"),
      ].some((row) => !row.hidden);
      group.hidden = !visible;
    }
    return;
  }
  for (const group of groups) {
    const saved = group.dataset["filterOpen"];
    if (saved !== undefined) {
      group.open = saved === "1";
      delete group.dataset["filterOpen"];
    }
    group.hidden = false;
  }
}
