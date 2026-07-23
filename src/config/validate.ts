import path from "node:path";

import { MokabookError } from "../errors.js";
import {
  resolveInside,
  validateCatalogueRoute,
  validateRelativeRoute,
} from "./paths.js";
import {
  optionalModule,
  requireDirectory,
  validateReviewOut,
  validateSourceRoots,
} from "./path_validation.js";
import { resolveModuleResolution } from "./module_resolution.js";
import {
  requireString,
  resolveLegacyLint,
  validateDebounce,
  validateLinkValidation,
  validateStringArray,
  validateStylesheets,
  validateWatchRules,
} from "./rules.js";
import type {
  LegacyConfig,
  MokabookConfig,
  ResolvedConfig,
  ResolvedLegacyConfig,
} from "./types.js";

/** Validate an imported config and resolve every filesystem path. */
export function resolveConfig(
  value: unknown,
  configPath: string,
): ResolvedConfig {
  if (!isRecord(value)) {
    throw new MokabookError(
      "config-invalid",
      `${configPath} must export an object`,
    );
  }
  const input = value as unknown as MokabookConfig;
  requireString(input.entriesDir, "entriesDir");
  requireString(input.mockupsDir, "mockupsDir");
  if (input.repoRoot !== undefined) requireString(input.repoRoot, "repoRoot");
  const configDir = path.dirname(configPath);
  const repoRoot = path.resolve(configDir, input.repoRoot ?? ".");
  requireDirectory(repoRoot, "repoRoot");
  const entriesDir = resolveInside(
    repoRoot,
    configDir,
    input.entriesDir,
    "entriesDir",
  );
  const mockupsDir = resolveInside(
    repoRoot,
    configDir,
    input.mockupsDir,
    "mockupsDir",
  );
  requireDirectory(entriesDir, "entriesDir");
  requireDirectory(mockupsDir, "mockupsDir");
  const renderer = optionalModule(
    repoRoot,
    configDir,
    input.renderer,
    "renderer",
  );
  const compatibilityTransformer = optionalModule(
    repoRoot,
    configDir,
    input.compatibility?.transformer,
    "compatibility.transformer",
  );
  const legacy = resolveLegacy(input.legacy, repoRoot, configDir);
  const moduleResolution = resolveModuleResolution(
    input.moduleResolution,
    repoRoot,
    configDir,
  );
  validateSourceRoots(repoRoot, entriesDir, mockupsDir, legacy?.pagesDir);
  const stylesheets = validateStylesheets(input.stylesheets ?? []);
  const linkValidation = validateLinkValidation(input.linkValidation);
  const watchRules = validateWatchRules(input.watch?.rules ?? []);
  if (input.review?.base !== undefined)
    requireString(input.review.base, "review.base");
  if (
    input.compatibility?.readManifestV2 !== undefined &&
    typeof input.compatibility.readManifestV2 !== "boolean"
  ) {
    throw new MokabookError(
      "config-invalid",
      "compatibility.readManifestV2 must be boolean",
    );
  }
  const reviewOut = resolveInside(
    repoRoot,
    configDir,
    input.review?.outDir ?? ".context/mokabook-review",
    "review.outDir",
  );
  validateReviewOut(reviewOut, {
    entriesDir,
    ...(legacy ? { legacy } : {}),
    mockupsDir,
    repoRoot,
  });
  return {
    compatibility: {
      readManifestV2: input.compatibility?.readManifestV2 ?? false,
      ...(compatibilityTransformer
        ? { transformer: compatibilityTransformer }
        : {}),
    },
    configPath,
    entriesDir,
    ...(legacy ? { legacy } : {}),
    linkValidation,
    mockupsDir,
    moduleResolution,
    ...(renderer ? { renderer } : {}),
    repoRoot,
    review: {
      base: input.review?.base ?? "origin/main",
      outDir: reviewOut,
      sharedImpact: validateStringArray(
        input.review?.sharedImpact ?? [],
        "review.sharedImpact",
      ).map((glob) => validateRelativeRoute(glob, "review.sharedImpact")),
    },
    stylesheets,
    watch: {
      debounceMs: validateDebounce(input.watch?.debounceMs),
      rules: watchRules,
    },
  };
}

function resolveLegacy(
  legacy: LegacyConfig | undefined,
  repoRoot: string,
  configDir: string,
): ResolvedLegacyConfig | undefined {
  if (!legacy) return undefined;
  requireString(legacy.pagesDir, "legacy.pagesDir");
  const pagesDir = resolveInside(
    repoRoot,
    configDir,
    legacy.pagesDir,
    "legacy.pagesDir",
  );
  requireDirectory(pagesDir, "legacy.pagesDir");
  const components = optionalModule(
    repoRoot,
    configDir,
    legacy.components,
    "legacy.components",
  );
  const routeAliases = Object.fromEntries(
    Object.entries(legacy.routeAliases ?? {}).map(([source, route]) => {
      requireString(route, `legacy.routeAliases.${source}`);
      return [
        validateRelativeRoute(source, "legacy.routeAliases source"),
        validateCatalogueRoute(route, "legacy.routeAliases route"),
      ];
    }),
  );
  const lint = resolveLegacyLint(legacy.lint);
  const exclude = validateStringArray(
    legacy.exclude ?? [],
    "legacy.exclude",
  ).map((glob) => validateRelativeRoute(glob, "legacy.exclude"));
  return {
    ...(components ? { components } : {}),
    ...(lint ? { lint } : {}),
    pagesDir,
    routeAliases,
    exclude,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
