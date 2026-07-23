/** Shared HTTP response and safe-path helpers for served Mokabook routes. */

import path from "node:path";
import type { ServerResponse } from "node:http";

/** Write one complete text response, omitting the body for HEAD. */
export function send(
  response: ServerResponse,
  status: number,
  type: string,
  body: string,
  method = "GET",
): void {
  response.writeHead(status, {
    "content-type": `${type}; charset=utf-8`,
    "x-content-type-options": "nosniff",
  });
  response.end(method === "HEAD" ? undefined : body);
}

/** Decode an encoded relative URL path, rejecting traversal and absolutes. */
export function safeDecodePath(value: string): string | undefined {
  try {
    const decoded = value.split("/").map(decodeURIComponent).join("/");
    if (
      decoded === "" ||
      decoded.startsWith("/") ||
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

/** Decode one URL component, treating malformed input as empty. */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

/** The response content type for a served artifact or static file. */
export function contentType(candidate: string): string {
  const extension = path.extname(candidate).toLowerCase();
  return extension === ".html"
    ? "text/html; charset=utf-8"
    : extension === ".css"
      ? "text/css; charset=utf-8"
      : extension === ".svg"
        ? "image/svg+xml"
        : extension === ".png"
          ? "image/png"
          : extension === ".jpg" || extension === ".jpeg"
            ? "image/jpeg"
            : extension === ".woff2"
              ? "font/woff2"
              : "application/octet-stream";
}
