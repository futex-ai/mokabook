/** Owned Review artifact identity validation and confined file responses. */

import fs from "node:fs";
import type { ServerResponse } from "node:http";
import path from "node:path";

import { validateReviewOut } from "../config/path_validation.js";
import { isInside } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError } from "../errors.js";
import { contentType } from "./static_files.js";

const ARTIFACT_MARKER = ".mokabook-review-artifact";

/** Filesystem identity pinned after one successful Review generation. */
export interface ReviewArtifactIdentity {
  device: number;
  inode: number;
  realPath: string;
}

/** Validate and pin the newly generated owned artifact directory. */
export function captureReviewArtifact(
  config: ResolvedConfig,
): ReviewArtifactIdentity {
  validateReviewOut(
    config.review.outDir,
    config,
    "Review output",
    "review-invalid",
  );
  const realPath = fs.realpathSync(config.review.outDir);
  const stats = fs.statSync(realPath);
  if (!stats.isDirectory() || !ownedMarkerExists(realPath)) {
    throw new MokabookError(
      "review-invalid",
      `generated Review artifact is not owned: ${config.review.outDir}`,
    );
  }
  return { device: stats.dev, inode: stats.ino, realPath };
}

/** Serve one file only while the configured output retains its pinned identity. */
export function serveReviewArtifact(
  response: ServerResponse,
  config: ResolvedConfig,
  artifact: ReviewArtifactIdentity,
  relative: string,
  method: string,
): void {
  if (!matchesArtifact(config, artifact)) {
    sendReviewText(response, 404, "Not found", method);
    return;
  }
  const candidate = path.resolve(artifact.realPath, relative);
  let content: Buffer;
  try {
    const realCandidate = fs.realpathSync(candidate);
    if (
      !isInside(artifact.realPath, realCandidate) ||
      !fs.lstatSync(candidate).isFile()
    ) {
      sendReviewText(response, 404, "Not found", method);
      return;
    }
    content = fs.readFileSync(realCandidate);
  } catch {
    sendReviewText(response, 404, "Not found", method);
    return;
  }
  const body = isReviewPage(relative)
    ? enhanceServedPage(content.toString("utf8"))
    : content;
  response.writeHead(200, {
    "cache-control": "no-cache",
    "content-type": contentType(candidate),
    "x-content-type-options": "nosniff",
  });
  response.end(method === "HEAD" ? undefined : body);
}

/** Send one non-HTML Review response without allowing browser reuse. */
export function sendReviewText(
  response: ServerResponse,
  status: number,
  body: string,
  method: string,
): void {
  response.writeHead(status, {
    "cache-control": "no-cache",
    "content-type": "text/plain; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  response.end(method === "HEAD" ? undefined : body);
}

function matchesArtifact(
  config: ResolvedConfig,
  artifact: ReviewArtifactIdentity,
): boolean {
  try {
    validateReviewOut(
      config.review.outDir,
      config,
      "Review output",
      "review-invalid",
    );
    const realPath = fs.realpathSync(config.review.outDir);
    const stats = fs.statSync(realPath);
    return (
      realPath === artifact.realPath &&
      stats.isDirectory() &&
      stats.dev === artifact.device &&
      stats.ino === artifact.inode &&
      ownedMarkerExists(realPath)
    );
  } catch {
    return false;
  }
}

function ownedMarkerExists(realPath: string): boolean {
  try {
    return fs.lstatSync(path.join(realPath, ARTIFACT_MARKER)).isFile();
  } catch {
    return false;
  }
}

function isReviewPage(relative: string): boolean {
  return (
    relative === "index.html" ||
    (relative.startsWith("comparisons/") && relative.endsWith(".html"))
  );
}

function enhanceServedPage(content: string): string {
  const controls =
    `<div class="mb-served-reviewbar">` +
    `<nav aria-label="Mokabook modes" class="mb-viewswitch">` +
    `<a class="mb-viewswitch-option" href="/">Browse</a>` +
    `<span aria-current="page" class="mb-viewswitch-option">Review</span>` +
    `</nav><a class="mb-empty-link" href="?refresh=1">Refresh comparison</a>` +
    `</div>`;
  const client = `<script src="/__mokabook/client/browser.js" type="module"></script>`;
  return content
    .replace('<main class="mb-artifact-main">', `$&${controls}`)
    .replace("</body>", `${client}</body>`);
}
