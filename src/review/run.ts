import { compileCatalogue } from "../build/compile.js";
import {
  FileSystemGeneratedOutputStore,
  type GeneratedOutputStore,
} from "../build/output_store.js";
import { validateReviewOut } from "../config/path_validation.js";
import type { ResolvedConfig } from "../config/types.js";
import { renderReviewArtifact } from "./artifact.js";
import { compareReview } from "./compare.js";
import {
  NodeGitCommandRunner,
  RepositoryGitClient,
  type GitClient,
} from "./git.js";
import type { ReviewResult } from "./types.js";
import { writeReviewArtifact } from "./write.js";

/** Build a Git comparison after proving head output is current. */
export async function runReview(
  config: ResolvedConfig,
  baseRef: string,
  outDir: string,
  git: GitClient | undefined = undefined,
  outputStore: GeneratedOutputStore = new FileSystemGeneratedOutputStore(),
  signal?: AbortSignal,
): Promise<ReviewResult> {
  signal?.throwIfAborted();
  validateReviewOut(outDir, config, "Review output", "review-invalid");
  const client =
    git ??
    new RepositoryGitClient(new NodeGitCommandRunner(config.repoRoot, signal));
  const compilation = await compileCatalogue(config);
  signal?.throwIfAborted();
  outputStore.check(compilation, config);
  const artifact = await compareReview(
    compilation,
    config,
    client,
    baseRef,
    outDir,
  );
  signal?.throwIfAborted();
  await writeReviewArtifact(
    renderReviewArtifact(artifact),
    outDir,
    config,
    signal,
  );
  signal?.throwIfAborted();
  return artifact.result;
}
