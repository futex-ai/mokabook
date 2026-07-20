/** Progressive Browse shell enhancement served at /__mokabook/client/browse.js. */

import { applyNavVisibility, setDrawer, setViewport } from "./browse_state.js";

/** Anchor facts used to decide whether Browse may intercept a click. */
export interface BrowseLinkCandidate {
  download: boolean;
  modified: boolean;
  pathname: string;
  sameOrigin: boolean;
  samePageHash: boolean;
  target: string;
}

/** Decide whether one clicked link is an eligible in-shell navigation. */
export function isEligibleBrowseLink(candidate: BrowseLinkCandidate): boolean {
  if (!candidate.sameOrigin) return false;
  if (candidate.download || candidate.modified || candidate.samePageHash)
    return false;
  if (candidate.target !== "" && candidate.target !== "_self") return false;
  return (
    candidate.pathname === "/" ||
    candidate.pathname.startsWith("/view/") ||
    candidate.pathname.startsWith("/id/")
  );
}

/** Latest-wins request sequencing for overlapping navigations. */
export class NavigationSequencer {
  #current: AbortController | undefined;

  /** Abort the previous request and open a new latest-wins slot. */
  begin(): { isCurrent(): boolean; signal: AbortSignal } {
    this.#current?.abort();
    const controller = new AbortController();
    this.#current = controller;
    return {
      isCurrent: () => this.#current === controller,
      signal: controller.signal,
    };
  }
}

interface ScrollState {
  scroll?: number;
}

function initBrowseShell(doc: Document, win: Window & typeof globalThis): void {
  const shell = doc.querySelector<HTMLElement>("[data-mokabook-shell]");
  const main = doc.querySelector<HTMLElement>("[data-mokabook-view]");
  if (!shell || !main) return;
  if (win.history.scrollRestoration) win.history.scrollRestoration = "manual";
  const sequencer = new NavigationSequencer();
  const announce = (message: string): void => {
    const status = doc.getElementById("mb-status");
    if (status) status.textContent = message;
  };

  const markActiveRow = (pathname: string): void => {
    for (const row of doc.querySelectorAll<HTMLAnchorElement>(
      "a[data-nav-row]",
    )) {
      if (new URL(row.href, win.location.href).pathname === pathname)
        row.setAttribute("aria-current", "page");
      else row.removeAttribute("aria-current");
    }
  };

  const navigate = async (
    url: string,
    push: boolean,
    restoreScroll?: number,
  ): Promise<void> => {
    const slot = sequencer.begin();
    let response: Response;
    let text: string;
    try {
      response = await win.fetch(url, {
        headers: { accept: "text/html" },
        signal: slot.signal,
      });
      if (!response.ok && response.status !== 404)
        throw new Error(`status ${response.status}`);
      text = await response.text();
    } catch {
      if (slot.isCurrent()) win.location.assign(url);
      return;
    }
    if (!slot.isCurrent()) return;
    const parsed = new win.DOMParser().parseFromString(text, "text/html");
    const nextMain = parsed.querySelector("[data-mokabook-view]");
    if (!nextMain) {
      win.location.assign(url);
      return;
    }
    for (const frame of main.querySelectorAll("iframe")) frame.remove();
    if (push)
      win.history.replaceState(
        { scroll: win.scrollY } satisfies ScrollState,
        "",
        win.location.href,
      );
    main.innerHTML = nextMain.innerHTML;
    doc.title = parsed.title || doc.title;
    const finalUrl = response.url || url;
    if (push) win.history.pushState({} satisfies ScrollState, "", finalUrl);
    markActiveRow(new URL(finalUrl, win.location.href).pathname);
    setDrawer(shell, false);
    win.scrollTo(0, restoreScroll ?? 0);
    main.focus();
    announce(`Loaded ${doc.title}`);
  };

  doc.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : undefined;
    if (!target) return;
    if (target.closest("[data-mokabook-menu]")) {
      setDrawer(shell, shell.dataset["drawer"] !== "open");
      return;
    }
    const viewportOption = target
      .closest("[data-viewport-option]")
      ?.getAttribute("data-viewport-option");
    if (viewportOption) {
      setViewport(doc, viewportOption);
      return;
    }
    const filterButton = target.closest("[data-filter]");
    if (filterButton) {
      for (const option of doc.querySelectorAll("[data-filter]"))
        option.setAttribute(
          "aria-pressed",
          option === filterButton ? "true" : "false",
        );
      applyNavVisibility(doc);
      return;
    }
    const anchor = target.closest("a");
    if (!anchor || event.defaultPrevented) return;
    const url = new URL(anchor.href, win.location.href);
    const eligible = isEligibleBrowseLink({
      download: anchor.hasAttribute("download"),
      modified:
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0,
      pathname: url.pathname,
      sameOrigin: url.origin === win.location.origin,
      samePageHash: url.pathname === win.location.pathname && url.hash !== "",
      target: anchor.getAttribute("target") ?? "",
    });
    if (!eligible) return;
    event.preventDefault();
    void navigate(url.href, true);
  });

  doc.addEventListener("input", (event) => {
    const target = event.target instanceof Element ? event.target : undefined;
    if (target?.matches("[data-mokabook-search]")) applyNavVisibility(doc);
  });

  win.addEventListener("popstate", (event) => {
    const scroll =
      typeof (event.state as ScrollState | null)?.scroll === "number"
        ? (event.state as ScrollState).scroll
        : undefined;
    void navigate(win.location.href, false, scroll);
  });
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  initBrowseShell(document, window);
}
