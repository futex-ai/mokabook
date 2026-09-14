/** Read-only DOM range authentication and clipped geometry in immediate frames. */
import type { ComponentViewRecord } from "../components/manifest_types.js";
import { componentNodeRects } from "./component_range_nodes.js";
import { uncoveredBoxes } from "./component_occlusion.js";

export interface ComponentBounds {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface AuthenticatedRanges {
  doc: Document;
  ranges: ReadonlyMap<string, readonly Range[]>;
}
export function authenticateRanges(
  frame: HTMLIFrameElement,
  path: string,
  usage: ComponentViewRecord,
): AuthenticatedRanges | undefined {
  try {
    const doc = frame.contentDocument;
    const parent = frame.ownerDocument;
    const location = doc?.defaultView?.location;
    if (
      !doc ||
      !location ||
      doc.defaultView?.frameElement !== frame ||
      frame.sandbox.value !== "allow-same-origin" ||
      location.origin !== parent.defaultView?.location.origin
    )
      return;
    const actual = decodeURIComponent(location.pathname).replace(/\.html$/, "");
    const expected = path.startsWith("/__mokly/components/renders/")
      ? path
      : `/static/${path}`;
    if (actual !== expected.replace(/\.html$/, "")) return;
    const walker = doc.createTreeWalker(doc, 128);
    const stack: { id: string; node: Node }[] = [];
    const ranges = new Map<string, Range[]>();
    let next = 0;
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent ?? "";
      if (!text.startsWith("mokly-component:")) continue;
      const match = /^mokly-component:(start|end):(r-[0-9]+)$/.exec(text);
      if (!match) return;
      const record = usage.ranges.find((item) => item.id === match[2]);
      if (!record) return;
      if (match[1] === "start") {
        if (
          usage.ranges[next++]?.id !== record.id ||
          record.parentId !== stack.at(-1)?.id
        )
          return;
        stack.push({ id: record.id, node });
      } else {
        const start = stack.pop();
        if (start?.id !== record.id) return;
        if (record.target.kind !== "instance") continue;
        const range = doc.createRange();
        range.setStartAfter(start.node);
        range.setEndBefore(node);
        const key = record.target.instanceKey;
        ranges.set(key, [...(ranges.get(key) ?? []), range]);
      }
    }
    if (stack.length || next !== usage.ranges.length) return;
    return { doc, ranges };
  } catch {
    return;
  }
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
function intersect(a: Box, b: Box): Box | undefined {
  const box = {
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  };
  return box.right > box.left && box.bottom > box.top ? box : undefined;
}
function clipAncestors(
  box: Box,
  node: Element | null,
  win: Window,
): Box | undefined {
  let current: Box | undefined = box;
  for (let parent = node; parent && current; parent = parent.parentElement) {
    const style = win.getComputedStyle(parent);
    const bounds = parent.getBoundingClientRect();
    const clipX = /(hidden|clip|scroll|auto)/.test(style.overflowX);
    const clipY = /(hidden|clip|scroll|auto)/.test(style.overflowY);
    if (clipX || clipY)
      current = intersect(current, {
        left: clipX ? bounds.left : current.left,
        right: clipX ? bounds.right : current.right,
        top: clipY ? bounds.top : current.top,
        bottom: clipY ? bounds.bottom : current.bottom,
      });
    if (style.position === "fixed") break;
  }
  return current;
}
/** Read each actual range without inserting wrappers or changing consumer styles. */
export function rangeBounds(
  frame: HTMLIFrameElement,
  authenticated: AuthenticatedRanges,
  keys: ReadonlySet<string>,
): ComponentBounds[] {
  const { doc, ranges } = authenticated;
  const win = doc.defaultView!;
  const result: ComponentBounds[] = [];
  const candidates = [...doc.querySelectorAll("body *")];
  const rects = new WeakMap<Element, readonly DOMRect[]>();
  for (const [key, values] of ranges) {
    if (!keys.has(key)) continue;
    for (const range of values) {
      for (const { rect, parent } of componentNodeRects(range)) {
        let box = intersect(rect, {
          left: 0,
          top: 0,
          right: frame.clientWidth,
          bottom: frame.clientHeight,
        });
        if (!box) continue;
        box = clipAncestors(box, parent, win);
        if (!box) continue;
        for (const visible of uncoveredBoxes(box, range, candidates, rects))
          result.push({
            key,
            x: visible.left,
            y: visible.top,
            width: visible.right - visible.left,
            height: visible.bottom - visible.top,
          });
      }
    }
  }
  return result.filter(
    (box, index) =>
      !result.some(
        (other, otherIndex) =>
          other.key === box.key &&
          otherIndex !== index &&
          other.x <= box.x &&
          other.y <= box.y &&
          other.x + other.width >= box.x + box.width &&
          other.y + other.height >= box.y + box.height &&
          (other.width > box.width ||
            other.height > box.height ||
            otherIndex < index),
      ),
  );
}
export function visibleFrameBox(frame: HTMLIFrameElement): Box | undefined {
  const win = frame.ownerDocument.defaultView!;
  const bounds = frame.getBoundingClientRect();
  const viewport = intersect(bounds, {
    left: 0,
    top: 0,
    right: win.innerWidth,
    bottom: win.innerHeight,
  });
  return viewport
    ? clipAncestors(viewport, frame.parentElement, win)
    : undefined;
}
