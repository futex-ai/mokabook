import path from "node:path";

import type { JSXSource } from "react/jsx-dev-runtime";

import { exactKeys, invalidData } from "../components/data.js";
import type { ComponentSourceLocation } from "../components/manifest_types.js";
import { validateComponentSource } from "../components/source.js";
import { isInside, projectRealPath, toPosixPath } from "../config/paths.js";

/** Convert bundler coordinates to confined metadata without exposing checkout paths. */
export function normalizeComponentSource(
  source: JSXSource | undefined,
  workingDir: string,
  repoRoot: string,
): ComponentSourceLocation | undefined {
  if (source === undefined) return undefined;
  const at = "$source";
  exactKeys(source, ["fileName", "lineNumber", "columnNumber"], at);
  if (
    typeof source.fileName !== "string" ||
    !source.fileName ||
    source.fileName.includes("\\") ||
    source.fileName.includes("\0") ||
    (source.fileName.includes(":") && !path.isAbsolute(source.fileName))
  )
    invalidData(at, "invalid invocation source filename");
  const absolute = path.resolve(workingDir, source.fileName);
  if (
    !isInside(repoRoot, absolute) ||
    !isInside(projectRealPath(repoRoot), projectRealPath(absolute))
  )
    invalidData(at, "invocation source must stay inside repoRoot");
  const location = {
    path: toPosixPath(path.relative(repoRoot, absolute)),
    line: source.lineNumber,
    column: source.columnNumber,
  };
  validateComponentSource(location, at);
  return location;
}
