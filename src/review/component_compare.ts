import type { Compilation } from "../build/compile.js";
import { generatedViews } from "../components/views.js";
import type { ResolvedConfig } from "../config/types.js";
import type { Manifest } from "../registry/types.js";

import {
  copySnapshotDependencies,
  type GitReviewAssetReader,
  type ReviewAssetReader,
} from "./assets.js";
import { classifyComponents } from "./component_classification.js";
import { addArtifactFile, snapshotPath } from "./paths.js";
import type { ReviewArtifact, ReviewArtifactContent } from "./types.js";

/** Retain every component variant and affected screen, then classify the same immutable bytes. */
export async function compareComponentCatalogue(
  compilation: Compilation,
  baseline: Manifest,
  config: ResolvedConfig,
  baseReader: GitReviewAssetReader,
  headReader: ReviewAssetReader,
  changedPaths: readonly string[],
  baseCommit: string,
  baseRef: string,
): Promise<ReviewArtifact> {
  const basePaths = baseline.entries.flatMap((entry) =>
    generatedViews(entry).map((view) => view.path),
  );
  const headPaths = compilation.manifest.entries.flatMap((entry) =>
    generatedViews(entry).map((view) => view.path),
  );
  const baseFiles = await baseReader.readMany(basePaths);
  const beforeReader: ReviewAssetReader = {
    read: async (route) => baseFiles.get(route) ?? baseReader.read(route),
  };
  const afterReader: ReviewAssetReader = {
    read: async (route) => {
      const generated = compilation.outputs.get(route);
      return generated === undefined
        ? headReader.read(route)
        : Buffer.from(generated);
    },
  };
  const result = await classifyComponents({
    before: baseline,
    after: compilation.manifest,
    beforeReader,
    afterReader,
    config,
    changedPaths,
    baseCommit,
    baseRef,
  });
  const files = new Map<string, ReviewArtifactContent>();
  for (const route of basePaths)
    addArtifactFile(
      files,
      snapshotPath("before", route),
      Buffer.from(await beforeReader.read(route)).toString("utf8"),
    );
  for (const route of headPaths)
    addArtifactFile(
      files,
      snapshotPath("after", route),
      Buffer.from(await afterReader.read(route)).toString("utf8"),
    );
  await copySnapshotDependencies(
    files,
    "before",
    new Set(basePaths),
    (route) => beforeReader.read(route),
    (routes) => baseReader.readMany(routes),
  );
  await copySnapshotDependencies(files, "after", new Set(headPaths), (route) =>
    afterReader.read(route),
  );
  return { result, files };
}
