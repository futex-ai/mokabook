import path from "node:path";

import { isInside, projectRealPath } from "./paths.js";

/** Package-owned historical builds never participate in consumer inputs or output. */
export const MOKLY_CACHE = ".mokly-cache";

/** Recognize both logical cache paths and public aliases of their physical targets. */
export function isBaselineCachePath(
  candidate: string,
  repoRoot: string,
): boolean {
  const root = path.join(repoRoot, MOKLY_CACHE);
  if (isInside(root, path.resolve(candidate))) return true;
  try {
    return isInside(projectRealPath(root), projectRealPath(candidate));
  } catch {
    return false;
  }
}
