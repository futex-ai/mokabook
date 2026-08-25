// Builds one navigation model from structured collection membership and a
// separate route-derived legacy tree. Stable ids own disclosure identity;
// display labels never act as structural keys.

import type { CatalogueHierarchy } from "../../registry/hierarchy.js";
import type {
  ManifestEntry,
  ManifestLegacyPage,
} from "../../registry/types.js";

/** A leaf navigation row linking to one viewable route. */
export interface NavLeafNode {
  entryId?: string;
  entryKind: "screen" | "use-case" | "page";
  key: string;
  kind: "leaf";
  label: string;
  route: string;
}

/** A collapsible navigation group with no destination of its own. */
export interface NavGroupNode {
  children: NavNode[];
  key: string;
  kind: "group";
  label: string;
}

/** One rendered navigation node. */
export type NavNode = NavGroupNode | NavLeafNode;

/** One breadcrumb segment, optionally linked to a real legacy Overview page. */
export interface CrumbLink {
  label: string;
  route?: string;
}

interface MutableLegacyGroup {
  groups: Map<string, MutableLegacyGroup>;
  key: string;
  label: string;
  leaves: NavLeafNode[];
}

interface LegacyPageDetails {
  groupSegments: readonly string[];
  label: string;
}

/** Build the nested navigation tree over structured entries and legacy pages. */
export function buildNavTree(
  hierarchy: CatalogueHierarchy<ManifestEntry>,
  legacyPages: readonly ManifestLegacyPage[],
): NavNode[] {
  const structured = hierarchy.roots.map((entry) =>
    structuredNode(entry, hierarchy, new Set()),
  );
  return sortNodes([...structured, ...legacyTree(legacyPages)]);
}

/** Derive text-only crumbs for a structured entry from its real ancestors. */
export function structuredCrumbTrail(
  hierarchy: CatalogueHierarchy<ManifestEntry>,
  entryId: string,
): CrumbLink[] {
  return (hierarchy.ancestorsById.get(entryId) ?? []).map((ancestor) => ({
    label: ancestor.title,
  }));
}

/** Derive legacy directory crumbs and link only real Overview pages. */
export function legacyCrumbTrail(
  pages: readonly ManifestLegacyPage[],
  activeRoute: string,
): CrumbLink[] {
  const directories = legacyDirectories(pages);
  const details = legacyPageDetails(activeRoute, directories);
  const overviewRoutes = new Map<string, string>();
  for (const page of pages) {
    const pageDetails = legacyPageDetails(page.route, directories);
    if (pageDetails.label === "Overview") {
      overviewRoutes.set(pageDetails.groupSegments.join("/"), page.route);
    }
  }
  return details.groupSegments.map((segment, index) => {
    const route = overviewRoutes.get(
      details.groupSegments.slice(0, index + 1).join("/"),
    );
    const label = titleCase(segment);
    return route && route !== activeRoute ? { label, route } : { label };
  });
}

/** Derive the displayed title for one legacy page route. */
export function legacyPageTitle(
  pages: readonly ManifestLegacyPage[],
  route: string,
): string {
  return legacyPageDetails(route, legacyDirectories(pages)).label;
}

function structuredNode(
  entry: ManifestEntry,
  hierarchy: CatalogueHierarchy<ManifestEntry>,
  ancestors: ReadonlySet<string>,
): NavNode {
  if (entry.kind !== "collection") {
    return {
      entryId: entry.id,
      entryKind: entry.kind,
      key: `entry:${entry.id}`,
      kind: "leaf",
      label: entry.title,
      route: entry.route,
    };
  }
  const visited = new Set(ancestors);
  visited.add(entry.id);
  const children = (hierarchy.childrenById.get(entry.id) ?? [])
    .filter((child) => !visited.has(child.id))
    .map((child) => structuredNode(child, hierarchy, visited));
  return {
    children: sortNodes(children),
    key: `collection:${entry.id}`,
    kind: "group",
    label: entry.title,
  };
}

function legacyTree(pages: readonly ManifestLegacyPage[]): NavNode[] {
  const root = newLegacyGroup("", "legacy:");
  const directories = legacyDirectories(pages);
  for (const page of pages) {
    const details = legacyPageDetails(page.route, directories);
    legacyGroupAt(root, details.groupSegments).leaves.push({
      entryKind: "page",
      key: `page:${page.route}`,
      kind: "leaf",
      label: details.label,
      route: page.route,
    });
  }
  return finalizeLegacyChildren(root);
}

function legacyDirectories(
  pages: readonly ManifestLegacyPage[],
): ReadonlySet<string> {
  return new Set(pages.flatMap((page) => parentPaths(page.route)));
}

function legacyPageDetails(
  route: string,
  directories: ReadonlySet<string>,
): LegacyPageDetails {
  const segments = route.split("/");
  const file = segments.pop() ?? route;
  const stem = file.replace(/\.html$/, "");
  const matchingDirectory = [...segments, stem].join("/");
  const isOverview = stem === "index" || directories.has(matchingDirectory);
  const groupSegments =
    isOverview && stem !== "index" ? [...segments, stem] : segments;
  const label =
    isOverview && groupSegments.length > 0
      ? "Overview"
      : titleCase(stem === "index" ? "home" : stem);
  return { groupSegments, label };
}

function parentPaths(route: string): string[] {
  const segments = route.split("/").slice(0, -1);
  return segments.map((_, index) => segments.slice(0, index + 1).join("/"));
}

function newLegacyGroup(label: string, key: string): MutableLegacyGroup {
  return { groups: new Map(), key, label, leaves: [] };
}

function legacyGroupAt(
  root: MutableLegacyGroup,
  segments: readonly string[],
): MutableLegacyGroup {
  let current = root;
  const path: string[] = [];
  for (const segment of segments) {
    path.push(segment);
    let next = current.groups.get(segment);
    if (!next) {
      next = newLegacyGroup(titleCase(segment), `legacy:${path.join("/")}`);
      current.groups.set(segment, next);
    }
    current = next;
  }
  return current;
}

function finalizeLegacyChildren(group: MutableLegacyGroup): NavNode[] {
  const children: NavNode[] = [...group.groups.values()].map((child) => ({
    children: finalizeLegacyChildren(child),
    key: child.key,
    kind: "group",
    label: child.label,
  }));
  return sortNodes([...children, ...group.leaves]);
}

function sortNodes(nodes: readonly NavNode[]): NavNode[] {
  return [...nodes].sort(
    (left, right) =>
      nodeRank(left) - nodeRank(right) ||
      left.label.localeCompare(right.label) ||
      left.key.localeCompare(right.key),
  );
}

function nodeRank(node: NavNode): number {
  if (
    node.kind === "leaf" &&
    node.entryKind === "page" &&
    node.label === "Overview"
  ) {
    return 0;
  }
  return node.kind === "group" ? 1 : 2;
}

/** Turn a kebab/underscore route segment into a display label. */
export function titleCase(value: string): string {
  return value
    .split(/[-_]/)
    .filter((word) => word.length > 0)
    .map((word) => (word[0] ?? "").toUpperCase() + word.slice(1))
    .join(" ");
}
