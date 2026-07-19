import fs from "node:fs";
import path from "node:path";

import type { ResolvedRegistryEntry } from "../authoring/types.js";
import { isInside } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import type { RegistryViolation } from "./types.js";

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validate metadata, routes, source attribution, and declared paths. */
export function validateEntry(
  entry: ResolvedRegistryEntry,
  config: ResolvedConfig,
): RegistryViolation[] {
  const violations: RegistryViolation[] = [];
  for (const field of ["id", "title", "description"] as const) {
    if (!nonEmpty(entry[field])) {
      violations.push(
        problem(entry, "missing-metadata", `${field} is required`),
      );
    }
  }
  if (!ID_PATTERN.test(entry.id)) {
    violations.push(
      problem(entry, "invalid-id", "id must be globally unique kebab-case"),
    );
  }
  if (entry.__viaDefine !== true) {
    violations.push(
      problem(
        entry,
        "missing-helper",
        "entry must be created with a define helper",
      ),
    );
  }
  if (
    entry.sourceRelativePath === "<unattributed>" ||
    !isInside(config.entriesDir, entry.sourcePath)
  ) {
    violations.push(
      problem(
        entry,
        "invalid-source",
        "definition is not attributed to entriesDir",
      ),
    );
  }
  validateTextList(
    entry,
    "navPath",
    entry.navPath,
    entry.kind === "collection",
    violations,
  );
  validatePaths(entry, "relatedDocs", entry.relatedDocs, config, violations);
  validatePaths(entry, "dependencies", entry.dependencies, config, violations);
  if (entry.rationale !== undefined && !nonEmpty(entry.rationale)) {
    violations.push(
      problem(
        entry,
        "invalid-metadata",
        "rationale must be non-empty when supplied",
      ),
    );
  }
  if (entry.kind === "collection") {
    validateTextList(entry, "childIds", entry.childIds, false, violations);
  } else {
    validateRoute(entry, violations);
  }
  if (entry.kind === "screen") {
    if (entry.mobile === null || entry.mobile === undefined) {
      violations.push(
        problem(entry, "missing-render", "mobile render is required"),
      );
    }
    if (entry.desktop === null || entry.desktop === undefined) {
      violations.push(
        problem(entry, "missing-render", "desktop render is required"),
      );
    }
    validateTextList(entry, "useCaseIds", entry.useCaseIds, true, violations);
  }
  if (
    entry.kind === "use-case" &&
    (!Array.isArray(entry.steps) || entry.steps.length === 0)
  ) {
    violations.push(
      problem(entry, "missing-step", "use case needs at least one screen step"),
    );
  } else if (entry.kind === "use-case") {
    for (const [index, step] of entry.steps.entries()) {
      if (!record(step) || !nonEmpty(step.screenId)) {
        violations.push(
          problem(
            entry,
            "invalid-step",
            `step #${index + 1} needs a non-empty screenId`,
          ),
        );
        continue;
      }
      for (const field of ["title", "description"] as const) {
        if (step[field] !== undefined && !nonEmpty(step[field])) {
          violations.push(
            problem(
              entry,
              "invalid-step",
              `step #${index + 1} ${field} must be non-empty when supplied`,
            ),
          );
        }
      }
    }
  }
  return violations;
}

/** Create one source-attributed registry violation. */
export function problem(
  entry: ResolvedRegistryEntry,
  code: string,
  message: string,
): RegistryViolation {
  return {
    code,
    id: entry.id,
    message,
    sourceRelativePath: entry.sourceRelativePath,
  };
}

function validateRoute(
  entry: ResolvedRegistryEntry,
  violations: RegistryViolation[],
): void {
  const route = "route" in entry ? entry.route : "";
  const invalid =
    !nonEmpty(route) ||
    route.startsWith("/") ||
    route.includes("\\") ||
    route
      .split("/")
      .some((part) => part === "" || part === "." || part === "..") ||
    !route.endsWith(".html");
  if (invalid) {
    violations.push(
      problem(
        entry,
        "invalid-route",
        "route must be a safe relative .html path",
      ),
    );
  }
  if (entry.kind === "screen" && route.endsWith("/index.html")) {
    violations.push(
      problem(entry, "invalid-route", "screen routes must name the screen"),
    );
  }
  if (entry.kind === "use-case" && !route.startsWith("user-flows/")) {
    violations.push(
      problem(
        entry,
        "invalid-route",
        "use-case routes must live under user-flows/",
      ),
    );
  }
}

function validatePaths(
  entry: ResolvedRegistryEntry,
  field: "dependencies" | "relatedDocs",
  values: unknown,
  config: ResolvedConfig,
  violations: RegistryViolation[],
): void {
  if (!validateTextList(entry, field, values, true, violations)) return;
  for (const value of values) {
    const candidate = path.resolve(config.repoRoot, value);
    if (!isInside(config.repoRoot, candidate) || !fs.existsSync(candidate)) {
      violations.push(
        problem(
          entry,
          `missing-${field}`,
          `${field} path does not exist: ${value}`,
        ),
      );
    }
  }
}

function validateTextList(
  entry: ResolvedRegistryEntry,
  field: string,
  value: unknown,
  allowEmpty: boolean,
  violations: RegistryViolation[],
): value is readonly string[] {
  const invalid =
    !Array.isArray(value) ||
    (!allowEmpty && value.length === 0) ||
    !value.every(nonEmpty);
  if (invalid) {
    violations.push(
      problem(
        entry,
        "invalid-metadata",
        `${field} must be ${allowEmpty ? "an" : "a non-empty"} array of strings`,
      ),
    );
    return false;
  }
  return true;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
