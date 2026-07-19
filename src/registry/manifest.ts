import fs from "node:fs";
import path from "node:path";

import type { ResolvedRegistryEntry } from "../authoring/types.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError, errorMessage } from "../errors.js";
import { validateManifest } from "./manifest_validation.js";
import type { ManifestEntry, ManifestLegacyPage, ManifestV3 } from "./types.js";

/** Canonical generated manifest filename. */
export const MANIFEST_NAME = "mokabook-manifest.json";

/** Legacy version 2 manifest filename accepted only during migration. */
export const LEGACY_MANIFEST_NAME = "mockbook-manifest.json";

/** Derive one viewport fragment route from a screen route. */
export function fragmentRoute(
  route: string,
  viewport: "desktop" | "mobile",
): string {
  return route.replace(/\.html$/, `.${viewport}.html`);
}

/** Create deterministic manifest data from prepared entries and legacy pages. */
export function createManifest(
  entries: readonly ResolvedRegistryEntry[],
  legacyPages: readonly ManifestLegacyPage[],
): ManifestV3 {
  return {
    entries: entries.map(toManifestEntry),
    generatedBy: "mokabook",
    legacyPages: [...legacyPages].sort((left, right) =>
      left.route.localeCompare(right.route),
    ),
    schemaVersion: 3,
  };
}

/** Serialize a version 3 manifest byte-stably. */
export function serializeManifest(manifest: ManifestV3): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/** Read canonical output, falling back to the legacy v2 file only when absent. */
export function readManifest(config: ResolvedConfig): ManifestV3 {
  const canonicalPath = path.join(config.mockupsDir, MANIFEST_NAME);
  const selection = selectManifestInput(
    fs.existsSync(canonicalPath),
    config.compatibility.readManifestV2,
  );
  return readManifestFile(
    path.join(config.mockupsDir, selection.filename),
    selection.allowV2,
  );
}

/** Select the strict canonical input or the explicitly enabled legacy input. */
export function selectManifestInput(
  canonicalExists: boolean,
  allowLegacyV2: boolean,
): { allowV2: boolean; filename: string } {
  if (canonicalExists || !allowLegacyV2) {
    return { allowV2: false, filename: MANIFEST_NAME };
  }
  return { allowV2: true, filename: LEGACY_MANIFEST_NAME };
}

function readManifestFile(candidate: string, allowV2: boolean): ManifestV3 {
  let value: unknown;
  try {
    value = JSON.parse(fs.readFileSync(candidate, "utf8"));
  } catch (error) {
    throw new MokabookError(
      "manifest-invalid",
      `could not read ${candidate}: ${errorMessage(error)}`,
      {
        cause: error,
      },
    );
  }
  return parseManifest(value, allowV2);
}

/** Validate manifest-shaped JSON and normalize temporary version 2 input. */
export function parseManifest(value: unknown, allowV2 = false): ManifestV3 {
  return validateManifest(value, allowV2);
}

function toManifestEntry(entry: ResolvedRegistryEntry): ManifestEntry {
  const common = {
    dependencies: [
      ...new Set([entry.sourceRelativePath, ...entry.dependencies]),
    ].sort(),
    description: entry.description,
    id: entry.id,
    kind: entry.kind,
    navPath: [...entry.navPath],
    ...(entry.rationale ? { rationale: entry.rationale } : {}),
    relatedDocs: [...entry.relatedDocs],
    sourcePath: entry.sourceRelativePath,
    title: entry.title,
  };
  if (entry.kind === "collection")
    return { ...common, childIds: [...entry.childIds], kind: "collection" };
  if (entry.kind === "use-case") {
    return {
      ...common,
      kind: "use-case",
      route: entry.route,
      steps: entry.steps.map((step) => ({ ...step })),
    };
  }
  return {
    ...common,
    ...(entry.address ? { address: entry.address } : {}),
    fragments: {
      desktop: fragmentRoute(entry.route, "desktop"),
      mobile: fragmentRoute(entry.route, "mobile"),
    },
    kind: "screen",
    route: entry.route,
    useCaseIds: [...entry.useCaseIds],
    viewports: ["mobile", "desktop"],
  };
}
