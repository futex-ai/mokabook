import fs from "node:fs";
import path from "node:path";

import { MokabookError } from "../errors.js";

const PORTABLE_URL_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._~-]*$/;
const WINDOWS_DEVICE = /^(?:aux|con|nul|prn|com[1-9]|lpt[1-9])$/i;

/** Convert a platform path to stable POSIX separators. */
export function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

/** Resolve a configured path and require it to stay inside the repository. */
export function resolveInside(
  repoRoot: string,
  fromDir: string,
  value: string,
  label: string,
): string {
  if (value.trim().length === 0) {
    throw new MokabookError("config-invalid", `${label} must not be empty`);
  }
  const resolved = path.resolve(fromDir, value);
  const relative = path.relative(repoRoot, resolved);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new MokabookError(
      "config-invalid",
      `${label} resolves outside repoRoot: ${toPosixPath(relative)}`,
    );
  }
  return resolved;
}

/** Require a route-like value to be safe, relative, and POSIX-normalized. */
export function validateRelativeRoute(value: string, label: string): string {
  const normalized = value.replaceAll("\\", "/");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.split("/").includes("..") ||
    normalized.includes("\0")
  ) {
    throw new MokabookError(
      "config-invalid",
      `${label} must be a safe relative path`,
    );
  }
  return normalized.replace(/^\.\//, "");
}

/** Normalize and require a portable static catalogue `.html` route. */
export function validateCatalogueRoute(value: string, label: string): string {
  const normalized = validateRelativeRoute(value, label);
  if (!isSafeCatalogueRoute(normalized)) {
    throw new MokabookError(
      "config-invalid",
      `${label} must use portable URL-safe path segments and end in .html`,
    );
  }
  return normalized;
}

/** Return whether a catalogue route is portable as both a path and a URL. */
export function isSafeCatalogueRoute(value: string): boolean {
  return value.endsWith(".html") && isPortableUrlPath(value);
}

/** Return whether every path segment is portable and URL-unreserved. */
export function isPortableUrlPath(value: string): boolean {
  return (
    isSafeRepositoryPath(value) &&
    value.split("/").every((segment) => {
      const stem = segment.split(".", 1)[0] ?? "";
      return (
        PORTABLE_URL_SEGMENT.test(segment) &&
        !segment.endsWith(".") &&
        !WINDOWS_DEVICE.test(stem)
      );
    })
  );
}

/** Percent-encode path segments while retaining their slash hierarchy. */
export function encodeUrlPath(value: string): string {
  return value
    .split("/")
    .map((segment) =>
      encodeURIComponent(segment).replace(
        /[!'()*]/g,
        (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    )
    .join("/");
}

/** Return whether a value is a canonical, portable repository-relative path. */
export function isSafeRepositoryPath(value: string): boolean {
  return (
    value.length > 0 &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value.includes(":") &&
    !value.includes("\0") &&
    !value
      .split("/")
      .some((part) => part === "" || part === "." || part === "..")
  );
}

/** Return whether a candidate path is contained by a configured root. */
export function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!path.isAbsolute(relative) &&
      !relative.startsWith(`..${path.sep}`) &&
      relative !== "..")
  );
}

/** Resolve existing symlinks while projecting a path that may not exist yet. */
export function projectRealPath(candidate: string): string {
  const missingParts: string[] = [];
  let existing = candidate;
  while (!lexicallyExists(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) return candidate;
    missingParts.unshift(path.basename(existing));
    existing = parent;
  }
  return path.resolve(fs.realpathSync(existing), ...missingParts);
}

function lexicallyExists(candidate: string): boolean {
  try {
    fs.lstatSync(candidate);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
