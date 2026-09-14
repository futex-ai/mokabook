import fs from "node:fs";
import path from "node:path";

import { comparisonContentId } from "../../dist/export/content_id.js";
import { ownedEntries } from "../../dist/export/ownership.js";
import { configuredServedReview } from "../../dist/server/review_routes.js";

const comparisonRoute = "/__mokly/diffs/review.json";

/** Keep publishing isolated from another server's configured comparison output. */
export function previewComparisonProvider(config, stage, base, git) {
  return configuredServedReview(
    {
      ...config,
      review: { ...config.review, outDir: path.join(stage, ".comparisons") },
    },
    base,
    git,
  );
}

/** Resolve the same generation the interactive client would request on demand. */
export async function captureComparison(serverUrl) {
  const response = await fetch(`${serverUrl}${comparisonRoute}`);
  if (!response.ok) {
    const failure = await response.json();
    throw new Error(`preview comparison failed: ${failure.details}`);
  }
  const url = new URL(response.url);
  if (
    url.origin !== new URL(serverUrl).origin ||
    !/^\/__mokly\/diffs\/__generations\/[A-Za-z0-9-]+\/review\.json$/.test(
      url.pathname,
    )
  )
    throw new Error(
      "preview comparison did not resolve an immutable generation",
    );
  return {
    directory: path.posix.dirname(url.pathname).slice(1),
    redirect: `${comparisonRoute} ${url.pathname} 302`,
    result: await response.json(),
  };
}

/** Move the completed generation into the deployment after the server closes. */
export async function publishComparison(provider, comparison, stage) {
  const files = new Map();
  for (const name of (await ownedEntries(provider.outDir)).files)
    if (![".mokly-review-artifact", "summary.md"].includes(name))
      files.set(
        name,
        await fs.promises.readFile(path.join(provider.outDir, name)),
      );
  const directory = `__mokly/diffs/__generations/${comparisonContentId(files)}`;
  const target = path.join(stage, directory);
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  await fs.promises.rename(provider.outDir, target);
  await fs.promises.rm(path.join(target, ".mokly-review-artifact"));
  await fs.promises.rm(path.join(target, "summary.md"));
  return {
    ...comparison,
    directory,
    ...comparisonMetadata(`/${directory}/review.json`),
  };
}

/** Preserve the repository's immutable-generation alias and hosting policy. */
export function comparisonMetadata(comparisonUrl) {
  if (
    !/^\/__mokly\/diffs\/__generations\/[a-f0-9]{64}\/review\.json$/.test(
      comparisonUrl,
    )
  )
    throw new Error(
      "preview comparison did not resolve an immutable generation",
    );
  return {
    redirect: `/__mokly/diffs/review.json ${comparisonUrl} 302`,
    headers:
      "/__mokly/diffs/*\n  Cache-Control: no-store\n  X-Content-Type-Options: nosniff\n",
  };
}
