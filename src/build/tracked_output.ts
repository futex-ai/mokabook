import path from "node:path";

import { MOKABOOK_CACHE } from "../config/cache_paths.js";
import { projectRealPath, toPosixPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError, errorMessage } from "../errors.js";
import type { GitCommandRunner } from "../review/git.js";
import type { Compilation } from "./compile.js";

/** Git index boundary for derived output validation; it never writes generated files. */
export interface TrackedGeneratedOutput {
  check(compilation: Compilation, config: ResolvedConfig): Promise<void>;
}

export class GitTrackedGeneratedOutput implements TrackedGeneratedOutput {
  constructor(private readonly runner: GitCommandRunner) {}

  async check(compilation: Compilation, config: ResolvedConfig): Promise<void> {
    try {
      const root = (
        await this.runner.run(["rev-parse", "--show-toplevel"])
      ).trim();
      if (projectRealPath(root) !== projectRealPath(config.repoRoot))
        throw new Error(
          "derived check requires repoRoot to be the Git repository root",
        );
      const prefixes = [
        ...new Set([
          toPosixPath(path.relative(config.repoRoot, config.mockupsDir)),
          toPosixPath(
            path.relative(
              projectRealPath(config.repoRoot),
              projectRealPath(config.mockupsDir),
            ),
          ),
        ]),
      ];
      const tracked = (
        await this.runner.run([
          "ls-files",
          "--cached",
          "--full-name",
          "-z",
          "--",
          ...[...prefixes, MOKABOOK_CACHE].map(
            (prefix) => `:(top,literal)${prefix}`,
          ),
        ])
      )
        .split("\0")
        .filter(Boolean);
      const generated = new Set(
        prefixes.flatMap((prefix) =>
          [...compilation.outputs.keys()].map((route) =>
            prefix ? `${prefix}/${route}` : route,
          ),
        ),
      );
      const invalid = [...new Set(tracked)]
        .filter(
          (name) =>
            generated.has(name) ||
            name === MOKABOOK_CACHE ||
            name.startsWith(`${MOKABOOK_CACHE}/`),
        )
        .sort();
      if (!invalid.length) return;
      throw new MokabookError(
        "build-invalid",
        `derived output must not be tracked by Git:\n${invalid.map((name) => `  - ${name}`).join("\n")}\nRemove these paths from the index with git rm --cached and add these rules to .gitignore:\n${invalid.map((name) => `/${name}`).join("\n")}\n/${MOKABOOK_CACHE}/`,
      );
    } catch (error) {
      if (error instanceof MokabookError && error.code === "build-invalid")
        throw error;
      throw new MokabookError(
        "build-invalid",
        `could not check tracked generated output: ${errorMessage(error)}`,
        { cause: error },
      );
    }
  }
}
