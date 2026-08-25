/** Typed watched-server updates crossing the parent/child IPC boundary. */

import { isSafeCatalogueRoute } from "../config/paths.js";

/** Mutable running-server state published before clients reload. */
export interface CatalogueUpdate {
  /** Omit to retain state, use `null` when changed-route detection is unavailable. */
  changedRoutes?: readonly string[] | null;
  /** Omit to allocate the next monotonically increasing update version. */
  version?: number;
}

/** Parent-to-child update command with an explicit changed-route snapshot. */
export interface ChildUpdateMessage {
  changedRoutes: readonly string[] | null;
  type: "update";
  version: number;
}

/** Commands accepted by the watched server child. */
export type ChildCommand = ChildUpdateMessage | { type: "shutdown" };

/** Create an immutable IPC update payload from the latest route computation. */
export function childUpdateMessage(
  version: number,
  changedRoutes: readonly string[] | undefined,
): ChildUpdateMessage {
  return {
    changedRoutes: changedRoutes ? [...changedRoutes] : null,
    type: "update",
    version,
  };
}

/** Parse an untrusted IPC value as one complete watched-server update. */
export function parseChildUpdateMessage(
  value: unknown,
): ChildUpdateMessage | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    (value as { type?: unknown }).type !== "update"
  ) {
    return undefined;
  }
  const candidate = value as {
    changedRoutes?: unknown;
    version?: unknown;
  };
  if (
    !Number.isSafeInteger(candidate.version) ||
    (candidate.version as number) <= 0 ||
    !isChangedRoutes(candidate.changedRoutes)
  ) {
    return undefined;
  }
  return {
    changedRoutes: candidate.changedRoutes,
    type: "update",
    version: candidate.version as number,
  };
}

function isChangedRoutes(value: unknown): value is readonly string[] | null {
  return (
    value === null ||
    (Array.isArray(value) &&
      value.every(
        (route) => typeof route === "string" && isSafeCatalogueRoute(route),
      ))
  );
}
