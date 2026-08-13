/** Compare-mode switching for screen stages: the head-band segment state and
 * the lazily created branch-point document frames. Nothing is requested while
 * the segment stays on Current. */

import { currentColorScheme } from "./browse_state.js";

/** Compare mode applied to a screen stage. */
export type BrowseCompareMode = "base" | "current" | "difference" | "overlay";

/** Whether an attribute value names a compare mode. */
export function isCompareMode(value: unknown): value is BrowseCompareMode {
  return (
    value === "base" ||
    value === "current" ||
    value === "difference" ||
    value === "overlay"
  );
}

/** Read the compare mode the document currently shows. */
export function selectedCompareMode(doc: Document): BrowseCompareMode {
  const value = doc
    .querySelector("[data-mokabook-stage]")
    ?.getAttribute("data-compare");
  return isCompareMode(value) ? value : "current";
}

/**
 * Apply one compare mode to every comparable stage and segment control. The
 * first non-Current activation creates the base document frames; Current
 * renders the head documents alone and loads nothing.
 */
export function setCompareMode(doc: Document, mode: BrowseCompareMode): void {
  for (const stage of doc.querySelectorAll("[data-mokabook-stage]")) {
    if (stage.getAttribute("data-compare") !== null)
      stage.setAttribute("data-compare", mode);
  }
  if (mode !== "current") ensureBaseFrames(doc);
  for (const option of doc.querySelectorAll("[data-compare-option]")) {
    option.setAttribute(
      "aria-pressed",
      option.getAttribute("data-compare-option") === mode ? "true" : "false",
    );
  }
}

/**
 * Create the missing base frame under each head document. A base frame keeps
 * its own light/dark source attributes, so the shared color-scheme switch
 * swaps base and head documents together.
 */
function ensureBaseFrames(doc: Document): void {
  for (const head of doc.querySelectorAll("iframe[data-fragment-base]")) {
    const stack = head.closest(".mbk-cmp-stack");
    if (!stack || stack.querySelector(".mbk-frag--base")) continue;
    const light = head.getAttribute("data-fragment-base");
    if (!light) continue;
    const dark = head.getAttribute("data-fragment-base-dark");
    const base = doc.createElement("iframe");
    base.className = "mbk-frag mbk-frag--base";
    base.setAttribute("sandbox", "");
    base.setAttribute("data-fragment-light", light);
    if (dark) base.setAttribute("data-fragment-dark", dark);
    base.setAttribute(
      "title",
      `${head.getAttribute("title") ?? "Screen"} — base`,
    );
    base.setAttribute(
      "src",
      currentColorScheme(doc) === "dark" && dark ? dark : light,
    );
    stack.insertBefore(base, head);
  }
}
