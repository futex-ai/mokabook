/** Main-view markup for the served Mokabook shell. */

import { encodeUrlPath } from "../../config/paths.js";
import type {
  ManifestEntry,
  ManifestLegacyPage,
  ManifestScreen,
  ManifestUseCase,
} from "../../registry/types.js";
import type { Catalogue } from "../catalogue.js";
import { escapeHtml } from "./html.js";

/** Render the catalogue home view. */
export function homeView(catalogue: Catalogue): string {
  const screens = catalogue.manifest.entries.filter(
    (entry) => entry.kind === "screen",
  );
  const useCases = catalogue.manifest.entries.filter(
    (entry) => entry.kind === "use-case",
  );
  const counts = [
    `${screens.length} ${screens.length === 1 ? "screen" : "screens"}`,
    `${useCases.length} ${useCases.length === 1 ? "use case" : "use cases"}`,
    ...(catalogue.manifest.legacyPages.length > 0
      ? [`${catalogue.manifest.legacyPages.length} legacy pages`]
      : []),
  ].join(" and ");
  const first = screens[0];
  const firstLink = first
    ? `<a class="mb-empty-link" href="/view/${escapeHtml(encodeUrlPath(first.route))}">Open the first screen</a>`
    : "";
  return (
    `<div class="mb-empty"><h1>Mokabook</h1>` +
    `<p>Browse the mockup catalogue. ${escapeHtml(counts)} are generated from this repository.</p>` +
    `${firstLink}</div>`
  );
}

/** Render a screen, use case, or legacy page view. */
export function entryView(
  entry: ManifestEntry | ManifestLegacyPage,
  catalogue: Catalogue,
): string {
  if (!("kind" in entry)) return legacyView(entry);
  if (entry.kind === "screen") return screenView(entry, catalogue);
  if (entry.kind === "use-case") return useCaseView(entry, catalogue);
  return missingView("Collections do not own a route");
}

/** Render the not-found main view. */
export function missingView(detail: string): string {
  return (
    `<div class="mb-empty"><h1>Screen not found</h1>` +
    `<p>Nothing in the catalogue matches <span class="mb-code">${escapeHtml(detail)}</span></p>` +
    `<a class="mb-empty-link" href="/">Go to the catalogue home</a></div>`
  );
}

/** Render the served Review launcher view. */
export function reviewLauncherView(base: string): string {
  return (
    `<p class="mb-baseline"><span class="mb-baseline-dot" aria-hidden="true"></span>` +
    `Comparing this branch with <strong>${escapeHtml(base)}</strong></p>` +
    `<div class="mb-empty"><h1>Mokabook review</h1>` +
    `<p>Generate the static comparison for this branch, then open its report:</p>` +
    `<p><span class="mb-code">mokabook review --base ${escapeHtml(base)}</span></p>` +
    `<a class="mb-empty-link" href="/">Browse the catalogue</a></div>`
  );
}

function screenView(entry: ManifestScreen, catalogue: Catalogue): string {
  const address = entry.address ?? entry.route;
  return (
    breadcrumbs(entry) +
    titleRow(entry.title, entry.address) +
    viewSwitch() +
    `<div class="mb-stage" data-mokabook-stage data-viewport="both">` +
    phoneFrame(address, entry.fragments.mobile, `${entry.title} mobile`) +
    browserFrame(address, entry.fragments.desktop, `${entry.title} desktop`) +
    `</div>` +
    detailsPanel(entry, catalogue)
  );
}

function useCaseView(entry: ManifestUseCase, catalogue: Catalogue): string {
  const steps = entry.steps
    .map((step, index) => {
      const screen = catalogue.byId.get(step.screenId);
      if (!screen || screen.kind !== "screen") return "";
      const address = screen.address ?? screen.route;
      const title = step.title ?? screen.title;
      return (
        `<li class="mb-step"><span class="mb-step-num" aria-hidden="true">${index + 1}</span>` +
        `<span class="mb-step-title">${escapeHtml(title)}</span>` +
        `<a class="mb-step-link" href="/view/${escapeHtml(encodeUrlPath(screen.route))}">Open standalone screen</a>` +
        (step.description
          ? `<p class="mb-review-foot">${escapeHtml(step.description)}</p>`
          : "") +
        `<div class="mb-stage" data-mokabook-stage data-viewport="both">` +
        phoneFrame(address, screen.fragments.mobile, `${title} mobile`) +
        browserFrame(address, screen.fragments.desktop, `${title} desktop`) +
        `</div></li>`
      );
    })
    .join("");
  return (
    breadcrumbs(entry) +
    titleRow(entry.title) +
    viewSwitch() +
    `<ol class="mb-steps">${steps}</ol>` +
    detailsPanel(entry, catalogue)
  );
}

function legacyView(page: ManifestLegacyPage): string {
  return (
    titleRow(page.route) +
    `<div class="mb-embed"><iframe class="mb-frag" sandbox="" ` +
    `title="Legacy mockup ${escapeHtml(page.route)}" ` +
    `src="/static/${escapeHtml(encodeUrlPath(page.route))}"></iframe></div>`
  );
}

function breadcrumbs(entry: ManifestEntry): string {
  const trail = [...entry.navPath, entry.title];
  const parts = trail
    .map((crumb, index) =>
      index < trail.length - 1
        ? `<span>${escapeHtml(crumb)} › </span>`
        : `<span aria-current="location">${escapeHtml(crumb)}</span>`,
    )
    .join("");
  return `<nav class="mb-breadcrumbs" aria-label="Catalogue location">${parts}</nav>`;
}

function titleRow(title: string, address?: string): string {
  return (
    `<div class="mb-title-row"><h1>${escapeHtml(title)}</h1>` +
    (address ? `<span class="mb-address">${escapeHtml(address)}</span>` : "") +
    `</div>`
  );
}

function viewSwitch(): string {
  const options = [
    ["mobile", "Mobile"],
    ["desktop", "Desktop"],
    ["both", "Both"],
  ] as const;
  const buttons = options
    .map(
      ([value, label]) =>
        `<button class="mb-viewswitch-option" type="button" data-viewport-option="${value}"` +
        ` aria-pressed="${value === "both" ? "true" : "false"}">${label}</button>`,
    )
    .join("");
  return (
    `<div class="mb-viewswitch" role="group" aria-label="Viewport" data-mokabook-viewswitch>` +
    `${buttons}</div>`
  );
}

function phoneFrame(address: string, fragment: string, title: string): string {
  return (
    `<figure class="mb-frame--mobile">` +
    `<figcaption class="mb-frame-label">Mobile</figcaption>` +
    `<div class="mb-phone"><div class="mb-phone-notch" aria-hidden="true"></div>` +
    `<p class="mb-frame-label">${escapeHtml(address)}</p>` +
    `<iframe class="mb-frag" sandbox="" title="${escapeHtml(title)}" ` +
    `src="/static/${escapeHtml(encodeUrlPath(fragment))}"></iframe>` +
    `</div></figure>`
  );
}

function browserFrame(
  address: string,
  fragment: string,
  title: string,
): string {
  return (
    `<figure class="mb-frame--desktop mb-pane">` +
    `<figcaption class="mb-frame-label">Desktop</figcaption>` +
    `<div class="mb-browser"><div class="mb-browser-bar">` +
    `<span class="mb-browser-dots" aria-hidden="true"><span></span><span></span><span></span></span>` +
    `<span class="mb-browser-address">${escapeHtml(address)}</span></div>` +
    `<iframe class="mb-frag" sandbox="" title="${escapeHtml(title)}" ` +
    `src="/static/${escapeHtml(encodeUrlPath(fragment))}"></iframe>` +
    `</div></figure>`
  );
}

function detailsPanel(
  entry: ManifestScreen | ManifestUseCase,
  catalogue: Catalogue,
): string {
  const usedBy =
    entry.kind === "screen"
      ? entry.useCaseIds
          .map((id) => catalogue.byId.get(id))
          .filter(
            (target): target is ManifestUseCase => target?.kind === "use-case",
          )
      : [];
  const sections = [
    section("Description", `<p>${escapeHtml(entry.description)}</p>`),
    entry.rationale
      ? section("Rationale", `<p>${escapeHtml(entry.rationale)}</p>`)
      : "",
    section("Source", codeItem(entry.sourcePath)),
    entry.kind === "screen"
      ? section(
          "Fragments",
          `<ul><li>${codeItem(entry.fragments.mobile)}</li><li>${codeItem(entry.fragments.desktop)}</li></ul>`,
        )
      : "",
    entry.relatedDocs.length > 0
      ? section(
          "Related docs",
          `<ul>${entry.relatedDocs.map((doc) => `<li>${codeItem(doc)}</li>`).join("")}</ul>`,
        )
      : "",
    entry.dependencies.length > 0
      ? section(
          "Dependencies",
          `<ul>${entry.dependencies.map((item) => `<li>${codeItem(item)}</li>`).join("")}</ul>`,
        )
      : "",
    usedBy.length > 0
      ? section(
          "Used by",
          `<ul>${usedBy
            .map(
              (target) =>
                `<li><a class="mb-chip-link" href="/id/${escapeHtml(encodeURIComponent(target.id))}">${escapeHtml(target.title)}</a></li>`,
            )
            .join("")}</ul>`,
        )
      : "",
  ].join("");
  return (
    `<details class="mb-details" data-mokabook-details><summary>Details` +
    `<span class="mb-details-hint">Description, source, related docs, and use cases</span>` +
    `</summary><div class="mb-details-body">${sections}</div></details>`
  );
}

function section(title: string, body: string): string {
  return `<div><h3>${escapeHtml(title)}</h3>${body}</div>`;
}

function codeItem(value: string): string {
  return `<span class="mb-code">${escapeHtml(value)}</span>`;
}
