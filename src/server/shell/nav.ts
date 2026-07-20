/** Catalogue navigation tree model and markup for the served shell. */

import { encodeUrlPath } from "../../config/paths.js";
import type { ManifestEntry, ManifestV3 } from "../../registry/types.js";
import { escapeHtml, type ShellContext } from "./html.js";

/** One rendered navigation node with resolved children. */
export interface NavNode {
  children: readonly NavNode[];
  entry: ManifestEntry;
}

/** One top-level navigation group derived from navPath roots. */
export interface NavGroup {
  label: string;
  nodes: readonly NavNode[];
}

/** Build deterministic navigation groups from the manifest. */
export function buildNavGroups(manifest: ManifestV3): NavGroup[] {
  const byId = new Map(manifest.entries.map((entry) => [entry.id, entry]));
  const childIds = new Set<string>();
  for (const entry of manifest.entries) {
    if (entry.kind !== "collection") continue;
    for (const childId of entry.childIds) childIds.add(childId);
  }
  const groups = new Map<string, NavNode[]>();
  for (const entry of manifest.entries) {
    if (childIds.has(entry.id)) continue;
    const label = entry.navPath[0] ?? "Catalogue";
    const nodes = groups.get(label) ?? [];
    nodes.push(buildNode(entry, byId));
    groups.set(label, nodes);
  }
  return [...groups.entries()].map(([label, nodes]) => ({ label, nodes }));
}

function buildNode(
  entry: ManifestEntry,
  byId: ReadonlyMap<string, ManifestEntry>,
): NavNode {
  if (entry.kind !== "collection") return { children: [], entry };
  const children = entry.childIds
    .map((childId) => byId.get(childId))
    .filter((child): child is ManifestEntry => child !== undefined)
    .map((child) => buildNode(child, byId));
  return { children, entry };
}

/** Render the catalogue navigation for Browse pages. */
export function catalogueNav(
  manifest: ManifestV3,
  context: ShellContext,
): string {
  const groups = buildNavGroups(manifest);
  const sections = groups
    .map(
      (group) =>
        `<section><h2 class="mb-nav-group">${escapeHtml(group.label)}</h2>` +
        `<ul>${group.nodes.map((node) => renderNode(node, context)).join("")}</ul></section>`,
    )
    .join("");
  const legacy = legacySection(manifest, context);
  return (
    `<nav class="mb-nav" id="mb-nav" aria-label="Catalogue" data-mokabook-nav>` +
    `${sections}${legacy}</nav>`
  );
}

function renderNode(node: NavNode, context: ShellContext): string {
  const { entry } = node;
  if (entry.kind === "collection") {
    const children = node.children
      .map((child) => renderNode(child, context))
      .join("");
    return (
      `<li><details open data-nav-collection="${escapeHtml(entry.id)}">` +
      `<summary class="mb-nav-row">` +
      `<span class="mb-caret mb-caret--folder" aria-hidden="true">▸</span>` +
      `${escapeHtml(entry.title)}</summary>` +
      `<ul>${children}</ul></details></li>`
    );
  }
  const icon = entry.kind === "use-case" ? "➔" : "▢";
  const active = entry.route === context.activeRoute;
  const changed = context.changedRoutes?.includes(entry.route) === true;
  return (
    `<li><a class="mb-nav-row" data-nav-row data-route="${escapeHtml(entry.route)}"` +
    `${changed ? ` data-changed="true"` : ""}` +
    ` href="/view/${escapeHtml(encodeUrlPath(entry.route))}"` +
    `${active ? ` aria-current="page"` : ""}>` +
    `<span class="mb-caret" aria-hidden="true">${icon}</span>` +
    `${escapeHtml(entry.title)}</a></li>`
  );
}

function legacySection(manifest: ManifestV3, context: ShellContext): string {
  if (manifest.legacyPages.length === 0) return "";
  const rows = manifest.legacyPages
    .map(
      (page) =>
        `<li><a class="mb-nav-row" data-nav-row data-route="${escapeHtml(page.route)}"` +
        ` href="/view/${escapeHtml(encodeUrlPath(page.route))}"` +
        `${page.route === context.activeRoute ? ` aria-current="page"` : ""}>` +
        `<span class="mb-caret" aria-hidden="true">▤</span>` +
        `${escapeHtml(page.route)}</a></li>`,
    )
    .join("");
  return `<section><h2 class="mb-nav-group">Legacy pages</h2><ul>${rows}</ul></section>`;
}
