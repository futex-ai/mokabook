import {
  componentFragmentPaths,
  validateManifestComponentUsage,
} from "../components/manifest_validation.js";
import { MokabookError } from "../errors.js";
import { isCatalogueId } from "../navigation/logical.js";
import { validateEntry, validateCurrentFields } from "./manifest_entries.js";
import { validateManifestRelationships } from "./manifest_relationships.js";
import {
  record,
  stringArray,
  validateRepoPath,
  validateRoute,
} from "./manifest_values.js";
import type { HistoricalManifest } from "./types.js";

/** Validate unknown manifest JSON and normalize temporary schema version 2. */
export function validateManifest(
  value: unknown,
  allowV2: boolean,
  historical = false,
): HistoricalManifest {
  const manifest = validateManifestMetadata(value, allowV2, historical);
  validateManifestComponentUsage(manifest);
  return manifest;
}

/** Shared metadata validation; only the live index omits rendered-view validation. */
export function validateManifestMetadata(
  value: unknown,
  allowV2 = false,
  historical = false,
): HistoricalManifest {
  if (!record(value) || !Array.isArray(value.entries))
    throw new MokabookError(
      "manifest-invalid",
      "manifest must contain an entries array",
    );
  const normalized =
    value.schemaVersion === 2 && allowV2 && historical
      ? { ...value, generatedBy: "mokabook", schemaVersion: 3 }
      : value;
  const current = normalized.schemaVersion === 5;
  const pages =
    current || (normalized.schemaVersion === 4 && "sourceFiles" in normalized);
  if (
    (!current &&
      !(historical && [3, 4].includes(normalized.schemaVersion as number))) ||
    normalized.generatedBy !== "mokabook"
  )
    throw new MokabookError(
      "manifest-invalid",
      "expected Mokabook manifest schema version 5; run mokabook build",
    );
  if (pages) {
    if (
      Object.keys(normalized).some(
        (key) =>
          !["entries", "generatedBy", "schemaVersion", "sourceFiles"].includes(
            key,
          ),
      )
    )
      throw new MokabookError("manifest-invalid", "unexpected manifest field");
    if (
      !stringArray(normalized.sourceFiles) ||
      JSON.stringify(normalized.sourceFiles) !==
        JSON.stringify([...new Set(normalized.sourceFiles)].sort())
    )
      throw new MokabookError(
        "manifest-invalid",
        "sourceFiles must be a sorted unique array",
      );
    for (const source of normalized.sourceFiles)
      validateRepoPath(source, "sourceFiles");
  } else if (!Array.isArray(normalized.legacyPages))
    throw new MokabookError(
      "manifest-invalid",
      "historical manifest needs legacyPages",
    );
  const entries: Record<string, unknown>[] = [];
  const byId = new Map<string, Record<string, unknown>>();
  const routes = new Set<string>();
  for (const rawEntry of value.entries) {
    if (
      !record(rawEntry) ||
      typeof rawEntry.id !== "string" ||
      typeof rawEntry.kind !== "string"
    ) {
      throw new MokabookError(
        "manifest-invalid",
        "every manifest entry needs string id and kind",
      );
    }
    const entry = rawEntry;
    const id = rawEntry.id;
    if (!isCatalogueId(id)) {
      throw new MokabookError("manifest-invalid", `invalid manifest id: ${id}`);
    }
    if (pages) {
      validateCurrentFields(entry, current);
      if (
        !(normalized.sourceFiles as string[]).includes(
          entry.sourcePath as string,
        )
      )
        throw new MokabookError(
          "manifest-invalid",
          `sourceFiles omits ${String(entry.sourcePath)}`,
        );
    } else if (entry.kind === "page")
      throw new MokabookError(
        "manifest-invalid",
        "pages require the registered-page manifest format",
      );
    validateEntry(entry, current || (normalized.schemaVersion === 4 && !pages));
    if (byId.has(id)) {
      throw new MokabookError(
        "manifest-invalid",
        `duplicate manifest id: ${id}`,
      );
    }
    entries.push(entry);
    byId.set(id, entry);
    if (entry.kind !== "collection") {
      if (typeof entry.route !== "string" || routes.has(entry.route)) {
        throw new MokabookError(
          "manifest-invalid",
          `invalid or duplicate manifest route for ${entry.id}`,
        );
      }
      routes.add(entry.route);
    }
  }
  const outputRoutes = validateFragmentRoutes(entries, routes);
  if (!pages)
    validateLegacyPages(normalized.legacyPages as unknown[], outputRoutes);
  validateManifestRelationships(entries, byId);
  const manifest = normalized as unknown as HistoricalManifest;
  return manifest;
}

function validateFragmentRoutes(
  entries: readonly Record<string, unknown>[],
  routedEntries: ReadonlySet<string>,
): Set<string> {
  const outputRoutes = new Set(routedEntries);
  for (const entry of entries) {
    if (entry.kind === "component") {
      for (const fragment of componentFragmentPaths(entry)) {
        if (outputRoutes.has(fragment))
          throw new MokabookError(
            "manifest-invalid",
            `colliding component fragment: ${fragment}`,
          );
        outputRoutes.add(fragment);
      }
      continue;
    }
    if (entry.kind !== "screen" || !record(entry.fragments)) continue;
    for (const viewport of ["mobile", "desktop"] as const) {
      const fragment = entry.fragments[viewport] as string;
      const expected = (entry.route as string).replace(
        /\.html$/,
        `.${viewport}.html`,
      );
      if (fragment !== expected || outputRoutes.has(fragment)) {
        throw new MokabookError(
          "manifest-invalid",
          `${String(entry.id)} has invalid or colliding ${viewport} fragment`,
        );
      }
      outputRoutes.add(fragment);
    }
    if (!record(entry.darkFragments)) continue;
    for (const viewport of ["mobile", "desktop"] as const) {
      const fragment = entry.darkFragments[viewport] as string;
      const expected = (entry.route as string).replace(
        /\.html$/,
        `.${viewport}.dark.html`,
      );
      if (fragment !== expected || outputRoutes.has(fragment)) {
        throw new MokabookError(
          "manifest-invalid",
          `${String(entry.id)} has invalid or colliding ${viewport} dark fragment`,
        );
      }
      outputRoutes.add(fragment);
    }
  }
  return outputRoutes;
}

function validateLegacyPages(pages: unknown[], routes: Set<string>): void {
  for (const page of pages) {
    if (
      !record(page) ||
      typeof page.route !== "string" ||
      typeof page.sourcePath !== "string"
    ) {
      throw new MokabookError(
        "manifest-invalid",
        "every legacy page needs route and sourcePath",
      );
    }
    validateRoute(page.route, "legacy page");
    validateRepoPath(page.sourcePath, "legacy page sourcePath");
    if (routes.has(page.route)) {
      throw new MokabookError(
        "manifest-invalid",
        `duplicate manifest route: ${page.route}`,
      );
    }
    routes.add(page.route);
  }
}
