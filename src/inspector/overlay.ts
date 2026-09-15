import type { Box } from "../client/frame_adapter.js";
/** SVG mask union preserves overlaps; only validated numeric geometry enters markup. */
export const drawOverlay = (
  layer: HTMLElement,
  boxes: readonly Box[],
  width: number,
  height: number,
): void => {
  const rectangle = ({ x, y, width, height }: Box, attributes: string) =>
    `<rect x=${x} y=${y} width=${width} height=${height} ${attributes} />`;
  const viewport = { x: 0, y: 0, width, height };
  let root = layer.shadowRoot;
  if (!root) {
    layer.setAttribute("data-mokly-overlay", "");
    layer.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:2147483647";
    root = layer.attachShadow({ mode: "open" });
  }
  root.innerHTML = `<svg aria-hidden=true width=100% height=100%><mask id=m maskUnits=userSpaceOnUse>${rectangle(viewport, "fill=#fff")}${boxes.map((box) => rectangle(box, "fill=#000")).join("")}</mask>${rectangle(viewport, "fill=rgba(244,246,244,.72) mask=url(#m)")}${boxes.map((box) => rectangle(box, "fill=none stroke=#336249 stroke-width=1.5 rx=3")).join("")}</svg>`;
  if (!layer.isConnected) layer.ownerDocument.documentElement.append(layer);
};
