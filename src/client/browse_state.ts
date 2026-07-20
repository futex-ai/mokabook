/** Typed Browse state captured across one automatic watched reload. */

/** Viewport selection applied to screen and use-case stages. */
export type BrowseViewport = "both" | "desktop" | "mobile";

/** User-controlled Browse state that survives one automatic reload. */
export interface BrowseRecoveryState {
  changedOnly: boolean;
  closedCollectionIds: readonly string[];
  detailsOpen: boolean;
  drawerOpen: boolean;
  navScroll: number;
  query: string;
  scroll: number;
  viewport: BrowseViewport;
}

/** Capture the current shell state when Browse is active. */
export function captureBrowseState(
  doc: Document,
  win: Window & typeof globalThis,
): BrowseRecoveryState | undefined {
  const shell = doc.querySelector<HTMLElement>("[data-mokabook-shell]");
  if (!shell) return undefined;
  const viewport = selectedViewport(doc);
  const closedCollectionIds = [
    ...doc.querySelectorAll<HTMLDetailsElement>("[data-nav-collection]"),
  ].flatMap((collection) => {
    const id = collection.getAttribute("data-nav-collection");
    return !collection.open && id ? [id] : [];
  });
  return {
    changedOnly:
      doc
        .querySelector('[data-filter="changed"]')
        ?.getAttribute("aria-pressed") === "true",
    closedCollectionIds,
    detailsOpen:
      doc.querySelector<HTMLDetailsElement>("[data-mokabook-details]")?.open ??
      false,
    drawerOpen: shell.dataset["drawer"] === "open",
    navScroll:
      doc.querySelector<HTMLElement>("[data-mokabook-nav]")?.scrollTop ?? 0,
    query:
      doc.querySelector<HTMLInputElement>("[data-mokabook-search]")?.value ??
      "",
    scroll: win.scrollY,
    viewport,
  };
}

/** Restore a validated Browse snapshot into server-rendered shell markup. */
export function restoreBrowseState(
  doc: Document,
  win: Window & typeof globalThis,
  state: BrowseRecoveryState,
): void {
  const shell = doc.querySelector<HTMLElement>("[data-mokabook-shell]");
  if (!shell) return;
  const search = doc.querySelector<HTMLInputElement>("[data-mokabook-search]");
  if (search) search.value = state.query;
  for (const option of doc.querySelectorAll("[data-filter]")) {
    const changed = option.getAttribute("data-filter") === "changed";
    option.setAttribute(
      "aria-pressed",
      changed === state.changedOnly ? "true" : "false",
    );
  }
  const closed = new Set(state.closedCollectionIds);
  for (const collection of doc.querySelectorAll<HTMLDetailsElement>(
    "[data-nav-collection]",
  )) {
    const id = collection.getAttribute("data-nav-collection");
    collection.open = !id || !closed.has(id);
  }
  const details = doc.querySelector<HTMLDetailsElement>(
    "[data-mokabook-details]",
  );
  if (details) details.open = state.detailsOpen;
  setDrawer(shell, state.drawerOpen);
  setViewport(doc, state.viewport);
  applyNavVisibility(doc);
  const nav = doc.querySelector<HTMLElement>("[data-mokabook-nav]");
  if (nav) nav.scrollTop = state.navScroll;
  win.scrollTo(0, state.scroll);
}

/** Parse untrusted session storage into the strict Browse recovery contract. */
export function parseBrowseRecoveryState(
  value: unknown,
): BrowseRecoveryState | undefined {
  if (!record(value)) return undefined;
  const viewport = value["viewport"];
  if (
    typeof value["changedOnly"] !== "boolean" ||
    !stringArray(value["closedCollectionIds"]) ||
    typeof value["detailsOpen"] !== "boolean" ||
    typeof value["drawerOpen"] !== "boolean" ||
    !nonNegativeNumber(value["navScroll"]) ||
    typeof value["query"] !== "string" ||
    !nonNegativeNumber(value["scroll"]) ||
    (viewport !== "both" && viewport !== "desktop" && viewport !== "mobile")
  ) {
    return undefined;
  }
  return {
    changedOnly: value["changedOnly"],
    closedCollectionIds: [...new Set(value["closedCollectionIds"])],
    detailsOpen: value["detailsOpen"],
    drawerOpen: value["drawerOpen"],
    navScroll: value["navScroll"],
    query: value["query"],
    scroll: value["scroll"],
    viewport,
  };
}

/** Apply the current search and changed-only controls to navigation rows. */
export function applyNavVisibility(doc: Document): void {
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
}

/** Apply the responsive navigation drawer state. */
export function setDrawer(shell: HTMLElement, open: boolean): void {
  shell.dataset["drawer"] = open ? "open" : "closed";
  const button = shell.querySelector("[data-mokabook-menu]");
  button?.setAttribute("aria-expanded", open ? "true" : "false");
}

/** Apply one viewport selection to every stage and control. */
export function setViewport(doc: Document, value: string): void {
  for (const stage of doc.querySelectorAll("[data-mokabook-stage]"))
    stage.setAttribute("data-viewport", value);
  for (const option of doc.querySelectorAll("[data-viewport-option]"))
    option.setAttribute(
      "aria-pressed",
      option.getAttribute("data-viewport-option") === value ? "true" : "false",
    );
}

function selectedViewport(doc: Document): BrowseViewport {
  const value = doc
    .querySelector("[data-mokabook-stage]")
    ?.getAttribute("data-viewport");
  return value === "desktop" || value === "mobile" ? value : "both";
}

function nonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.length > 0)
  );
}
