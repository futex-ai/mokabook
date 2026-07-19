import path from "node:path";

import { MokabookError } from "../errors.js";

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
