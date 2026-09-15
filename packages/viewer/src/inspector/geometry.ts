import type { Box } from "../client/frame_adapter.js";
/** Viewport rectangles use edge tuples internally to share clipping arithmetic. */
type Edges = [left: number, top: number, right: number, bottom: number];
export const edges = (rect: DOMRect): Edges => [
  rect.left,
  rect.top,
  rect.right,
  rect.bottom,
];
export const viewport = (doc: Document): Edges => [
  0,
  0,
  doc.defaultView!.innerWidth,
  doc.defaultView!.innerHeight,
];
const intersect = (a: Edges, b: Edges): Edges =>
  a.map((value, axis) =>
    (axis < 2 ? Math.max : Math.min)(value, b[axis]!),
  ) as Edges;
const visible = (box: Edges) => box[2] > box[0] && box[3] > box[1];
/** Read actual element/text rectangles, clipping each node's own ancestors. */
export const geometry = (doc: Document) => {
  const win = doc.defaultView!;
  const frame = viewport(doc);
  if (!frame.every((value) => value >= 0 && value <= 1000000)) throw "limit";
  const candidates = [...doc.querySelectorAll("body *")].map(
    (node) => [node, node.getClientRects()] as const,
  );
  return (range: Range): Box[] => {
    const walker = doc.createTreeWalker(range.commonAncestorContainer, 5);
    const result: Edges[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (range.comparePoint(node, 0)) continue;
      const clip: Edges = [...frame];
      const element =
        node.nodeType === 1 ? (node as Element) : node.parentElement;
      let fixed = false;
      for (let parent = element; parent; parent = parent.parentElement) {
        const style = win.getComputedStyle(parent);
        if (style.visibility !== "visible" || style.opacity === "0") {
          clip[2] = clip[0];
          break;
        }
        if (parent === node || fixed) continue;
        const rect = edges(parent.getBoundingClientRect());
        for (const axis of [0, 1])
          if (
            /(hidden|clip|scroll|auto)/.test(
              axis ? style.overflowY : style.overflowX,
            )
          ) {
            clip[axis] = Math.max(clip[axis]!, rect[axis]!);
            clip[axis + 2] = Math.min(clip[axis + 2]!, rect[axis + 2]!);
          }
        fixed = style.position === "fixed";
      }
      let rendered = node as Element | Range;
      if (node.nodeType !== 1) {
        rendered = doc.createRange();
        rendered.selectNodeContents(node);
      }
      for (const rect of rendered.getClientRects()) {
        const box = intersect(edges(rect), clip);
        if (!visible(box)) continue;
        let pieces = [box];
        for (const [candidate, rects] of candidates) {
          if (range.intersectsNode(candidate)) continue;
          for (const rect of rects) {
            const cut = intersect(box, edges(rect));
            if (
              !visible(cut) ||
              !candidate.contains(
                doc.elementFromPoint(
                  (cut[0] + cut[2]) / 2,
                  (cut[1] + cut[3]) / 2,
                ),
              )
            )
              continue;
            pieces = pieces.flatMap((piece) => {
              const overlap = intersect(piece, cut);
              return visible(overlap)
                ? (
                    [
                      [piece[0], piece[1], piece[2], overlap[1]],
                      [piece[0], overlap[3], piece[2], piece[3]],
                      [piece[0], overlap[1], overlap[0], overlap[3]],
                      [overlap[2], overlap[1], piece[2], overlap[3]],
                    ] satisfies Edges[]
                  ).filter(visible)
                : [piece];
            });
          }
        }
        result.push(...pieces);
      }
    }
    return result
      .filter(
        (box, index) =>
          !result.some(
            (other, j) =>
              intersect(box, other).every(
                (value, axis) => value === box[axis],
              ) &&
              (j < index || other.some((value, axis) => value !== box[axis])),
          ),
      )
      .map(([x, y, right, bottom]) => ({
        x,
        y,
        width: right - x,
        height: bottom - y,
      }));
  };
};
