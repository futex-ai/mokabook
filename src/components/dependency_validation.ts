/** Declaration invariants apply before any rendered usage is available. */
import type { ManifestV5 } from "../registry/types.js";

import { canonicalJson, invalidData } from "./data.js";
import { sortedStrings } from "./validation_helpers.js";

export function validateDependencyDeclarations(
  entry: ManifestV5["entries"][number],
): void {
  sortedStrings(entry.declaredDependencies, `${entry.id}.declaredDependencies`);
  if (
    canonicalJson(entry.dependencies) !==
    canonicalJson(
      [...new Set([entry.sourcePath, ...entry.declaredDependencies])].sort(),
    )
  )
    invalidData(
      entry.id,
      "dependencies must retain exactly the declared paths and source attribution",
    );
  if (
    entry.kind === "component" &&
    !entry.ownedDependencies.every((dependency) =>
      entry.declaredDependencies.includes(dependency),
    )
  )
    invalidData(entry.id, "owned dependencies require an explicit declaration");
}
