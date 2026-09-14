import { setTimeout } from "node:timers/promises";

/** Current file-level attribution includes linked screens and flows that reuse them. */
export function expectedStylesheetChanges(size) {
  const linked = size.stylesheets
    ? Math.ceil(size.screens * size.stylesheetShare)
    : 0;
  const flows =
    Math.ceil(linked / 10) +
    Number(linked > 0 && linked < size.screens && size.screens % 10 === 1);
  return size.areas * (linked + flows);
}

/** Classification publication precedes asynchronous IPC delivery and child adoption. */
export async function waitForBrowseChanges(url, timeoutMs = 300000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(
        Math.min(60000, Math.max(1, deadline - Date.now())),
      ),
    });
    if (!response.ok)
      throw new Error(`Browse returned HTTP ${response.status}`);
    const html = await response.text();
    if (html.includes('data-changes-status="ready"')) return;
    if (html.includes('data-changes-status="unavailable"'))
      throw new Error("Changes is unavailable in Browse");
    await setTimeout(100);
  }
  throw new Error("Changes was not delivered to Browse before the deadline");
}
