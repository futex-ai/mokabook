import type {
  ManifestEntry,
  ManifestLegacyPage,
  ManifestV3,
} from "../registry/types.js";

/** Validated lookup model used by server routes. */
export interface Catalogue {
  byId: ReadonlyMap<string, ManifestEntry>;
  byRoute: ReadonlyMap<string, ManifestEntry | ManifestLegacyPage>;
  /** Whether any screen in the catalogue was rendered in the dark scheme. */
  hasDarkFragments: boolean;
  manifest: ManifestV3;
}

/** Build deterministic id and route indexes from a validated manifest. */
export function createCatalogue(manifest: ManifestV3): Catalogue {
  const byId = new Map(manifest.entries.map((entry) => [entry.id, entry]));
  const byRoute = new Map<string, ManifestEntry | ManifestLegacyPage>();
  for (const entry of manifest.entries) {
    if (entry.kind !== "collection") byRoute.set(entry.route, entry);
  }
  for (const page of manifest.legacyPages) byRoute.set(page.route, page);
  const hasDarkFragments = manifest.entries.some(
    (entry) => entry.kind === "screen" && entry.darkFragments !== undefined,
  );
  return { byId, byRoute, hasDarkFragments, manifest };
}
