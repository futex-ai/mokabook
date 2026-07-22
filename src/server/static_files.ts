/** Confined static-file and bundled-asset responses for the HTTP server. */

import fs from "node:fs";
import type { ServerResponse } from "node:http";
import path from "node:path";

import { isPublicStaticFile } from "../config/public_files.js";
import type { ResolvedConfig } from "../config/types.js";

/** Serve one allowlisted browser client module. */
export function serveClientModule(
  response: ServerResponse,
  filename: string,
  modules: ReadonlyMap<string, Buffer>,
  method: string,
): void {
  const content = modules.get(filename);
  if (!content) return sendMissing(response, method);
  sendBuffer(response, content, "text/javascript; charset=utf-8", method);
}

/** Serve one packaged shell font or its license. */
export function serveFontAsset(
  response: ServerResponse,
  filename: string,
  fonts: ReadonlyMap<string, Buffer>,
  method: string,
): void {
  const content = fonts.get(filename);
  if (!content) return sendMissing(response, method);
  sendBuffer(
    response,
    content,
    filename.endsWith(".woff2") ? "font/woff2" : "text/plain; charset=utf-8",
    method,
  );
}

/** Serve one generated or explicitly public consumer file. */
export function servePublicStatic(
  response: ServerResponse,
  encodedPath: string,
  config: ResolvedConfig,
  method: string,
): void {
  const relative = safeDecodePath(encodedPath);
  if (!relative) return sendText(response, 400, "Invalid static path", method);
  const candidate = path.resolve(config.mockupsDir, relative);
  if (!isPublicStaticFile(candidate, config)) {
    return sendMissing(response, method);
  }
  let content: Buffer;
  try {
    content = fs.readFileSync(candidate);
  } catch {
    return sendMissing(response, method);
  }
  sendBuffer(response, content, contentType(candidate), method);
}

/** Decode a relative URL path once and reject empty or traversal segments. */
export function safeDecodePath(value: string): string | undefined {
  try {
    const decoded = value.split("/").map(decodeURIComponent).join("/");
    if (
      decoded === "" ||
      decoded.startsWith("/") ||
      decoded.includes("\\") ||
      decoded
        .split("/")
        .some((part) => part === ".." || part === "." || part === "")
    )
      return undefined;
    return decoded;
  } catch {
    return undefined;
  }
}

/** Return a safe response type for a served package or consumer asset. */
export function contentType(candidate: string): string {
  const extension = path.extname(candidate).toLowerCase();
  const types: Readonly<Record<string, string>> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
  };
  return types[extension] ?? "application/octet-stream";
}

/** Return whether direct navigation could execute an untrusted document. */
export function requiresDocumentSandbox(type: string): boolean {
  return type.startsWith("text/html") || type.startsWith("image/svg+xml");
}

function sendBuffer(
  response: ServerResponse,
  content: Buffer | string,
  type: string,
  method: string,
): void {
  response.writeHead(200, {
    "cache-control": "no-cache",
    ...(requiresDocumentSandbox(type)
      ? { "content-security-policy": "sandbox" }
      : {}),
    "content-type": type,
    "x-content-type-options": "nosniff",
  });
  response.end(method === "HEAD" ? undefined : content);
}

function sendMissing(response: ServerResponse, method: string): void {
  sendText(response, 404, "Not found", method);
}

function sendText(
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
