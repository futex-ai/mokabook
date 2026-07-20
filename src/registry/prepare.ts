import path from "node:path";

import type {
  RegistryDefinition,
  ResolvedRegistryEntry,
} from "../authoring/types.js";
import { toPosixPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError } from "../errors.js";
import { validateEntry } from "./entry_validation.js";
import {
  crossReferenceViolations,
  duplicateViolations,
} from "./relationships.js";
import type { PreparedRegistry, RegistryViolation } from "./types.js";

/** Validate loaded values and prepare stable source-attributed entries. */
export function prepareRegistry(
  values: readonly unknown[],
  config: ResolvedConfig,
): PreparedRegistry {
  const violations: RegistryViolation[] = [];
  const entries: ResolvedRegistryEntry[] = [];
  values.forEach((value, index) => {
    if (!isDefinition(value)) {
      violations.push({
        code: "invalid-definition",
        message: `exported definition #${index + 1} is not a registry definition`,
        sourceRelativePath: toPosixPath(
          path.relative(config.repoRoot, config.entriesDir),
        ),
      });
      return;
    }
    const sourceRelativePath = value.definedIn ?? "<unattributed>";
    const sourcePath = path.resolve(config.repoRoot, sourceRelativePath);
    const entry = {
      ...value,
      sourcePath,
      sourceRelativePath,
    } as ResolvedRegistryEntry;
    entries.push(entry);
    violations.push(...validateEntry(entry, config));
  });
  entries.sort(compareEntries);
  violations.push(
    ...duplicateViolations(entries, "id"),
    ...duplicateViolations(entries, "route"),
    ...crossReferenceViolations(entries),
  );
  if (entries.length === 0) {
    violations.push({
      code: "empty-registry",
      message: "no registry definitions were exported",
      sourceRelativePath: toPosixPath(
        path.relative(config.repoRoot, config.entriesDir),
      ),
    });
  }
  if (violations.length > 0) throw invalidRegistry(violations);
  return { byId: new Map(entries.map((entry) => [entry.id, entry])), entries };
}

function isDefinition(value: unknown): value is RegistryDefinition {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const kind = (value as { kind?: unknown }).kind;
  return kind === "screen" || kind === "collection" || kind === "use-case";
}

function compareEntries(
  left: ResolvedRegistryEntry,
  right: ResolvedRegistryEntry,
): number {
  const leftRoute = left.kind === "collection" ? "" : left.route;
  const rightRoute = right.kind === "collection" ? "" : right.route;
  return leftRoute.localeCompare(rightRoute) || left.id.localeCompare(right.id);
}

function invalidRegistry(
  violations: readonly RegistryViolation[],
): MokabookError {
  const ordered = [...violations].sort((left, right) =>
    `${left.code}:${left.sourceRelativePath}:${left.message}`.localeCompare(
      `${right.code}:${right.sourceRelativePath}:${right.message}`,
    ),
  );
  return new MokabookError(
    "build-invalid",
    `catalogue is invalid:\n${ordered.map((item) => `- [${item.code}] ${item.sourceRelativePath}${item.id ? ` (${item.id})` : ""}: ${item.message}`).join("\n")}`,
  );
}
