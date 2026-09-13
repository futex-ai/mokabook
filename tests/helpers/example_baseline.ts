/** Isolate the real example's current files from unrelated checkout and branch history. */
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { compileCatalogue } from "../../dist/build/compile.js";
import { writeCompilation } from "../../dist/build/transaction.js";
import { loadConfig } from "../../dist/config/load.js";
import { repositoryRoot } from "./fixture.js";

const execute = promisify(execFile);

/** Commit an unchanged example baseline within a caller-owned temporary repository. */
export async function createExampleBaseline(root: string) {
  await fs.cp(
    path.join(repositoryRoot, "examples/basic"),
    path.join(root, "examples/basic"),
    {
      recursive: true,
      filter: (source) =>
        ![".context", ".mokly-cache", "node_modules", ".git"].includes(
          path.basename(source),
        ),
    },
  );
  await fs.cp(
    path.join(repositoryRoot, "docs/protocol"),
    path.join(root, "docs/protocol"),
    { recursive: true },
  );
  const config = await loadConfig(root, "examples/basic/mokly.config.ts");
  await writeCompilation(await compileCatalogue(config), config);
  const git = (...args: string[]) => execute("git", args, { cwd: root });
  await git("init", "-q", "-b", "main");
  await git("config", "user.name", "Mokly Test");
  await git("config", "user.email", "mokly@example.invalid");
  await git("add", "examples", "docs");
  await git(
    "-c",
    "core.hooksPath=/dev/null",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    "test: unchanged example baseline",
  );
  return config;
}
