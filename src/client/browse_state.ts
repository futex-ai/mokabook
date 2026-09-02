/** Typed Browse state captured across one automatic watched reload. */

import { isNavDisclosureKey } from "./browse_navigation.js";
import { applyNavVisibility } from "./browse_navigation_state.js";

/** Color scheme selection applied to fragment frames and device chrome. */
export type BrowseColorScheme = "dark" | "light";

/** Viewport selection applied to screen and use-case stages. */
export type BrowseViewport = "both" | "desktop" | "mobile";

/** User-controlled Browse state that survives one automatic reload. */
export interface BrowseRecoveryState {
  changedOnly: boolean;
  closedCollectionIds: readonly string[];
  colorScheme: BrowseColorScheme;
  detailsOpen: boolean;
  drawerOpen: boolean;
  /** Closed collection ids from before filtering, or null without a filter. */
  filterBaselineClosedCollectionIds: readonly string[] | null;
  navScroll: number;
  query: string;
  regionScrolls: Readonly<Record<string, number>>;
  viewport: BrowseViewport;
}

/** Read the scroll position of every scrollable stage region. */
export function captureRegionScrolls(doc: Document): Record<string, number> {
  const scrolls: Record<string, number> = {};
  for (const region of doc.querySelectorAll<HTMLElement>(
    "[data-mokabook-scroll]",
  )) {
    const key = region.getAttribute("data-mokabook-scroll");
    if (key) scrolls[key] = region.scrollTop;
  }
  return scrolls;
}

/** Apply stored scroll positions to the current stage regions. */
export function restoreRegionScrolls(
  doc: Document,
  scrolls: Readonly<Record<string, number>>,
): void {
  for (const region of doc.querySelectorAll<HTMLElement>(
    "[data-mokabook-scroll]",
  )) {
    const key = region.getAttribute("data-mokabook-scroll");
    if (key && typeof scrolls[key] === "number")
      region.scrollTop = scrolls[key];
  }
}

/** Capture the current shell state when Browse is active. */
export function captureBrowseState(
  doc: Document,
  _win: Window & typeof globalThis,
): BrowseRecoveryState | undefined {
  const shell = doc.querySelector<HTMLElement>("[data-mokabook-shell]");
  if (!shell) return undefined;
  const collections = [
    ...doc.querySelectorAll<HTMLDetailsElement>("[data-nav-collection]"),
  ];
  const closedCollectionIds = collections.flatMap((collection) => {
    const id = collection.getAttribute("data-nav-collection");
    return !collection.open && id ? [id] : [];
  });
  const filterBaselineClosedCollectionIds = collections.some(
    (collection) => collection.dataset["filterOpen"] !== undefined,
  )
    ? collections.flatMap((collection) => {
        const id = collection.getAttribute("data-nav-collection");
        return collection.dataset["filterOpen"] === "0" && id ? [id] : [];
      })
    : null;
  return {
    changedOnly:
      doc
        .querySelector('[data-filter="changed"]')
        ?.getAttribute("aria-pressed") === "true",
    closedCollectionIds,
    colorScheme: currentColorScheme(doc),
    detailsOpen:
      doc.querySelector<HTMLDetailsElement>("[data-mokabook-details]")?.open ??
      false,
    drawerOpen: shell.dataset["drawer"] === "open",
    filterBaselineClosedCollectionIds,
    navScroll:
      doc.querySelector<HTMLElement>("[data-mokabook-nav-scroll]")?.scrollTop ??
      0,
    query:
      doc.querySelector<HTMLInputElement>("[data-mokabook-search]")?.value ??
      "",
    regionScrolls: captureRegionScrolls(doc),
    viewport: currentViewport(doc),
  };
}

/** Restore a validated Browse snapshot into server-rendered shell markup. */
export function restoreBrowseState(
  doc: Document,
  _win: Window & typeof globalThis,
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
  const closed = new Set(state.closedCollectionIds.filter(isNavDisclosureKey));
  const filterBaselineClosed =
    state.filterBaselineClosedCollectionIds === null
      ? undefined
      : new Set(
          state.filterBaselineClosedCollectionIds.filter(isNavDisclosureKey),
        );
  for (const collection of doc.querySelectorAll<HTMLDetailsElement>(
    "[data-nav-collection]",
  )) {
    const id = collection.getAttribute("data-nav-collection");
    collection.open = !id || !closed.has(id);
    if (filterBaselineClosed) {
      collection.dataset["filterOpen"] =
        id && filterBaselineClosed.has(id) ? "0" : "1";
    } else {
      delete collection.dataset["filterOpen"];
    }
  }
  const details = doc.querySelector<HTMLDetailsElement>(
    "[data-mokabook-details]",
  );
  if (details) details.open = state.detailsOpen;
  setDrawer(shell, state.drawerOpen);
  setViewport(doc, state.viewport);
  setColorScheme(doc, state.colorScheme);
  applyNavVisibility(doc, "preserve");
  const nav = doc.querySelector<HTMLElement>("[data-mokabook-nav-scroll]");
  if (nav) nav.scrollTop = state.navScroll;
  restoreRegionScrolls(doc, state.regionScrolls);
}

/** Parse untrusted session storage into the strict Browse recovery contract. */
export function parseBrowseRecoveryState(
  value: unknown,
): BrowseRecoveryState | undefined {
  if (!record(value)) return undefined;
  const colorScheme = value["colorScheme"];
  const filterBaselineClosedCollectionIds =
    value["filterBaselineClosedCollectionIds"];
  const viewport = value["viewport"];
  if (
    typeof value["changedOnly"] !== "boolean" ||
    !stringArray(value["closedCollectionIds"]) ||
    (colorScheme !== "dark" && colorScheme !== "light") ||
    typeof value["detailsOpen"] !== "boolean" ||
    typeof value["drawerOpen"] !== "boolean" ||
    (filterBaselineClosedCollectionIds !== null &&
      !stringArray(filterBaselineClosedCollectionIds)) ||
    !nonNegativeNumber(value["navScroll"]) ||
    typeof value["query"] !== "string" ||
    !scrollRecord(value["regionScrolls"]) ||
    (viewport !== "both" && viewport !== "desktop" && viewport !== "mobile")
  ) {
    return undefined;
  }
  return {
    changedOnly: value["changedOnly"],
    closedCollectionIds: [...new Set(value["closedCollectionIds"])],
    colorScheme,
    detailsOpen: value["detailsOpen"],
    drawerOpen: value["drawerOpen"],
    filterBaselineClosedCollectionIds:
      filterBaselineClosedCollectionIds === null
        ? null
        : [...new Set(filterBaselineClosedCollectionIds)],
    navScroll: value["navScroll"],
    query: value["query"],
    regionScrolls: { ...value["regionScrolls"] },
    viewport,
  };
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

/** Read the viewport selection the current stage shows. */
export function currentViewport(doc: Document): BrowseViewport {
  const value = doc
    .querySelector("[data-mokabook-stage]")
    ?.getAttribute("data-viewport");
  return value === "desktop" || value === "mobile" ? value : "both";
}

/**
 * Apply one color scheme to the body, every scheme control, and every fragment
 * frame. A frame swaps between the server-rendered `data-fragment-light` and
 * `data-fragment-dark` URLs; a screen rendered only for light keeps its light
 * fragment. Each source is compared with the current `src` attribute first,
 * because assigning `src` reloads the frame even when the URL is unchanged.
 *
 * A catalogue built without dark fragments renders no scheme control, so a
 * requested dark scheme is clamped to light there: dark chrome around light
 * fragments would otherwise have no switch to recover from.
 */
export function setColorScheme(doc: Document, value: BrowseColorScheme): void {
  const scheme = doc.querySelector("[data-color-scheme-option]")
    ? value
    : "light";
  doc.body.setAttribute("data-mokabook-color-scheme", scheme);
  for (const option of doc.querySelectorAll("[data-color-scheme-option]"))
    option.setAttribute(
      "aria-pressed",
      option.getAttribute("data-color-scheme-option") === scheme
        ? "true"
        : "false",
    );
  for (const frame of doc.querySelectorAll("iframe[data-fragment-light]")) {
    const dark = frame.getAttribute("data-fragment-dark");
    const light = frame.getAttribute("data-fragment-light");
    const next = scheme === "dark" && dark ? dark : light;
    if (next && frame.getAttribute("src") !== next)
      frame.setAttribute("src", next);
  }
}

/** Read the color scheme the document currently shows, defaulting to light. */
export function currentColorScheme(doc: Document): BrowseColorScheme {
  return doc.body.getAttribute("data-mokabook-color-scheme") === "dark"
    ? "dark"
    : "light";
}

function nonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function scrollRecord(
  value: unknown,
): value is Readonly<Record<string, number>> {
  return (
    record(value) &&
    Object.values(value).every((entry) => nonNegativeNumber(entry))
  );
}

function stringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.length > 0)
  );
}
