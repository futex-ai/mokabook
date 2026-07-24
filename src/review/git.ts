import { execFile } from "node:child_process";

import { MokabookError, errorMessage } from "../errors.js";
import { readGitFiles } from "./git_batch.js";

/** Repository object classification used before reading Review dependencies. */
export type GitFileKind = "missing" | "other" | "regular" | "symlink";

/** A requested Git tree entry, with bytes retained only for regular files. */
export type GitFile =
  | { readonly bytes: Uint8Array; readonly kind: "regular" }
  | { readonly kind: Exclude<GitFileKind, "regular"> };

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
  readFiles?(
    commit: string,
    repoRelativePaths: readonly string[],
  ): Promise<ReadonlyMap<string, GitFile>>;
  resolveRef(reference: string): Promise<string>;
}

/** Injected subprocess runner for Git commands. */
export interface GitCommandRunner {
  run(arguments_: readonly string[]): Promise<string>;
  runBytes?(arguments_: readonly string[]): Promise<Uint8Array>;
  runBytesWithInput?(
    arguments_: readonly string[],
    input: Uint8Array,
  ): Promise<Uint8Array>;
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

  runBytes(arguments_: readonly string[]): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      execFile(
        "git",
        [...arguments_],
        { cwd: this.cwd, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
        (error, stdout) => {
          if (error) reject(error);
          else resolve(Buffer.from(stdout));
        },
      );
    });
  }

  runBytesWithInput(
    arguments_: readonly string[],
    input: Uint8Array,
  ): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      let inputError: Error | undefined;
      const child = execFile(
        "git",
        [...arguments_],
        { cwd: this.cwd, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
        (error, stdout) => {
          if (error) reject(error);
          else if (inputError) reject(inputError);
          else resolve(Buffer.from(stdout));
        },
      );
      child.stdin?.on("error", (error) => {
        inputError = error;
      });
      child.stdin?.end(Buffer.from(input));
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

  async readFiles(
    commit: string,
    repoRelativePaths: readonly string[],
  ): Promise<ReadonlyMap<string, GitFile>> {
    for (const repoRelativePath of repoRelativePaths) {
      assertGitPath(repoRelativePath);
    }
    if (this.runner.runBytesWithInput) {
      return readGitFiles(this.runner, commit, repoRelativePaths);
    }
    const files = new Map<string, GitFile>();
    for (const repoRelativePath of [...new Set(repoRelativePaths)].sort()) {
      const kind = await this.fileKind(commit, repoRelativePath);
      files.set(
        repoRelativePath,
        kind === "regular"
          ? {
              bytes: await this.readFileBytes(commit, repoRelativePath),
              kind,
            }
          : { kind },
      );
    }
    return files;
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
