import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { MokabookError, errorMessage } from "../errors.js";

/** Load the allowlisted browser modules before the HTTP server binds. */
export function loadBrowserClientModules(): ReadonlyMap<string, Buffer> {
  const modules = new Map<string, Buffer>();
  for (const filename of ["browse.js", "browser.js", "live_updates.js"]) {
    const candidate = fileURLToPath(
      new URL(`../client/${filename}`, import.meta.url),
    );
    try {
      modules.set(filename, fs.readFileSync(candidate));
    } catch (error) {
      throw new MokabookError(
        "server-failed",
        `could not load browser client ${filename}: ${errorMessage(error)}`,
        { cause: error },
      );
    }
  }
  return modules;
}
