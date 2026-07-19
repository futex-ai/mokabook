import { MokabookError } from "../errors.js";
import { isSafeRepositoryPath } from "../config/paths.js";
import { validateManifestRelationships } from "./manifest_relationships.js";
import type { ManifestV3 } from "./types.js";

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validate unknown manifest JSON and normalize temporary schema version 2. */
export function validateManifest(value: unknown, allowV2: boolean): ManifestV3 {
  if (
    !record(value) ||
    !Array.isArray(value.entries) ||
    !Array.isArray(value.legacyPages)
  ) {
    throw new MokabookError(
      "manifest-invalid",
      "manifest must contain entries and legacyPages arrays",
    );
  }
  const normalized =
    value.schemaVersion === 2 && allowV2
      ? { ...value, generatedBy: "mokabook", schemaVersion: 3 }
      : value;
  if (normalized.schemaVersion !== 3 || normalized.generatedBy !== "mokabook") {
    throw new MokabookError(
      "manifest-invalid",
      "expected Mokabook manifest schema version 3",
    );
  }
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
    if (!ID_PATTERN.test(id)) {
      throw new MokabookError("manifest-invalid", `invalid manifest id: ${id}`);
    }
    validateEntry(entry);
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
  validateLegacyPages(value.legacyPages, outputRoutes);
  validateManifestRelationships(entries, byId);
  return normalized as unknown as ManifestV3;
}

function validateEntry(entry: Record<string, unknown>): void {
  const kind = entry.kind;
  if (kind !== "collection" && kind !== "screen" && kind !== "use-case") {
    throw new MokabookError(
      "manifest-invalid",
      `invalid manifest kind for ${String(entry.id)}`,
    );
  }
  for (const field of ["title", "description", "sourcePath"] as const) {
    if (typeof entry[field] !== "string" || entry[field].length === 0) {
      throw new MokabookError(
        "manifest-invalid",
        `${String(entry.id)} is missing ${field}`,
      );
    }
  }
  validateRepoPath(
    entry.sourcePath as string,
    `${String(entry.id)} sourcePath`,
  );
  if (entry.rationale !== undefined && !nonEmptyString(entry.rationale)) {
    throw new MokabookError(
      "manifest-invalid",
      `${String(entry.id)} has invalid rationale`,
    );
  }
  for (const field of ["navPath", "relatedDocs", "dependencies"] as const) {
    if (!stringArray(entry[field])) {
      throw new MokabookError(
        "manifest-invalid",
        `${String(entry.id)} has invalid ${field}`,
      );
    }
  }
  for (const field of ["relatedDocs", "dependencies"] as const) {
    for (const value of entry[field] as string[]) {
      validateRepoPath(value, `${String(entry.id)} ${field}`);
    }
  }
  if (kind === "collection") {
    if (!stringArray(entry.childIds)) {
      throw new MokabookError(
        "manifest-invalid",
        `${String(entry.id)} has invalid childIds`,
      );
    }
    return;
  }
  if (typeof entry.route !== "string") {
    throw new MokabookError(
      "manifest-invalid",
      `${String(entry.id)} has no route`,
    );
  }
  validateRoute(entry.route, String(entry.id));
  if (kind === "screen") validateScreen(entry);
  else validateUseCase(entry);
}

function validateScreen(entry: Record<string, unknown>): void {
  if (!record(entry.fragments)) {
    throw new MokabookError(
      "manifest-invalid",
      `${String(entry.id)} has no fragments`,
    );
  }
  for (const viewport of ["mobile", "desktop"] as const) {
    const fragment = entry.fragments[viewport];
    if (typeof fragment !== "string") {
      throw new MokabookError(
        "manifest-invalid",
        `${String(entry.id)} has no ${viewport} fragment`,
      );
    }
    validateRoute(fragment, `${String(entry.id)} ${viewport} fragment`);
  }
  if (!stringArray(entry.useCaseIds)) {
    throw new MokabookError(
      "manifest-invalid",
      `${String(entry.id)} has invalid useCaseIds`,
    );
  }
  if (
    !Array.isArray(entry.viewports) ||
    entry.viewports.length !== 2 ||
    entry.viewports[0] !== "mobile" ||
    entry.viewports[1] !== "desktop"
  ) {
    throw new MokabookError(
      "manifest-invalid",
      `${String(entry.id)} has invalid viewports`,
    );
  }
  if (entry.address !== undefined && !nonEmptyString(entry.address)) {
    throw new MokabookError(
      "manifest-invalid",
      `${String(entry.id)} has invalid address`,
    );
  }
}

function validateUseCase(entry: Record<string, unknown>): void {
  if (!Array.isArray(entry.steps) || entry.steps.length === 0) {
    throw new MokabookError(
      "manifest-invalid",
      `${String(entry.id)} has invalid steps`,
    );
  }
  for (const [index, step] of entry.steps.entries()) {
    if (!record(step) || !nonEmptyString(step.screenId)) {
      throw new MokabookError(
        "manifest-invalid",
        `${String(entry.id)} step #${index + 1} has invalid screenId`,
      );
    }
    for (const field of ["title", "description"] as const) {
      if (step[field] !== undefined && !nonEmptyString(step[field])) {
        throw new MokabookError(
          "manifest-invalid",
          `${String(entry.id)} step #${index + 1} has invalid ${field}`,
        );
      }
    }
  }
}

function validateFragmentRoutes(
  entries: readonly Record<string, unknown>[],
  routedEntries: ReadonlySet<string>,
): Set<string> {
  const outputRoutes = new Set(routedEntries);
  for (const entry of entries) {
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

function validateRoute(route: string, label: string): void {
  if (
    route === "" ||
    route.startsWith("/") ||
    route.includes("\\") ||
    route
      .split("/")
      .some((part) => part === "" || part === "." || part === "..") ||
    !route.endsWith(".html")
  ) {
    throw new MokabookError("manifest-invalid", `${label} has an unsafe route`);
  }
}

function stringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.length > 0)
  );
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function validateRepoPath(value: string, label: string): void {
  if (!isSafeRepositoryPath(value)) {
    throw new MokabookError(
      "manifest-invalid",
      `${label} must be a safe repository-relative path`,
    );
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
