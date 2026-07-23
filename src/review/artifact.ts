/** Assemble self-contained Review pages, JSON, and the CI summary. */

import type {
  ReviewArtifact,
  ReviewArtifactContent,
  ReviewResult,
} from "./types.js";
import {
  comparePage,
  indexPage,
  type ReviewRenderOptions,
} from "./artifact_pages.js";
import { isImpactOnly, isMaterial } from "./materiality.js";
import { addArtifactFile, comparisonPagePath } from "./paths.js";

/** Add self-contained diagnostic pages, JSON, and CI summary to pane artifacts. */
export function renderReviewArtifact(
  artifact: ReviewArtifact,
  options: ReviewRenderOptions = {},
): ReadonlyMap<string, ReviewArtifactContent> {
  const files = new Map(artifact.files);
  addArtifactFile(
    files,
    "review.json",
    `${JSON.stringify(artifact.result, null, 2)}\n`,
  );
  addArtifactFile(files, "summary.md", summaryMarkdown(artifact.result));
  addArtifactFile(files, "index.html", indexPage(artifact.result, options));
  for (const screen of artifact.result.screens) {
    for (const viewport of screen.viewports) {
      addArtifactFile(
        files,
        comparisonPagePath(screen.route, viewport.viewport),
        comparePage(artifact.result, screen, viewport, options),
      );
    }
  }
  addArtifactFile(files, ".mokabook-review-artifact", "schemaVersion=1\n");
  return files;
}

/** Create a concise deterministic CI summary. */
export function summaryMarkdown(result: ReviewResult): string {
  const material = result.screens.filter(isMaterial);
  const impacted = result.screens.filter(isImpactOnly).length;
  const counts = new Map<string, number>();
  for (const screen of result.screens)
    counts.set(screen.state, (counts.get(screen.state) ?? 0) + 1);
  const lines = [
    "## Mokabook Review",
    "",
    `Base: \`${result.baseRef}\` (\`${result.baseCommit.slice(0, 12)}\`)`,
    "",
    `Screens: ${result.screens.length}; material: ${material.length}; changed: ${counts.get("changed") ?? 0}; added: ${counts.get("added") ?? 0}; removed: ${counts.get("removed") ?? 0}; ignored-only: ${counts.get("ignored-only") ?? 0}; impacted: ${impacted}.`,
  ];
  if (result.sharedImpact.length > 0) {
    lines.push(
      "",
      "Shared-impact paths:",
      ...result.sharedImpact.map((item) => `- \`${item}\``),
    );
  }
  return `${lines.join("\n")}\n`;
}
