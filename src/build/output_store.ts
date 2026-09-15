import type { ResolvedConfig } from "../config/types.js";
import { NodeGitCommandRunner } from "../review/git.js";

import { checkCompilation } from "./check.js";
import type { Compilation } from "./compile.js";
import {
  GitTrackedGeneratedOutput,
  type TrackedGeneratedOutput,
} from "./tracked_output.js";
import { writeCompilation } from "./transaction.js";

/** Filesystem boundary for generated catalogue snapshots. */
export interface GeneratedOutputStore {
  check(compilation: Compilation, config: ResolvedConfig): void | Promise<void>;
  write(compilation: Compilation, config: ResolvedConfig): Promise<void>;
}

/** Transactional operating-system generated-output store. */
export class FileSystemGeneratedOutputStore implements GeneratedOutputStore {
  constructor(private readonly tracked?: TrackedGeneratedOutput) {}

  check(
    compilation: Compilation,
    config: ResolvedConfig,
  ): void | Promise<void> {
    if (config.generatedOutput === "derived")
      return (
        this.tracked ??
        new GitTrackedGeneratedOutput(new NodeGitCommandRunner(config.repoRoot))
      ).check(compilation, config);
    checkCompilation(compilation, config);
  }

  write(compilation: Compilation, config: ResolvedConfig): Promise<void> {
    return writeCompilation(compilation, config);
  }
}
