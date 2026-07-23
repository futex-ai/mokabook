import { compileCatalogue } from "../build/compile.js";
import {
  FileSystemGeneratedOutputStore,
  type GeneratedOutputStore,
} from "../build/output_store.js";
import { validateReviewOut } from "../config/path_validation.js";
import type { ResolvedConfig } from "../config/types.js";
import { renderReviewArtifact } from "./artifact.js";
import type { ReviewRenderOptions } from "./artifact_pages.js";
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
  git: GitClient = new RepositoryGitClient(
    new NodeGitCommandRunner(config.repoRoot),
  ),
  outputStore: GeneratedOutputStore = new FileSystemGeneratedOutputStore(),
  render: ReviewRenderOptions = {},
): Promise<ReviewResult> {
  validateReviewOut(outDir, config, "Review output", "review-invalid");
  const compilation = await compileCatalogue(config);
  outputStore.check(compilation, config);
  const artifact = await compareReview(
    compilation,
    config,
    git,
    baseRef,
    outDir,
  );
  await writeReviewArtifact(
    renderReviewArtifact(artifact, render),
    outDir,
    config,
  );
  return artifact.result;
}
