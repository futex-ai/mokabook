import fs from "node:fs";
import path from "node:path";

import type { ResolvedConfig } from "../config/types.js";
import { MokabookError } from "../errors.js";
import type { Compilation } from "./compile.js";
import { pendingGeneratedOrphanRoutes } from "./ownership.js";

/** Compare expected bytes with committed output without writing anything. */
export function checkCompilation(
  compilation: Compilation,
  config: ResolvedConfig,
): void {
  const missing: string[] = [];
  const stale: string[] = [];
  for (const [route, expected] of compilation.outputs) {
    const target = path.join(config.mockupsDir, route);
    if (!fs.existsSync(target)) {
      missing.push(route);
    } else if (fs.readFileSync(target, "utf8") !== expected) {
      stale.push(route);
    }
  }
  const orphan = pendingGeneratedOrphanRoutes(
    config,
    compilation.outputs.keys(),
  );
  if (missing.length === 0 && stale.length === 0 && orphan.length === 0) return;
  const groups = [
    formatGroup("missing generated files", missing),
    formatGroup("stale generated files", stale),
    formatGroup("orphan generated files", orphan),
  ].filter(Boolean);
  throw new MokabookError(
    "build-invalid",
    `committed output does not match source; run mokabook build:\n${groups.join("\n")}`,
  );
}

function formatGroup(title: string, routes: readonly string[]): string {
  if (routes.length === 0) return "";
  return `${title}:\n${[...routes]
    .sort()
    .map((route) => `  - ${route}`)
    .join("\n")}`;
}
