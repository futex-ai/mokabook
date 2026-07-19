import { execFile } from "node:child_process";

import { MokabookError, errorMessage } from "../errors.js";

/** Git operations required by Review without checking out the base tree. */
export interface GitClient {
  changedPaths(commit: string): Promise<readonly string[]>;
  readFile(commit: string, repoRelativePath: string): Promise<string>;
  resolveRef(reference: string): Promise<string>;
}

/** Injected subprocess runner for Git commands. */
export interface GitCommandRunner {
  run(arguments_: readonly string[]): Promise<string>;
}

/** Operating-system Git subprocess implementation. */
export class NodeGitCommandRunner implements GitCommandRunner {
  constructor(private readonly cwd: string) {}

  run(arguments_: readonly string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(
        "git",
        [...arguments_],
        { cwd: this.cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
        (error, stdout) => {
          if (error) reject(error);
          else resolve(stdout);
        },
      );
    });
  }
}

/** Git client with typed, contextual command failures. */
export class RepositoryGitClient implements GitClient {
  constructor(private readonly runner: GitCommandRunner) {}

  async resolveRef(reference: string): Promise<string> {
    const output = await this.run(
      ["rev-parse", "--verify", `${reference}^{commit}`],
      `resolve ${reference}`,
    );
    const commit = output.trim();
    if (!/^[a-f0-9]{40,64}$/.test(commit)) {
      throw new MokabookError(
        "git-failed",
        `Git returned an invalid commit for ${reference}`,
      );
    }
    return commit;
  }

  async readFile(commit: string, repoRelativePath: string): Promise<string> {
    assertGitPath(repoRelativePath);
    return this.run(
      ["show", `${commit}:${repoRelativePath}`],
      `read ${repoRelativePath} at ${commit}`,
    );
  }

  async changedPaths(commit: string): Promise<readonly string[]> {
    const tracked = await this.run(
      ["diff", "--name-only", commit, "--"],
      `diff workspace against ${commit}`,
    );
    const untracked = await this.run(
      ["ls-files", "--others", "--exclude-standard"],
      "list untracked workspace paths",
    );
    return [
      ...new Set(
        `${tracked}\n${untracked}`
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ].sort();
  }

  private async run(
    arguments_: readonly string[],
    context: string,
  ): Promise<string> {
    try {
      return await this.runner.run(arguments_);
    } catch (error) {
      throw new MokabookError(
        "git-failed",
        `${context}: ${errorMessage(error)}`,
        { cause: error },
      );
    }
  }
}

function assertGitPath(value: string): void {
  if (
    value === "" ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value
      .split("/")
      .some((part) => part === "" || part === "." || part === "..") ||
    value.includes(":")
  ) {
    throw new MokabookError("git-failed", `unsafe Git path: ${value}`);
  }
}
