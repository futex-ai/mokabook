import { MoklyError } from "../errors.js";

/** Contextual failure at the static-export boundary. */
export function exportError(message: string, cause?: unknown): MoklyError {
  return new MoklyError("export-invalid", message, { cause });
}

/** Stop before committing output after a cancellation request. */
export function assertExportActive(signal?: AbortSignal): void {
  if (signal?.aborted) throw exportError("Export cancelled; retry when ready.");
}
