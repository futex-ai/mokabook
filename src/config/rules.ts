import { MokabookError } from "../errors.js";
import { validateCatalogueRoute, validateRelativeRoute } from "./paths.js";
import type { LegacyConfig, StylesheetRule, WatchRule } from "./types.js";

const WATCH_ACTIONS = new Set(["ignore", "rebuild", "reload", "restart"]);

/** Normalize configured legacy lint policy. */
export function resolveLegacyLint(
  lint: LegacyConfig["lint"],
): LegacyConfig["lint"] {
  if (!lint) return undefined;
  const allowRoutes = validateStringArray(
    lint.allowRoutes ?? [],
    "legacy.lint.allowRoutes",
  ).map((route) => validateCatalogueRoute(route, "legacy.lint.allowRoutes"));
  if (
    lint.maxScreensPerPage !== undefined &&
    (!Number.isInteger(lint.maxScreensPerPage) ||
      lint.maxScreensPerPage < 1 ||
      lint.maxScreensPerPage > 100)
  ) {
    throw new MokabookError(
      "config-invalid",
      "legacy.lint.maxScreensPerPage must be an integer from 1 to 100",
    );
  }
  if (
    lint.requireStageIds !== undefined &&
    typeof lint.requireStageIds !== "boolean"
  ) {
    throw new MokabookError(
      "config-invalid",
      "legacy.lint.requireStageIds must be boolean",
    );
  }
  return {
    allowRoutes,
    ...(lint.maxScreensPerPage !== undefined
      ? { maxScreensPerPage: lint.maxScreensPerPage }
      : {}),
    ...(lint.requireStageIds !== undefined
      ? { requireStageIds: lint.requireStageIds }
      : {}),
  };
}

/** Validate ordered route-to-stylesheet rules. */
export function validateStylesheets(
  rules: readonly StylesheetRule[],
): StylesheetRule[] {
  if (!Array.isArray(rules)) {
    throw new MokabookError("config-invalid", "stylesheets must be an array");
  }
  const seen = new Set<string>();
  return rules.map((rawRule, index) => {
    if (!record(rawRule)) {
      throw new MokabookError(
        "config-invalid",
        `stylesheets[${index}] must be an object`,
      );
    }
    const rule = rawRule as unknown as StylesheetRule;
    requireString(rule.match, `stylesheets[${index}].match`);
    if (seen.has(rule.match)) {
      throw new MokabookError(
        "config-invalid",
        `duplicate stylesheet match: ${rule.match}`,
      );
    }
    seen.add(rule.match);
    if (!Array.isArray(rule.stylesheets)) {
      throw new MokabookError(
        "config-invalid",
        `stylesheets[${index}].stylesheets must be an array`,
      );
    }
    return {
      match: rule.match,
      stylesheets: rule.stylesheets.map((stylesheet: string) => {
        requireString(stylesheet, `stylesheets[${index}] path`);
        return /^https?:\/\//.test(stylesheet)
          ? stylesheet
          : validateRelativeRoute(stylesheet, `stylesheets[${index}] path`);
      }),
    };
  });
}

/** Validate explicit watch classifications and reject ambiguity. */
export function validateWatchRules(rules: readonly WatchRule[]): WatchRule[] {
  if (!Array.isArray(rules)) {
    throw new MokabookError("config-invalid", "watch.rules must be an array");
  }
  const seen = new Set<string>();
  return rules.map((rawRule, index) => {
    if (!record(rawRule)) {
      throw new MokabookError(
        "config-invalid",
        `watch.rules[${index}] must be an object`,
      );
    }
    const rule = rawRule as unknown as WatchRule;
    if (!WATCH_ACTIONS.has(rule.action)) {
      throw new MokabookError(
        "config-invalid",
        `watch.rules[${index}] has invalid action`,
      );
    }
    if (!Array.isArray(rule.paths) || rule.paths.length === 0) {
      throw new MokabookError(
        "config-invalid",
        `watch.rules[${index}].paths must not be empty`,
      );
    }
    const paths = rule.paths.map((glob: string) => {
      requireString(glob, `watch.rules[${index}] path`);
      return validateRelativeRoute(glob, `watch.rules[${index}] path`);
    });
    for (const glob of paths) {
      if (seen.has(glob)) {
        throw new MokabookError(
          "config-invalid",
          `duplicate watch path: ${glob}`,
        );
      }
      seen.add(glob);
    }
    return { action: rule.action, paths };
  });
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Normalize and bound the watch debounce duration. */
export function validateDebounce(value: number | undefined): number {
  const debounce = value ?? 75;
  if (!Number.isInteger(debounce) || debounce < 0 || debounce > 10_000) {
    throw new MokabookError(
      "config-invalid",
      "watch.debounceMs must be an integer from 0 to 10000",
    );
  }
  return debounce;
}

/** Require a non-empty string while narrowing runtime input. */
export function requireString(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new MokabookError(
      "config-invalid",
      `${label} must be a non-empty string`,
    );
  }
}

/** Validate a config list whose members must be non-empty strings. */
export function validateStringArray(
  value: readonly string[],
  label: string,
): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string" && item.trim().length > 0)
  ) {
    throw new MokabookError(
      "config-invalid",
      `${label} must be an array of non-empty strings`,
    );
  }
  return [...value];
}
