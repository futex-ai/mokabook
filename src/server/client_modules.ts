/** Loading of the package-owned assets the shell serves: the allowlisted
 * browser client modules and the packaged shell font files. */

import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { MokabookError, errorMessage } from "../errors.js";

/** Load the allowlisted browser modules before the HTTP server binds. */
export function loadBrowserClientModules(): ReadonlyMap<string, Buffer> {
  const modules = new Map<string, Buffer>();
  for (const filename of [
    "browse.js",
    "browse_frames.js",
    "browse_state.js",
    "browser.js",
    "live_updates.js",
  ]) {
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

/** Load the packaged shell fonts before the HTTP server binds. */
export function loadShellFontAssets(): ReadonlyMap<string, Buffer> {
  const fonts = new Map<string, Buffer>();
  for (const filename of ["InterVariable.woff2", "Inter-OFL.txt"]) {
    const candidate = fileURLToPath(
      new URL(`./shell/assets/fonts/${filename}`, import.meta.url),
    );
    try {
      fonts.set(filename, fs.readFileSync(candidate));
    } catch (error) {
      throw new MokabookError(
        "server-failed",
        `could not load shell font ${filename}: ${errorMessage(error)}`,
        { cause: error },
      );
    }
  }
  return fonts;
}
