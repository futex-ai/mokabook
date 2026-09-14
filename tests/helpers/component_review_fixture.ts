import fs from "node:fs/promises";

import {
  compileCatalogue,
  type Compilation,
} from "../../dist/build/compile.js";
import { writeCompilation } from "../../dist/build/transaction.js";
import { loadConfig } from "../../dist/config/load.js";
import type { ReviewRepository } from "../../dist/review/git.js";
import { createFixture, removeFixture } from "./fixture.js";
import { componentEntrySource } from "./component_fixture.js";

export async function componentReviewFixture(
  t: { after: (fn: () => Promise<void>) => void },
  change: (source: string) => string,
  source = componentEntrySource(),
  extraConfig = 'colorSchemes: ["light", "dark"],',
) {
  const fixture = await createFixture(source, { extraConfig });
  t.after(() => removeFixture(fixture));
  const config = await loadConfig(fixture.root);
  const before = await compileCatalogue(config);
  await fs.writeFile(fixture.entryPath, change(source));
  const after = await compileCatalogue(config);
  await writeCompilation(after, config);
  const changedPaths = [
    "entries/fixture.mockup.tsx",
    ...[...after.outputs]
      .filter(([route, html]) => before.outputs.get(route) !== html)
      .map(([route]) => `mockups/${route}`),
  ];
  return {
    ...fixture,
    config,
    before,
    after,
    git: componentGit(before, changedPaths),
    changedPaths,
  };
}

export function componentGit(
  compilation: Compilation,
  changedPaths: readonly string[] = [],
): ReviewRepository {
  const files = new Map(
    [...compilation.outputs].map(([route, html]) => [`mockups/${route}`, html]),
  );
  const read = (route: string) => {
    const result = files.get(route);
    if (result === undefined) throw new Error(`Missing fixture: ${route}`);
    return result;
  };
  return {
    evidence: {
      mergeBase: async () => "a".repeat(40),
      changedPaths: async () => changedPaths,
    },
    reader: {
      fileExists: async (_commit, route) => files.has(route),
      fileKind: async (_commit, route) =>
        files.has(route) ? "regular" : "missing",
      readFile: async (_commit, route) => read(route),
      readFileBytes: async (_commit, route) => Buffer.from(read(route)),
    },
  };
}
