/** Shared ownership boundary for rule-aware stylesheet attribution. */
import path from "node:path";

import { isInside } from "../../config/paths.js";
import { isPrivateStaticPath } from "../../config/public_files.js";
import type { ResolvedConfig } from "../../config/types.js";
import { isStylesheetPath } from "./stylesheet_path.js";

/** Only public stylesheets inside the rendered output root can be analysed. */
export function analysisOwnsStylesheet(
  repositoryPath: string,
  config: ResolvedConfig,
): boolean {
  if (!isStylesheetPath(repositoryPath)) return false;
  const candidate = path.resolve(config.repoRoot, repositoryPath);
  return (
    isInside(config.mockupsDir, candidate) &&
    !isPrivateStaticPath(candidate, config)
  );
}
