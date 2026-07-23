import fs from "node:fs";
import path from "node:path";

import {
  hasArtifactOwnershipMarker,
  replaceOwnedDirectory,
  REVIEW_ARTIFACT_MARKER,
} from "../artifact_ownership.js";
import { validateReviewOut } from "../config/path_validation.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError, errorMessage } from "../errors.js";
import type { ReviewArtifactContent } from "./types.js";

/** Replace an owned Review artifact directory as one filesystem transaction. */
export async function writeReviewArtifact(
  files: ReadonlyMap<string, ReviewArtifactContent>,
  outDir: string,
  config: ResolvedConfig,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  validateReviewOut(outDir, config, "Review output", "review-invalid");
  assertOwnedReviewOutput(outDir);
  await fs.promises.mkdir(path.dirname(outDir), { recursive: true });
  const temporary = await fs.promises.mkdtemp(
    path.join(path.dirname(outDir), ".mokabook-review-"),
  );
  const stage = path.join(temporary, "stage");
  try {
    for (const [relative, content] of [...files].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      signal?.throwIfAborted();
      validateArtifactPath(relative);
      const target = path.join(stage, relative);
      await fs.promises.mkdir(path.dirname(target), { recursive: true });
      if (typeof content === "string") {
        await fs.promises.writeFile(target, content, "utf8");
      } else {
        await fs.promises.writeFile(target, Buffer.from(content));
      }
    }
    signal?.throwIfAborted();
    await replaceOwnedDirectory({
      backupPrefix: ".mokabook-review-backup-",
      markerName: REVIEW_ARTIFACT_MARKER,
      output: outDir,
      ownershipError: `refusing to replace unowned Review directory: ${outDir}`,
      stage,
    });
  } catch (error) {
    throw new MokabookError(
      "review-invalid",
      `could not write Review artifact: ${errorMessage(error)}`,
      {
        cause: error,
      },
    );
  } finally {
    await fs.promises.rm(temporary, { force: true, recursive: true });
  }
}

function assertOwnedReviewOutput(outDir: string): void {
  if (
    fs.existsSync(outDir) &&
    !hasArtifactOwnershipMarker(outDir, REVIEW_ARTIFACT_MARKER)
  ) {
    throw new MokabookError(
      "review-invalid",
      `refusing to replace unowned Review directory: ${outDir}`,
    );
  }
}

function validateArtifactPath(relative: string): void {
  if (
    relative === "" ||
    relative.startsWith("/") ||
    relative.includes("\\") ||
    relative
      .split("/")
      .some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new MokabookError(
      "review-invalid",
      `unsafe Review artifact path: ${relative}`,
    );
  }
}
