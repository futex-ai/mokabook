/** Designed, self-contained index and compare pages for Review artifacts. */

import path from "node:path";

import { encodeUrlPath } from "../config/paths.js";
import { SHELL_CSS } from "../server/shell/css.js";
import { comparisonPagePath } from "./paths.js";
import type {
  ReviewResult,
  ReviewState,
  ScreenReview,
  ViewportReview,
} from "./types.js";

const GROUPS: readonly { label: string; state: ReviewState }[] = [
  { label: "Changed", state: "changed" },
  { label: "Added", state: "added" },
  { label: "Removed", state: "removed" },
  { label: "Ignored only", state: "ignored-only" },
];

/** Render the grouped Review summary page. */
export function indexPage(result: ReviewResult): string {
  const material = result.screens.filter(
    (screen) => screen.state !== "unchanged",
  );
  const unchanged = result.screens.length - material.length;
  const counts = GROUPS.map(
    ({ label, state }) =>
      `${result.screens.filter((screen) => screen.state === state).length} ${label.toLowerCase()}`,
  ).join(" · ");
  const body =
    material.length === 0
      ? `<div class="mb-empty"><h1>No visual changes</h1>` +
        `<p>This branch matches ${escape(result.baseRef)} for every screen in the catalogue.</p></div>`
      : `<div class="mb-title-row"><h1>Mokabook review</h1></div>` +
        `<p class="mb-review-foot">${escape(counts)} against ${escape(result.baseRef)}. ` +
        `${unchanged} unchanged. Choose a screen to compare.</p>` +
        GROUPS.map(({ label, state }) =>
          groupSection(
            label,
            result.screens.filter((screen) => screen.state === state),
          ),
        ).join("");
  return page(
    "Mokabook Review",
    baseline(result.baseRef) +
      body +
      sharedImpactCard(result.sharedImpact) +
      ignoredImpactCard(result),
  );
}

/** Render one per-viewport comparison page. */
export function comparePage(
  result: ReviewResult,
  screen: ScreenReview,
  viewport: ViewportReview,
): string {
  const pagePath = comparisonPagePath(screen.route, viewport.viewport);
  const rootLink = relativeLink(pagePath, "index.html");
  const panes = [
    paneMarkup(
      pagePath,
      viewport.beforePath,
      `Before — ${result.baseRef}`,
      `This screen does not exist on ${result.baseRef}.`,
      viewport.state === "removed" ? "removed" : "neutral",
      "before",
    ),
    paneMarkup(
      pagePath,
      viewport.afterPath,
      "After — this branch",
      "This screen does not exist on this branch.",
      viewport.state === "added" ? "added" : "neutral",
      "after",
    ),
  ].join("");
  return page(
    `${screen.title} · ${viewport.viewport}`,
    baseline(result.baseRef) +
      `<p><a href="${escape(rootLink)}">Review</a></p>` +
      `<div class="mb-title-row"><h1>${escape(screen.title)}</h1>` +
      `${badge(viewport.state)}<span class="mb-code">${escape(screen.route)}</span></div>` +
      toolbar(screen, viewport) +
      `<div class="mb-panes" data-compare-mode="side">${panes}</div>` +
      ignoredCard(viewport) +
      `<p class="mb-review-foot">${escape(viewport.viewport)} · ${escape(viewport.state)}</p>` +
      MODE_SCRIPT,
  );
}

function groupSection(label: string, screens: readonly ScreenReview[]): string {
  if (screens.length === 0) return "";
  const rows = screens
    .map((screen) => {
      const links = screen.viewports
        .map(
          (viewport) =>
            `<a href="${escape(encodeUrlPath(comparisonPagePath(screen.route, viewport.viewport)))}">${viewport.viewport}</a>`,
        )
        .join(" · ");
      return (
        `<li><span class="mb-chg-row">` +
        `<span class="mb-chg-dot mb-chg-dot--${escape(screen.state)}" aria-hidden="true"></span>` +
        `<span>${escape(screen.title)}<span class="mb-chg-route">${escape(screen.route)}</span></span>` +
        `<span>${links}</span></span></li>`
      );
    })
    .join("");
  return (
    `<section><h2 class="mb-nav-group">${escape(label)}</h2>` +
    `<ul class="mb-nav-list" style="list-style:none;margin:0;padding:0">${rows}</ul></section>`
  );
}

function sharedImpactCard(sharedImpact: readonly string[]): string {
  if (sharedImpact.length === 0) return "";
  return (
    `<section class="mb-impact-card"><h3>Shared impact</h3>` +
    sharedImpact
      .map((item) => `<span class="mb-code">${escape(item)}</span> `)
      .join("") +
    `<p>Unchanged screens may still look different because shared files changed.</p></section>`
  );
}

function ignoredImpactCard(result: ReviewResult): string {
  if (result.ignoredImpact.length === 0) return "";
  const rows = result.ignoredImpact
    .map(
      (item) =>
        `<p class="mb-ignored-note"><span class="mb-code">${escape(item.id)}</span>` +
        `<span class="mb-badge mb-badge--ignored-only">Ignored</span>` +
        `<span>${escape(item.viewport)} · ${item.count} ${item.count === 1 ? "screen" : "screens"}</span></p>`,
    )
    .join("");
  return (
    `<section class="mb-impact-card"><h3>Ignored regions</h3>${rows}` +
    `<p>Changes inside these regions were excluded from the comparison.</p></section>`
  );
}

function ignoredCard(viewport: ViewportReview): string {
  if (viewport.ignoredIds.length === 0) return "";
  const chips = viewport.ignoredIds
    .map((id) => `<span class="mb-code">${escape(id)}</span>`)
    .join(" ");
  return (
    `<section class="mb-impact-card"><h3>Ignored regions</h3>` +
    `<p class="mb-ignored-note">${chips}` +
    `<span class="mb-badge mb-badge--ignored-only">Ignored</span></p>` +
    `<p>Differences inside these regions were excluded from the comparison.</p></section>`
  );
}

function toolbar(screen: ScreenReview, active: ViewportReview): string {
  const modes = [
    ["side", "Side by side"],
    ["overlay", "Overlay"],
    ["difference", "Difference"],
  ] as const;
  const modeButtons = modes
    .map(
      ([mode, label]) =>
        `<button class="mb-viewswitch-option" type="button" data-mode="${mode}"` +
        ` aria-pressed="${mode === "side" ? "true" : "false"}">${label}</button>`,
    )
    .join("");
  const pagePath = comparisonPagePath(screen.route, active.viewport);
  const viewportLinks = screen.viewports
    .map((viewport) => {
      const label = viewport.viewport === "mobile" ? "Mobile" : "Desktop";
      if (viewport.viewport === active.viewport)
        return `<span class="mb-viewswitch-option" aria-current="page">${label}</span>`;
      const target = relativeLink(
        pagePath,
        comparisonPagePath(screen.route, viewport.viewport),
      );
      return `<a class="mb-viewswitch-option" href="${escape(target)}">${label}</a>`;
    })
    .join("");
  return (
    `<div class="mb-cmp-toolbar">` +
    `<span class="mb-viewswitch" role="group" aria-label="Comparison mode">${modeButtons}</span>` +
    `<span class="mb-viewswitch" role="group" aria-label="Viewport">${viewportLinks}</span>` +
    `</div>`
  );
}

function paneMarkup(
  pagePath: string,
  artifactPath: string | undefined,
  label: string,
  missingMessage: string,
  tone: "added" | "neutral" | "removed",
  side: "after" | "before",
): string {
  const toneClass = tone === "neutral" ? "" : ` mb-pane-doc--${tone}`;
  if (!artifactPath) {
    return (
      `<div class="mb-pane mb-pane--${side}"><p class="mb-pane-label">${escape(label)}</p>` +
      `<div class="mb-pane-missing">${escape(missingMessage)}</div></div>`
    );
  }
  const link = relativeLink(pagePath, artifactPath);
  return (
    `<div class="mb-pane mb-pane--${side}"><p class="mb-pane-label">${escape(label)}</p>` +
    `<div class="mb-pane-doc${toneClass}"><iframe class="mb-frag" sandbox="" ` +
    `title="${escape(label)}" src="${escape(link)}"></iframe></div></div>`
  );
}

function badge(state: ReviewState): string {
  const label = state === "ignored-only" ? "Ignored only" : state;
  return `<span class="mb-badge mb-badge--${escape(state)}">${escape(label)}</span>`;
}

function baseline(baseRef: string): string {
  return (
    `<p class="mb-baseline"><span class="mb-baseline-dot" aria-hidden="true"></span>` +
    `Comparing this branch with <strong>${escape(baseRef)}</strong></p>`
  );
}

const MODE_SCRIPT =
  `<script>for(const button of document.querySelectorAll("[data-mode]"))` +
  `button.addEventListener("click",()=>{` +
  `document.querySelector(".mb-panes").dataset.compareMode=button.dataset.mode;` +
  `for(const other of document.querySelectorAll("[data-mode]"))` +
  `other.setAttribute("aria-pressed",other===button?"true":"false")})</script>`;

function relativeLink(from: string, to: string): string {
  const relative = path.posix.relative(path.posix.dirname(from), to);
  const encoded = encodeUrlPath(relative);
  return encoded.startsWith(".") ? encoded : `./${encoded}`;
}

function page(title: string, body: string): string {
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${escape(title)}</title>` +
    `<style>${SHELL_CSS}.mb-artifact-main{margin:0 auto;max-width:72rem;padding:1.25rem;display:flex;flex-direction:column;gap:.9rem}</style>` +
    `</head><body><main class="mb-artifact-main">${body}</main></body></html>\n`
  );
}

function escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
