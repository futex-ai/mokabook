/** Reset only this fixture's pinned entry, holding the same lock as a real builder. */
import { removePartialBaseline } from "../../dist/baseline/cache.js";
import { cacheLayout } from "../../dist/baseline/cache_layout.js";
import { SystemBaselineClock } from "../../dist/baseline/clock.js";
import { ensureBaselineDirectory } from "../../dist/baseline/confinement.js";
import { NodeBaselineFileSystem } from "../../dist/baseline/filesystem.js";
import { tryBaselineLock } from "../../dist/baseline/lock.js";
import { NodeBaselineProcessRunner } from "../../dist/baseline/process.js";
import { NodeGitCommandRunner } from "../../dist/review/git.js";
import { GitRepositoryEvidence } from "../../dist/review/git_evidence.js";

export async function resetFixtureBaseline(config, dependencies = {}) {
  const fs = dependencies.fs ?? new NodeBaselineFileSystem();
  const runner = dependencies.runner ?? new NodeBaselineProcessRunner();
  const clock = dependencies.clock ?? new SystemBaselineClock();
  const evidence =
    dependencies.evidence ??
    new GitRepositoryEvidence(new NodeGitCommandRunner(config.repoRoot));
  const commit = await evidence.mergeBase(config.review.base, "HEAD");
  const layout = cacheLayout(config.repoRoot, commit);
  await ensureBaselineDirectory(fs, config.repoRoot, layout.entry);
  const lock = await tryBaselineLock(fs, runner, clock, layout);
  if (!lock)
    throw new Error(
      "Stop the fixture's active baseline builder before benchmarking",
    );
  try {
    await removePartialBaseline(fs, layout);
  } finally {
    await lock.release();
  }
}
