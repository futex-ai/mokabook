// Builds the Mokabook navigation tree. Structured entries nest through their
// collection membership (`childIds`), root entries group under their first
// navPath label, and legacy pages fall back to their route directories with
// title-cased labels. A hub page whose basename matches a sibling directory is
// folded into that group as its "Overview" leaf so the tree never shows the
// same label twice at one level.

import type {
  ManifestEntry,
  ManifestLegacyPage,
} from "../../registry/types.js";

/** A leaf navigation row linking to one viewable route. */
export interface NavLeafNode {
  entryKind: "screen" | "use-case" | "page";
  kind: "leaf";
  label: string;
  route: string;
}

/** A collapsible navigation group with no navigation destination of its own. */
export interface NavGroupNode {
  children: NavNode[];
  kind: "group";
  label: string;
}

/** One rendered navigation node. */
export type NavNode = NavGroupNode | NavLeafNode;

/**
 * One breadcrumb segment. `route` is set when that level has a viewable page
 * of its own — a legacy "Overview" leaf — so the breadcrumb can link up the
 * hierarchy. Structured collection levels resolve to `undefined` and render as
 * text.
 */
export interface CrumbLink {
  label: string;
  route?: string;
}

interface MutableGroup {
  groups: Map<string, MutableGroup>;
  label: string;
  leaves: NavLeafNode[];
}

/** Build the nested navigation tree over structured entries and legacy pages. */
export function buildNavTree(
  entries: readonly ManifestEntry[],
  legacyPages: readonly ManifestLegacyPage[],
): NavNode[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const claimed = new Set<string>();
  for (const entry of entries) {
    if (entry.kind !== "collection") continue;
    for (const childId of entry.childIds) claimed.add(childId);
  }
  const root = newGroup("");
  for (const entry of entries) {
    if (claimed.has(entry.id)) continue;
    const group = groupAt(root, [entry.navPath[0] ?? "Catalogue"]);
    placeEntry(group, entry, byId);
  }
  placeLegacyPages(root, legacyPages);
  return finalizeChildren(root);
}

/** Place one unclaimed entry (and, for collections, its subtree) in a group. */
function placeEntry(
  group: MutableGroup,
  entry: ManifestEntry,
  byId: ReadonlyMap<string, ManifestEntry>,
): void {
  if (entry.kind !== "collection") {
    group.leaves.push({
      entryKind: entry.kind,
      kind: "leaf",
      label: entry.title,
      route: entry.route,
    });
    return;
  }
  const nested = groupAt(group, [entry.title]);
  for (const childId of entry.childIds) {
    const child = byId.get(childId);
    if (child) placeEntry(nested, child, byId);
  }
}

function placeLegacyPages(
  root: MutableGroup,
  legacyPages: readonly ManifestLegacyPage[],
): void {
  const directories = new Set(
    legacyPages.flatMap((page) => parentPaths(page.route)),
  );
  for (const page of legacyPages) {
    const segments = page.route.split("/");
    const file = segments.pop() ?? page.route;
    const stem = file.replace(/\.html$/, "");
    const isOverview =
      stem === "index" || directories.has([...segments, stem].join("/"));
    const groupSegments =
      isOverview && stem !== "index" ? [...segments, stem] : segments;
    const label =
      isOverview && groupSegments.length > 0
        ? "Overview"
        : titleCase(stem === "index" ? "home" : stem);
    groupAt(root, groupSegments.map(titleCase)).leaves.push({
      entryKind: "page",
      kind: "leaf",
      label,
      route: page.route,
    });
  }
}

function parentPaths(route: string): string[] {
  const segments = route.split("/").slice(0, -1);
  return segments.map((_, index) => segments.slice(0, index + 1).join("/"));
}

function newGroup(label: string): MutableGroup {
  return { groups: new Map(), label, leaves: [] };
}

function groupAt(root: MutableGroup, labels: readonly string[]): MutableGroup {
  let current = root;
  for (const label of labels) {
    const key = label.toLowerCase();
    let next = current.groups.get(key);
    if (!next) {
      next = newGroup(label);
      current.groups.set(key, next);
    } else if (
      next.label !== label &&
      next.label === titleCase(next.label.toLowerCase())
    ) {
      next.label = label;
    }
    current = next;
  }
  return current;
}

function finalizeChildren(group: MutableGroup): NavNode[] {
  const overviewLeaves = group.leaves.filter(
    (leaf) => leaf.label === "Overview",
  );
  const normalLeaves = group.leaves
    .filter((leaf) => leaf.label !== "Overview")
    .sort((left, right) => left.label.localeCompare(right.label));
  const childGroups = [...group.groups.values()]
    .sort((left, right) => left.label.localeCompare(right.label))
    .map((child): NavGroupNode => ({
      children: finalizeChildren(child),
      kind: "group",
      label: child.label,
    }));
  return [...overviewLeaves, ...childGroups, ...normalLeaves];
}

/**
 * Resolve each level of a breadcrumb label path to the route a reader lands on
 * when clicking it. Reusing the navigation tree keeps the destinations honest:
 * a segment resolves to a route only when its group carries a legacy
 * "Overview" leaf, never a structural collection or invented target.
 */
export function resolveCrumbTrail(
  nodes: readonly NavNode[],
  labels: readonly string[],
): CrumbLink[] {
  const routes = crumbRouteMap(nodes);
  return labels.map((label, index) => {
    const route = routes.get(crumbKey(labels.slice(0, index + 1)));
    return route === undefined ? { label } : { label, route };
  });
}

const crumbRouteCache = new WeakMap<readonly NavNode[], Map<string, string>>();

/** Map each group's label path to the route its breadcrumb should link to. */
function crumbRouteMap(nodes: readonly NavNode[]): Map<string, string> {
  const cached = crumbRouteCache.get(nodes);
  if (cached) {
    return cached;
  }
  const routes = new Map<string, string>();
  collectCrumbRoutes(nodes, [], routes);
  crumbRouteCache.set(nodes, routes);
  return routes;
}

function collectCrumbRoutes(
  nodes: readonly NavNode[],
  prefix: readonly string[],
  routes: Map<string, string>,
): void {
  for (const node of nodes) {
    if (node.kind !== "group") {
      continue;
    }
    const trail = [...prefix, node.label];
    const key = crumbKey(trail);
    const route = overviewRoute(node);
    if (route !== undefined && !routes.has(key)) {
      routes.set(key, route);
    }
    collectCrumbRoutes(node.children, trail, routes);
  }
}

/** A legacy directory group's own page is its "Overview" leaf, when present. */
function overviewRoute(group: NavGroupNode): string | undefined {
  const overview = group.children.find(
    (child): child is NavLeafNode =>
      child.kind === "leaf" && child.label === "Overview",
  );
  return overview?.route;
}

function crumbKey(labels: readonly string[]): string {
  return labels.map((label) => label.toLowerCase()).join("/");
}

/** Turn a kebab/underscore route segment into a display label. */
export function titleCase(value: string): string {
  return value
    .split(/[-_]/)
    .filter((word) => word.length > 0)
    .map((word) => (word[0] ?? "").toUpperCase() + word.slice(1))
    .join(" ");
}
