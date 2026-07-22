/** Owned Review artifact identity validation and confined file responses. */

import crypto from "node:crypto";
import fs from "node:fs";
import type { ServerResponse } from "node:http";
import path from "node:path";

import { validateReviewOut } from "../config/path_validation.js";
import { isInside, toPosixPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError } from "../errors.js";
import { contentType, requiresDocumentSandbox } from "./static_files.js";

const ARTIFACT_MARKER = ".mokabook-review-artifact";

/** Filesystem identity pinned after one successful Review generation. */
export interface ReviewArtifactIdentity {
  device: number;
  files: ReadonlyMap<string, string>;
  inode: number;
  realPath: string;
  trustedPages: ReadonlySet<string>;
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
  const files = captureArtifactFiles(realPath);
  const trustedPages = new Set([...files.keys()].filter(isReviewPage));
  return {
    device: stats.dev,
    files,
    inode: stats.ino,
    realPath,
    trustedPages,
  };
}

/** Serve one file only while the configured output retains its pinned identity. */
export function serveReviewArtifact(
  response: ServerResponse,
  config: ResolvedConfig,
  artifact: ReviewArtifactIdentity,
  relative: string,
  method: string,
): void {
  const content = readReviewArtifactFile(config, artifact, relative);
  if (!content) {
    sendReviewText(response, 404, "Not found", method);
    return;
  }
  const candidate = path.resolve(artifact.realPath, relative);
  const trustedPage = artifact.trustedPages.has(relative);
  const body = trustedPage
    ? enhanceServedPage(content.toString("utf8"))
    : content;
  const type = contentType(candidate);
  response.writeHead(200, {
    "cache-control": "no-cache",
    ...(!trustedPage && requiresDocumentSandbox(type)
      ? { "content-security-policy": "sandbox" }
      : {}),
    "content-type": type,
    "x-content-type-options": "nosniff",
  });
  response.end(method === "HEAD" ? undefined : body);
}

/** Read one captured file only when its path, identity, and bytes still match. */
export function readReviewArtifactFile(
  config: ResolvedConfig,
  artifact: ReviewArtifactIdentity,
  relative: string,
): Buffer | undefined {
  const expectedDigest = artifact.files.get(relative);
  if (!expectedDigest || !matchesArtifact(config, artifact)) return undefined;
  const candidate = path.resolve(artifact.realPath, relative);
  try {
    const realCandidate = fs.realpathSync(candidate);
    if (
      !isInside(artifact.realPath, realCandidate) ||
      !fs.lstatSync(candidate).isFile()
    ) {
      return undefined;
    }
    const content = fs.readFileSync(realCandidate);
    return digest(content) === expectedDigest ? content : undefined;
  } catch {
    return undefined;
  }
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

function captureArtifactFiles(realPath: string): ReadonlyMap<string, string> {
  const files = new Map<string, string>();
  const pending = [realPath];
  while (pending.length > 0) {
    const directory = pending.pop();
    if (!directory) continue;
    const entries = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        pending.push(candidate);
        continue;
      }
      if (!entry.isFile()) {
        throw new MokabookError(
          "review-invalid",
          `generated Review artifact contains a non-file entry: ${toPosixPath(
            path.relative(realPath, candidate),
          )}`,
        );
      }
      files.set(
        toPosixPath(path.relative(realPath, candidate)),
        digest(fs.readFileSync(candidate)),
      );
    }
  }
  return files;
}

function digest(content: Buffer): string {
  return crypto.createHash("sha256").update(content).digest("hex");
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
