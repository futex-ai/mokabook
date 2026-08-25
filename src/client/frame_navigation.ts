/** Trusted parent enhancement for logical links in immediate Browse frames. */

import { logicalMarker, parseLogicalMarker } from "../navigation/logical.js";
import { parseBrowsingTarget } from "../navigation/target.js";

/** Input facts for one marked frame-link activation. */
export interface FrameActivationCandidate {
  altKey: boolean;
  button: number;
  ctrlKey: boolean;
  download: boolean;
  eventType: "auxclick" | "click";
  marker: string;
  metaKey: boolean;
  shiftKey: boolean;
  target: string | null;
}

/** Parent-owned action derived from a trusted marked link. */
export type FrameActivation =
  | { href: string; kind: "navigate" }
  | { href: string; kind: "open"; target: string };

/** Callbacks owned by the outer Browse navigation lifecycle. */
export interface FrameNavigationActions {
  navigate(href: string): void;
  open(href: string, target: string): void;
}

const attachedFrames = new WeakSet<HTMLIFrameElement>();
const attachedDocuments = new WeakSet<Document>();

/** Classify an activation without trusting a portable href. */
export function classifyFrameActivation(
  candidate: FrameActivationCandidate,
): FrameActivation | undefined {
  const destination = parseLogicalMarker(candidate.marker);
  if (!destination || logicalMarker(destination) !== candidate.marker) {
    return undefined;
  }
  if (candidate.download || candidate.altKey) return undefined;
  if (candidate.eventType === "click" && candidate.button !== 0)
    return undefined;
  if (candidate.eventType === "auxclick" && candidate.button !== 1) {
    return undefined;
  }
  const target = parseBrowsingTarget(candidate.target);
  if (target.kind === "invalid") return undefined;
  const href = `/id/${encodeURIComponent(destination.id)}${
    destination.fragment
      ? `?fragment=${encodeURIComponent(destination.fragment)}`
      : ""
  }`;
  if (target.kind === "top" || target.kind === "parent") {
    return { href, kind: "navigate" };
  }
  if (target.kind === "blank") return { href, kind: "open", target: "_blank" };
  if (target.kind === "named") {
    return { href, kind: "open", target: target.name };
  }
  const modified = candidate.metaKey || candidate.ctrlKey || candidate.shiftKey;
  return modified || candidate.eventType === "auxclick"
    ? { href, kind: "open", target: "_blank" }
    : { href, kind: "navigate" };
}

/** Attach enhancement to every immediate shell-owned fragment frame. */
export function attachFrameNavigation(
  doc: Document,
  actions: FrameNavigationActions,
): void {
  for (const frame of doc.querySelectorAll<HTMLIFrameElement>(
    "iframe.mbk-frag",
  )) {
    if (!attachedFrames.has(frame)) {
      attachedFrames.add(frame);
      frame.addEventListener("load", () => attachDocument(frame, actions));
    }
    attachDocument(frame, actions);
  }
}

function attachDocument(
  frame: HTMLIFrameElement,
  actions: FrameNavigationActions,
): void {
  let doc: Document | null;
  try {
    doc = frame.contentDocument;
  } catch {
    return;
  }
  if (!doc || attachedDocuments.has(doc)) return;
  attachedDocuments.add(doc);
  const activate = (event: Event): void => {
    const view = doc.defaultView;
    if (!view || !(event instanceof view.MouseEvent)) return;
    const source = event.target;
    if (!(source instanceof view.Element) || source.ownerDocument !== doc)
      return;
    const link = source.closest<HTMLElement>("[data-mokabook-link]");
    if (!link || link.ownerDocument !== doc || !isNativeLink(link)) return;
    const action = classifyFrameActivation({
      altKey: event.altKey,
      button: event.button,
      ctrlKey: event.ctrlKey,
      download: link.hasAttribute("download"),
      eventType: event.type === "auxclick" ? "auxclick" : "click",
      marker: link.getAttribute("data-mokabook-link") ?? "",
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      target: link.getAttribute("data-mokabook-target"),
    });
    if (!action) return;
    event.preventDefault();
    if (action.kind === "navigate") actions.navigate(action.href);
    else actions.open(action.href, action.target);
  };
  doc.addEventListener("click", activate);
  doc.addEventListener("auxclick", activate);
}

function isNativeLink(element: Element): boolean {
  const namespace = element.namespaceURI;
  return (
    (namespace === "http://www.w3.org/1999/xhtml" &&
      (element.localName === "a" || element.localName === "area")) ||
    (namespace === "http://www.w3.org/2000/svg" && element.localName === "a")
  );
}
