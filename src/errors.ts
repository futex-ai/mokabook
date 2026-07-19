/** Stable error codes callers and CLI formatting may branch on. */
export type MokabookErrorCode =
  | "build-invalid"
  | "cli-invalid"
  | "config-invalid"
  | "config-missing"
  | "git-failed"
  | "manifest-invalid"
  | "review-invalid"
  | "server-failed";

/** Typed user-facing failure from a Mokabook boundary. */
export class MokabookError extends Error {
  readonly code: MokabookErrorCode;

  constructor(
    code: MokabookErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(`[mokabook/${code}] ${message}`, options);
    this.name = "MokabookError";
    this.code = code;
  }
}

/** Convert an unknown caught value into a display-safe message. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
