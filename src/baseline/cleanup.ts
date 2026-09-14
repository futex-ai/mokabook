import path from "node:path";

import {
  cacheLayout,
  MAX_MARKER_BYTES,
  parseCompletionMarker,
  type CacheLayout,
} from "./cache_layout.js";
import { assertBaselineActive } from "./errors.js";
import { tryBaselineLock } from "./lock.js";
import type {
  BaselineBuildRequest,
  BaselineClock,
  BaselineFileSystem,
  BaselineProcessRunner,
} from "./types.js";

/** Retain the newest completed commits; active or locked entries are never removed. */
export async function cleanupBaselines(
  fs: BaselineFileSystem,
  runner: BaselineProcessRunner,
  clock: BaselineClock,
  active: CacheLayout,
  request: BaselineBuildRequest,
  retained: number,
): Promise<void> {
  const entries: { layout: CacheLayout; finishedAt: number }[] = [];
  for (const commit of await fs.list(active.root)) {
    assertBaselineActive(request.signal);
    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(commit)) continue;
    const layout = cacheLayout(request.repoRoot, commit);
    if ((await fs.stat(layout.entry))?.kind !== "directory") continue;
    try {
      if ((await fs.stat(layout.marker))?.kind !== "regular") continue;
      const marker = parseCompletionMarker(
        JSON.parse(
          Buffer.from(await fs.read(layout.marker, MAX_MARKER_BYTES)).toString(
            "utf8",
          ),
        ),
        commit,
      );
      if (marker)
        entries.push({ layout, finishedAt: Date.parse(marker.finishedAt) });
    } catch {
      continue;
    }
  }
  entries.sort(
    (a, b) =>
      b.finishedAt - a.finishedAt ||
      b.layout.entry.localeCompare(a.layout.entry),
  );
  let kept = 1;
  for (const { layout } of entries) {
    assertBaselineActive(request.signal);
    if (layout.entry === active.entry) continue;
    if (kept++ < retained) continue;
    const lock = await tryBaselineLock(fs, runner, clock, layout);
    if (!lock) continue;
    const trash = path.join(
      active.entry,
      `discard-${path.basename(layout.entry)}`,
    );
    try {
      await fs.rename(layout.entry, trash);
      await fs.remove(trash);
    } finally {
      await lock.release();
    }
  }
}
