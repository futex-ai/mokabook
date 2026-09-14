import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { completedBaseline } from "../baseline/cache.js";
import { cacheLayout } from "../baseline/cache_layout.js";
import { SystemBaselineClock } from "../baseline/clock.js";
import { assertBaselineActive, BaselineError } from "../baseline/errors.js";
import { NodeBaselineFileSystem } from "../baseline/filesystem.js";
import { NodeBaselineProcessRunner } from "../baseline/process.js";
import { CachedBaselineBuilder } from "../baseline/rebuild.js";
import { RebuiltBaselineReader } from "../baseline/reader.js";
import type {
  BaselineBuilder,
  BaselineFileSystem,
  BaselineProgress,
} from "../baseline/types.js";
import { projectRealPath, toPosixPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError } from "../errors.js";
import { timeAsync } from "../diagnostics/timings.js";
import { CommittedBaselineReader } from "./committed.js";
import {
  NodeGitCommandRunner,
  type BaselineReader,
  type GitCommandRunner,
  type ReviewRepository,
} from "./git.js";
import { GitRepositoryEvidence } from "./git_evidence.js";

export interface BaselinePreparationOptions {
  readonly signal?: AbortSignal;
  readonly onProgress?: (event: BaselineProgress) => void;
  readonly runner?: GitCommandRunner;
  readonly builder?: BaselineBuilder;
  readonly filesystem?: BaselineFileSystem;
  /** Already resolved by a caller that owns this baseline's lifetime. */
  readonly commit?: string;
}

export interface PreparedReviewRepository {
  readonly commit: string;
  readonly repository: ReviewRepository;
  /** Validate retained cache identity again before installing an export. */
  assertUnchanged(): Promise<void>;
}

/** Select a reader for an already prepared commit; this never starts a build. */
export function baselineReaderForCommit(
  config: ResolvedConfig,
  commit: string,
  runner: GitCommandRunner = new NodeGitCommandRunner(config.repoRoot),
  signal?: AbortSignal,
  filesystem: BaselineFileSystem = new NodeBaselineFileSystem(),
): BaselineReader {
  return config.generatedOutput === "derived"
    ? new RebuiltBaselineReader(
        filesystem,
        config.repoRoot,
        cacheLayout(config.repoRoot, commit).output,
        commit,
        toPosixPath(path.relative(config.repoRoot, config.mockupsDir)),
        signal,
      )
    : new CommittedBaselineReader(runner);
}

/** Composition boundary for CLI, background Serve and publication; never call from HTTP. */
export async function prepareReviewRepository(
  config: ResolvedConfig,
  base: string,
  options: BaselinePreparationOptions = {},
): Promise<PreparedReviewRepository> {
  const runner =
    options.runner ?? new NodeGitCommandRunner(config.repoRoot, options.signal);
  const evidence = new GitRepositoryEvidence(runner);
  let commit: string;
  try {
    commit = await timeAsync("baseline.resolve", async () => {
      options.signal?.throwIfAborted();
      const root = (await runner.run(["rev-parse", "--show-toplevel"])).trim();
      if (projectRealPath(root) !== projectRealPath(config.repoRoot))
        throw new MokabookError(
          "git-failed",
          "Comparison requires the configured Git repository root",
        );
      return options.commit ?? (await evidence.mergeBase(base, "HEAD"));
    });
  } catch (error) {
    if (config.generatedOutput !== "derived") throw error;
    assertBaselineActive(options.signal);
    throw new BaselineError(
      "baseline-history-unavailable",
      `Could not resolve the branch point for ${base}`,
      error,
    );
  }
  const filesystem = options.filesystem ?? new NodeBaselineFileSystem();
  const request = {
    repoRoot: config.repoRoot,
    commit,
    mockupsPath: toPosixPath(path.relative(config.repoRoot, config.mockupsDir)),
    commands: config.review.baselineBuild ?? [],
    allowManifestV2: config.compatibility.readManifestV2,
    ...(options.signal ? { signal: options.signal } : {}),
    ...(options.onProgress ? { onProgress: options.onProgress } : {}),
  };
  const rebuilt =
    config.generatedOutput === "derived"
      ? await (
          options.builder ??
          new CachedBaselineBuilder(
            filesystem,
            new NodeBaselineProcessRunner(),
            new SystemBaselineClock(),
            { environment: process.env },
          )
        ).build(request)
      : undefined;
  return {
    commit,
    repository: {
      evidence: {
        mergeBase: async () => commit,
        changedPaths: (baseCommit, excluded) =>
          evidence.changedPaths(baseCommit, excluded),
      },
      reader: baselineReaderForCommit(
        config,
        commit,
        runner,
        options.signal,
        filesystem,
      ),
    },
    async assertUnchanged() {
      if (!rebuilt) return;
      assertBaselineActive(options.signal);
      const marker = await completedBaseline(
        filesystem,
        cacheLayout(config.repoRoot, commit),
        request,
      );
      if (!marker || !isDeepStrictEqual(marker, rebuilt.marker))
        throw new BaselineError(
          "baseline-output-invalid",
          `Prepared baseline changed during export: ${commit}`,
        );
    },
  };
}
