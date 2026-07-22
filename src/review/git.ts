import { execFile } from "node:child_process";

import { MokabookError, errorMessage } from "../errors.js";

/** Repository object classification used before reading Review dependencies. */
export type GitFileKind = "missing" | "other" | "regular" | "symlink";

/** Git operations required by Review without checking out the base tree. */
export interface GitClient {
  changedPaths(
    commit: string,
    excludedPaths?: readonly string[],
  ): Promise<readonly string[]>;
  fileExists(commit: string, repoRelativePath: string): Promise<boolean>;
  fileKind(commit: string, repoRelativePath: string): Promise<GitFileKind>;
  readFile(commit: string, repoRelativePath: string): Promise<string>;
  readFileBytes(commit: string, repoRelativePath: string): Promise<Uint8Array>;
  resolveRef(reference: string): Promise<string>;
}

/** Injected subprocess runner for Git commands. */
export interface GitCommandRunner {
  run(arguments_: readonly string[]): Promise<string>;
  runBytes?(arguments_: readonly string[]): Promise<Uint8Array>;
}

/** Operating-system Git subprocess implementation. */
export class NodeGitCommandRunner implements GitCommandRunner {
  constructor(
    private readonly cwd: string,
    private readonly signal?: AbortSignal,
    private readonly executable = "git",
  ) {}

  run(arguments_: readonly string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(
        this.executable,
        [...arguments_],
        {
          cwd: this.cwd,
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
          signal: this.signal,
        },
        (error, stdout) => {
          if (error) reject(error);
          else resolve(stdout);
        },
      );
    });
  }

  runBytes(arguments_: readonly string[]): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      execFile(
        this.executable,
        [...arguments_],
        {
          cwd: this.cwd,
          encoding: "buffer",
          maxBuffer: 64 * 1024 * 1024,
          signal: this.signal,
        },
        (error, stdout) => {
          if (error) reject(error);
          else resolve(Buffer.from(stdout));
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

  async fileExists(commit: string, repoRelativePath: string): Promise<boolean> {
    return (await this.fileKind(commit, repoRelativePath)) !== "missing";
  }

  async fileKind(
    commit: string,
    repoRelativePath: string,
  ): Promise<GitFileKind> {
    assertGitPath(repoRelativePath);
    const output = await this.run(
      [
        "ls-tree",
        "--format=%(objectmode)",
        commit,
        "--",
        `:(literal)${repoRelativePath}`,
      ],
      `inspect ${repoRelativePath} at ${commit}`,
    );
    const modes = output
      .split("\n")
      .map((mode) => mode.trim())
      .filter(Boolean);
    if (modes.length === 0) return "missing";
    if (modes.length !== 1) {
      throw new MokabookError(
        "git-failed",
        `Git returned multiple entries for ${repoRelativePath}`,
      );
    }
    const mode = modes[0] ?? "";
    if (/^100[0-7]{3}$/.test(mode)) return "regular";
    if (mode === "120000") return "symlink";
    return "other";
  }

  async readFileBytes(
    commit: string,
    repoRelativePath: string,
  ): Promise<Uint8Array> {
    assertGitPath(repoRelativePath);
    return this.runBytes(
      ["show", `${commit}:${repoRelativePath}`],
      `read ${repoRelativePath} at ${commit}`,
    );
  }

  async changedPaths(
    commit: string,
    excludedPaths: readonly string[] = [],
  ): Promise<readonly string[]> {
    for (const excluded of excludedPaths) assertGitPath(excluded);
    const pathspecs = excludedPaths.map(
      (excluded) => `:(exclude,top,literal)${excluded}`,
    );
    const tracked = await this.run(
      ["diff", "--name-only", commit, "--", ...pathspecs],
      `diff workspace against ${commit}`,
    );
    const untracked = await this.run(
      ["ls-files", "--others", "--exclude-standard", "--", ...pathspecs],
      "list untracked workspace paths",
    );
    return [
      ...new Set(
        `${tracked}\n${untracked}`
          .split("\n")
          .map((value) => value.trim())
          .filter(
            (value) =>
              value.length > 0 &&
              !excludedPaths.some((excluded) => pathBelongsTo(value, excluded)),
          ),
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

  private async runBytes(
    arguments_: readonly string[],
    context: string,
  ): Promise<Uint8Array> {
    try {
      if (this.runner.runBytes) return await this.runner.runBytes(arguments_);
      return Buffer.from(await this.runner.run(arguments_), "utf8");
    } catch (error) {
      throw new MokabookError(
        "git-failed",
        `${context}: ${errorMessage(error)}`,
        { cause: error },
      );
    }
  }
}

function pathBelongsTo(candidate: string, root: string): boolean {
  return candidate === root || candidate.startsWith(`${root}/`);
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
