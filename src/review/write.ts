import fs from "node:fs";
import path from "node:path";

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
  if (
    fs.existsSync(outDir) &&
    !fs.existsSync(path.join(outDir, ".mokabook-review-artifact"))
  ) {
    throw new MokabookError(
      "review-invalid",
      `refusing to replace unowned Review directory: ${outDir}`,
    );
  }
  await fs.promises.mkdir(path.dirname(outDir), { recursive: true });
  const temporary = await fs.promises.mkdtemp(
    path.join(path.dirname(outDir), ".mokabook-review-"),
  );
  const stage = path.join(temporary, "stage");
  const backup = path.join(temporary, "backup");
  let backedUp = false;
  let installed = false;
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
    if (fs.existsSync(outDir)) {
      await fs.promises.rename(outDir, backup);
      backedUp = true;
    }
    signal?.throwIfAborted();
    await fs.promises.rename(stage, outDir);
    installed = true;
    signal?.throwIfAborted();
  } catch (error) {
    if (installed)
      await fs.promises.rm(outDir, { force: true, recursive: true });
    if (backedUp) await fs.promises.rename(backup, outDir);
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
