import type { ManifestComponent } from "../components/manifest_types.js";
import type { CatalogueMetadata } from "./catalogue_index.js";
import { analyzeHierarchy } from "./hierarchy.js";
import type {
  ManifestEntry,
  HistoricalManifest,
  ManifestPage,
  ManifestScreen,
} from "./types.js";

/** Baseline context retained independently of current collection membership. */
export interface RemovedEntrySnapshot {
  entry: ManifestPage | ManifestScreen | ManifestComponent;
  ancestors: readonly { id: string; title: string }[];
}

/** One pinned generation shared by Browse, watched updates and publication. */
export interface CatalogueChangeSnapshot {
  schemaVersion: 1;
  baseRef: string;
  baseCommit: string;
  changedRoutes: readonly string[];
  removedEntries: readonly RemovedEntrySnapshot[];
}

/** Only a free old route retains a baseline leaf; current ids and routes always win. */
export function removedManifestEntries(
  manifest: CatalogueMetadata,
  baseline: HistoricalManifest,
): RemovedEntrySnapshot[] {
  const routes = new Set(
    manifest.entries.flatMap((entry) =>
      entry.kind === "collection" ? [] : [entry.route],
    ),
  );
  const ids = new Set(manifest.entries.map((entry) => entry.id));
  const hierarchy = analyzeHierarchy<ManifestEntry>(baseline.entries).hierarchy;
  return baseline.entries
    .flatMap((entry): RemovedEntrySnapshot[] =>
      (entry.kind === "page" ||
        entry.kind === "screen" ||
        (entry.kind === "component" && !ids.has(entry.id))) &&
      !routes.has(entry.route)
        ? [
            {
              entry,
              ancestors: (hierarchy.ancestorsById.get(entry.id) ?? []).map(
                ({ id, title }) => ({ id, title }),
              ),
            },
          ]
        : [],
    )
    .sort(
      (a, b) =>
        a.entry.route.localeCompare(b.entry.route) ||
        a.entry.id.localeCompare(b.entry.id),
    );
}
