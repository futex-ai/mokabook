import type { ComponentViewRecord } from "../components/manifest_types.js";
import { inspection } from "../inspector/inspection.js";

import { authenticateRanges, rangeBounds } from "./component_geometry.js";
import type { HighlightFrame } from "./component_highlight.js";
import type { FrameAdapter } from "./frame_adapter.js";
import { FrameError } from "./frame_error.js";
import { frameUrl } from "./frame_mount.js";
import { frameUsage } from "./frame_usage.js";
import { localFrameAccess } from "./same_origin_access.js";
import { installLocalHighlight } from "./same_origin_highlight.js";
import { mountLocalDocument } from "./same_origin_mount.js";

/** Current-document capability used by the synchronous, SSR-enhanced local shell. */
export function localInspection(
  frame: HTMLIFrameElement,
  path: string,
  usage: ComponentViewRecord,
) {
  const authenticated = authenticateRanges(frame, path, usage);
  if (!authenticated) return;
  return {
    measure: (keys: ReadonlySet<string>) =>
      rangeBounds(frame, authenticated, keys),
    reveal: (key: string) => {
      const range = authenticated.ranges.get(key)?.[0];
      const node = range?.startContainer.childNodes[range.startOffset];
      const target =
        node?.nodeType === 1 ? (node as Element) : node?.parentElement;
      target?.scrollIntoView({ block: "nearest", inline: "nearest" });
    },
  };
}
export function localPresentation(
  root: HTMLElement,
  frames: readonly HighlightFrame[],
  selected: string | undefined,
  label: (key: string) => string,
  select: (key: string, viewport: "mobile" | "desktop") => void,
  exit: () => void,
): () => void {
  return installLocalHighlight(root, frames, selected, label, select, exit);
}
export function replaceLocalFrame(frame: HTMLIFrameElement, url: URL): void {
  localFrameAccess(frame).replace(url);
}
export function localFramePath(frame: HTMLIFrameElement): string | undefined {
  return localFrameAccess(frame).pathname();
}
export function localFrameReady(
  frame: HTMLIFrameElement,
  path: string,
): boolean {
  return (
    localFrameAccess(frame).document()?.readyState === "complete" &&
    decodeURIComponent(localFramePath(frame)!).replace(/\.html$/, "") ===
      `/static/${path}`.replace(/\.html$/, "")
  );
}

/** Script-disabled local mounts retain the parent-owned highlight presentation. */
export function sameOriginAdapter(): FrameAdapter {
  return {
    async mount(frame, view) {
      const win = frame.ownerDocument.defaultView;
      if (!win) throw new FrameError("unavailable");
      const url = frameUrl(frame, view, win.location.origin);
      const usage = frameUsage(view.usage);
      return mountLocalDocument(frame, url, (doc, emit) => {
        const reader = inspection(doc, usage);
        let stop = () => {};
        let selecting = false;
        const record: ComponentViewRecord | undefined =
          view.usage.status === "ready"
            ? {
                ...view.usage,
                viewport:
                  frame.dataset["workspaceFrame"] === "mobile"
                    ? "mobile"
                    : "desktop",
                colorScheme: "light",
                styles: [],
                resources: [],
              }
            : undefined;
        return {
          list: reader.__list,
          scroll: reader.__scroll,
          selecting: () => selecting,
          highlight(keys, mode) {
            if (mode !== "off") reader.__keys(keys);
            stop();
            stop = () => {};
            selecting = mode !== "off";
            if (mode === "off" || !record) return;
            stop = installLocalHighlight(
              frame.ownerDocument.body,
              [
                {
                  frame,
                  path: decodeURIComponent(url.pathname).slice(8),
                  usage: record,
                },
              ],
              undefined,
              undefined,
              (key) =>
                emit({
                  type: "click",
                  key,
                  boxes: reader
                    .__list()
                    .find((item) => item.key === key)!
                    .ranges.flatMap((range) => range.boxes),
                }),
              () => {
                selecting = false;
                stop();
                emit({ type: "pick-end", reason: "escape" });
              },
              new Set(keys),
            );
          },
          dispose: () => stop(),
        };
      });
    },
  };
}
