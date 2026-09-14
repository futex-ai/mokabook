/** Latest snapshot delivery for same-content background updates, fenced against navigation. */
import { applyNavigationEvidence } from "./browse_evidence.js";
import {
  navigationPending,
  readPageStamp,
  waitForNavigation,
} from "./browse_update_state.js";
import { workspaceEvidence } from "./workspace_updates.js";

export async function refreshBrowseEvidence(
  doc: Document,
  win: Window & typeof globalThis,
  version: number,
  signal: AbortSignal,
): Promise<number | undefined> {
  if (!readPageStamp(doc)) return;
  while (!signal.aborted) {
    await waitForNavigation(doc, signal);
    const href = win.location.href;
    const view = doc.querySelector("[data-mokly-view]")?.firstElementChild;
    const response = await win.fetch(href, {
      signal,
      cache: "no-store",
      headers: { accept: "text/html" },
    });
    const html = await response.text();
    signal.throwIfAborted();
    if (
      navigationPending(doc) ||
      href !== win.location.href ||
      view !== doc.querySelector("[data-mokly-view]")?.firstElementChild
    )
      continue;
    if (!response.ok || response.url !== href.split("#")[0]) return;
    const next = new win.DOMParser().parseFromString(html, "text/html");
    const current = readPageStamp(doc);
    const stamp = readPageStamp(next);
    if (
      !current ||
      !stamp ||
      stamp.content !== current.content ||
      stamp.version < Math.max(version, current.version) ||
      doc
        .querySelector("[data-mokly-view]")
        ?.getAttribute("data-mokly-baseline") !==
        next
          .querySelector("[data-mokly-view]")
          ?.getAttribute("data-mokly-baseline")
    )
      return;
    const evidence = workspaceEvidence(doc, next);
    if (!evidence) return;
    applyNavigationEvidence(doc, next);
    evidence();
    doc.documentElement.setAttribute(
      "data-mokly-update-version",
      String(stamp.version),
    );
    doc.dispatchEvent(new win.Event("mokly:evidence-updated"));
    return stamp.version;
  }
  return undefined;
}
