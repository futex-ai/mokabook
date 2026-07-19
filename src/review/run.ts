import { compileCatalogue } from "../build/compile.js";
import {
  FileSystemGeneratedOutputStore,
  type GeneratedOutputStore,
} from "../build/output_store.js";
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
  git: GitClient = new RepositoryGitClient(
    new NodeGitCommandRunner(config.repoRoot),
  ),
  outputStore: GeneratedOutputStore = new FileSystemGeneratedOutputStore(),
): Promise<ReviewResult> {
  const compilation = await compileCatalogue(config);
  outputStore.check(compilation, config);
  const artifact = await compareReview(compilation, config, git, baseRef);
  await writeReviewArtifact(
    renderReviewArtifact(artifact),
    outDir,
    config.repoRoot,
  );
  return artifact.result;
}
