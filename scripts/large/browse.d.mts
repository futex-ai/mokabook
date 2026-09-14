import type { LargeSize } from "../../tests/fixtures/large/generate.js";

export function waitForBrowseChanges(
  url: string,
  timeoutMs?: number,
): Promise<void>;
export function expectedStylesheetChanges(size: LargeSize): number;
