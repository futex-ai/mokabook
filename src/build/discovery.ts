import fs from "node:fs";
import path from "node:path";

import { minimatch } from "minimatch";

import { toPosixPath } from "../config/paths.js";

/** Recursively list regular files under a root in stable path order. */
export function walkFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const candidate = path.join(root, entry.name);
      return entry.isDirectory()
        ? walkFiles(candidate)
        : entry.isFile()
          ? [candidate]
          : [];
    })
    .sort((left, right) => left.localeCompare(right));
}

/** Discover structured registry source modules. */
export function discoverEntryModules(entriesDir: string): string[] {
  return walkFiles(entriesDir).filter(
    (candidate) =>
      candidate.endsWith(".mockup.ts") || candidate.endsWith(".mockup.tsx"),
  );
}

/** Discover optional legacy page modules and HTML sources. */
export function discoverLegacySources(
  pagesDir: string,
  exclude: readonly string[] = [],
): string[] {
  return walkFiles(pagesDir).filter((candidate) => {
    const source = [".source.ts", ".source.tsx", ".source.html"].some(
      (suffix) => candidate.endsWith(suffix),
    );
    const relative = toPosixPath(path.relative(pagesDir, candidate));
    return source && !exclude.some((glob) => minimatch(relative, glob));
  });
}
