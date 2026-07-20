import type { ResolvedRegistryEntry, Viewport } from "../authoring/types.js";

/** One actionable catalogue validation failure. */
export interface RegistryViolation {
  code: string;
  id?: string;
  message: string;
  sourceRelativePath: string;
}

/** A prepared and cross-reference-validated registry. */
export interface PreparedRegistry {
  entries: readonly ResolvedRegistryEntry[];
  byId: ReadonlyMap<string, ResolvedRegistryEntry>;
}

/** Serializable common metadata for a manifest entry. */
export interface ManifestEntryBase {
  dependencies: readonly string[];
  description: string;
  id: string;
  kind: "collection" | "screen" | "use-case";
  navPath: readonly string[];
  rationale?: string;
  relatedDocs: readonly string[];
  sourcePath: string;
  title: string;
}

/** Serializable screen manifest entry. */
export interface ManifestScreen extends ManifestEntryBase {
  address?: string;
  fragments: Record<Viewport, string>;
  kind: "screen";
  route: string;
  useCaseIds: readonly string[];
  viewports: readonly Viewport[];
}

/** Serializable collection manifest entry. */
export interface ManifestCollection extends ManifestEntryBase {
  childIds: readonly string[];
  kind: "collection";
}

/** Serializable use-case manifest entry. */
export interface ManifestUseCase extends ManifestEntryBase {
  kind: "use-case";
  route: string;
  steps: readonly { description?: string; screenId: string; title?: string }[];
}

/** Any version 3 entry. */
export type ManifestEntry =
  ManifestScreen | ManifestCollection | ManifestUseCase;

/** One generated legacy page. */
export interface ManifestLegacyPage {
  route: string;
  sourcePath: string;
}

/** Canonical generated catalogue schema. */
export interface ManifestV3 {
  entries: readonly ManifestEntry[];
  generatedBy: "mokabook";
  legacyPages: readonly ManifestLegacyPage[];
  schemaVersion: 3;
}
