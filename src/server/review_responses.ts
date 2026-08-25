/** HTTP response helpers for served Review artifacts. */

import fs from "node:fs";
import path from "node:path";
import type { ServerResponse } from "node:http";

import { errorMessage } from "../errors.js";
import { contentType, send } from "./respond.js";
import { stampDocumentUpdateVersion } from "./versioned_document.js";

/** Redirect to a stable or immutable Review route without caching. */
export function redirectReview(
  response: ServerResponse,
  location: string,
): void {
  response.writeHead(302, {
    "cache-control": "no-store",
    location,
  });
  response.end();
}

/** Serve one immutable Review artifact file from its retained generation. */
export function serveReviewArtifactFile(
  directory: string,
  relative: string,
  response: ServerResponse,
  method: string,
  updateVersion: number,
  liveUpdateDocument: boolean,
): void {
  const rootPath = path.resolve(directory);
  const filePath = path.resolve(rootPath, relative);
  if (!filePath.startsWith(rootPath + path.sep))
    return send(response, 404, "text/plain", "Not found", method);
  let content: Buffer;
  try {
    content = fs.readFileSync(filePath);
  } catch {
    return send(response, 404, "text/plain", "Not found", method);
  }
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": contentType(filePath),
    "x-content-type-options": "nosniff",
  });
  const body = liveUpdateDocument
    ? Buffer.from(
        stampDocumentUpdateVersion(content.toString("utf8"), updateVersion),
      )
    : content;
  response.end(method === "HEAD" ? undefined : body);
}

/** Send a retryable, version-stamped Review generation failure document. */
export function sendReviewFailure(
  response: ServerResponse,
  error: unknown,
  base: string,
  method: string,
  updateVersion: number,
): void {
  send(
    response,
    500,
    "text/html",
    stampDocumentUpdateVersion(failedPage(error, base), updateVersion),
    method,
  );
}

function failedPage(error: unknown, base: string): string {
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<title>Review comparison failed · Mokabook</title></head><body>` +
    `<main><h1>Review comparison failed</h1>` +
    `<p>Comparing this branch with <strong>${escapeHtml(base)}</strong> did ` +
    `not complete.</p>` +
    `<p>${escapeHtml(errorMessage(error))}</p>` +
    `<p><a href="/review/index.html?refresh=1">Try again</a> · ` +
    `<a href="/">Browse the catalogue</a></p></main>` +
    `<script src="/__mokabook/client/browser.js" type="module"></script>` +
    `</body></html>\n`
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
