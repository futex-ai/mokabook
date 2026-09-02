/** Progressive Browse shell enhancement served at /__mokabook/client/browse.js. */

import { createBrowserDetailsPreference } from "./browse_details.js";
import { createBrowserNavPreference } from "./browse_navigation.js";
import {
  collapseFrame,
  expandedFrame,
  handleAddressClick,
  handleFrameClick,
} from "./browse_frames.js";
import {
  captureRegionScrolls,
  currentColorScheme,
  currentViewport,
  restoreRegionScrolls,
  setColorScheme,
  setDrawer,
  setViewport,
} from "./browse_state.js";
import {
  applyNavVisibility,
  selectAndRevealRoute,
} from "./browse_navigation_state.js";
import { applyPreviewFragmentQuery } from "./preview_fragment.js";
import { isEligibleBrowseLink, NavigationSequencer } from "./navigation.js";
import { attachFrameNavigation } from "./frame_navigation.js";

interface ScrollState {
  scrolls?: Record<string, number>;
}

function copyText(doc: Document, text: string): void {
  const clipboard = doc.defaultView?.navigator.clipboard;
  if (clipboard) {
    void clipboard.writeText(text).catch(() => undefined);
    return;
  }
  const area = doc.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  doc.body.appendChild(area);
  area.select();
  doc.execCommand("copy");
  area.remove();
}

function initBrowseShell(doc: Document, win: Window & typeof globalThis): void {
  const shell = doc.querySelector<HTMLElement>("[data-mokabook-shell]");
  const main = doc.querySelector<HTMLElement>("[data-mokabook-view]");
  if (!shell || !main) return;
  applyPreviewFragmentQuery(doc, win.location.search);
  const detailsPreference = createBrowserDetailsPreference(win);
  const navPreference = createBrowserNavPreference(win);
  detailsPreference.apply(doc);
  navPreference.apply(doc);
  if (win.history.scrollRestoration) win.history.scrollRestoration = "manual";
  const sequencer = new NavigationSequencer();
  let restoringHistory = false;
  const persistScroll = (): void => {
    win.history.replaceState(
      { scrolls: captureRegionScrolls(doc) } satisfies ScrollState,
      "",
      win.location.href,
    );
  };
  let scrollFramePending = false;
  persistScroll();
  doc.addEventListener(
    "scroll",
    () => {
      if (restoringHistory || scrollFramePending) return;
      persistScroll();
      scrollFramePending = true;
      win.requestAnimationFrame(() => {
        scrollFramePending = false;
      });
    },
    { capture: true, passive: true },
  );
  doc.addEventListener(
    "toggle",
    (event) => {
      const group =
        event.target instanceof HTMLDetailsElement ? event.target : undefined;
      if (!group?.hasAttribute("data-nav-collection")) return;
      if (group.dataset["filterOpen"] !== undefined) return;
      navPreference.remember(doc);
    },
    true,
  );
  const announce = (message: string): void => {
    const status = doc.getElementById("mb-status");
    if (status) status.textContent = message;
  };

  const navigate = async (
    url: string,
    push: boolean,
    restoreScrolls?: Readonly<Record<string, number>>,
  ): Promise<void> => {
    if (push) restoringHistory = false;
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
    const viewport = currentViewport(doc);
    for (const frame of main.querySelectorAll("iframe")) frame.remove();
    collapseFrame(doc, expandedFrame(doc));
    if (push) persistScroll();
    main.innerHTML = nextMain.innerHTML;
    const finalUrl = response.url || url;
    attachFrameNavigation(doc, frameActions);
    applyPreviewFragmentQuery(doc, new URL(finalUrl, win.location.href).search);
    detailsPreference.apply(doc);
    setViewport(doc, viewport);
    setColorScheme(doc, currentColorScheme(doc));
    doc.title = parsed.title || doc.title;
    if (push)
      win.history.pushState(
        { scrolls: {} } satisfies ScrollState,
        "",
        finalUrl,
      );
    selectAndRevealRoute(
      doc,
      new URL(finalUrl, win.location.href).pathname,
      win.location.href,
      "navigation",
    );
    setDrawer(shell, false);
    restoreRegionScrolls(doc, restoreScrolls ?? {});
    if (!push) {
      await new Promise<void>((resolve) =>
        win.requestAnimationFrame(() => resolve()),
      );
      if (!slot.isCurrent()) return;
      restoreRegionScrolls(doc, restoreScrolls ?? {});
      restoringHistory = false;
    }
    main.focus({ preventScroll: true });
    announce(`Loaded ${doc.title}`);
  };
  const frameActions = {
    navigate: (href: string): void => {
      void navigate(href, true);
    },
    open: (href: string, target: string): void => {
      win.open(href, target, "noopener");
    },
  };

  doc.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : undefined;
    if (!target) return;
    const summary = target.closest("summary");
    const details = summary?.parentElement;
    if (
      details instanceof HTMLDetailsElement &&
      details.matches("[data-mokabook-details]")
    ) {
      detailsPreference.rememberActivation(details);
    }
    const idChip = target.closest<HTMLElement>("button[data-copy-id]");
    if (idChip) {
      const id = idChip.dataset["copyId"] ?? "";
      if (id !== "") {
        copyText(doc, id);
        announce(`Copied ID ${id}`);
      }
      return;
    }
    if (target.closest("[data-mokabook-menu]")) {
      setDrawer(shell, shell.dataset["drawer"] !== "open");
      return;
    }
    if (target.closest("[data-mokabook-collapse]")) {
      for (const group of doc.querySelectorAll<HTMLDetailsElement>(
        "details[data-nav-collection]",
      ))
        group.open = false;
      return;
    }
    const schemeOption = target
      .closest("[data-color-scheme-option]")
      ?.getAttribute("data-color-scheme-option");
    if (schemeOption === "dark" || schemeOption === "light") {
      setColorScheme(doc, schemeOption);
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
      applyNavVisibility(doc, "reveal-matches");
      return;
    }
    if (handleFrameClick(doc, target)) {
      event.preventDefault();
      return;
    }
    if (handleAddressClick(doc, target, (text) => copyText(doc, text))) {
      event.preventDefault();
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

  doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape") collapseFrame(doc, expandedFrame(doc));
  });

  doc.addEventListener("input", (event) => {
    const target = event.target instanceof Element ? event.target : undefined;
    if (target?.matches("[data-mokabook-search]"))
      applyNavVisibility(doc, "reveal-matches");
  });

  doc.addEventListener(
    "toggle",
    (event) => {
      const target = event.target;
      if (
        target instanceof HTMLDetailsElement &&
        target.matches("[data-mokabook-details]")
      ) {
        detailsPreference.remember(target.open);
      }
    },
    true,
  );

  win.addEventListener("popstate", (event) => {
    const state = event.state as ScrollState | null;
    const scrolls =
      state && typeof state.scrolls === "object" && state.scrolls !== null
        ? state.scrolls
        : undefined;
    restoringHistory = true;
    void navigate(win.location.href, false, scrolls);
  });
  attachFrameNavigation(doc, frameActions);
  selectAndRevealRoute(
    doc,
    win.location.pathname,
    win.location.href,
    "navigation",
  );
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  initBrowseShell(document, window);
}
