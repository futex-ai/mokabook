import path from "node:path";

import { parse } from "parse5";

import type { ResolvedRegistryEntry, Viewport } from "../authoring/types.js";
import { MokabookError } from "../errors.js";
import { fragmentRoute } from "../registry/manifest.js";

interface HtmlAttribute {
  name: string;
  value: string;
}

interface HtmlLocation {
  endOffset: number;
  startOffset: number;
}

interface HtmlNode {
  attrs?: HtmlAttribute[];
  childNodes?: HtmlNode[];
  content?: HtmlNode;
  sourceCodeLocation?: {
    attrs?: Readonly<Record<string, HtmlLocation>>;
  } | null;
}

interface Replacement extends HtmlLocation {
  value: string;
}

const MOCK_HREF = /^mock:([a-z0-9]+(?:-[a-z0-9]+)*)(#[A-Za-z][\w:.-]*)?$/;

/** Rewrite complete logical href values while preserving all other HTML bytes. */
export function rewriteMockLinks(
  html: string,
  sourceRoute: string,
  viewport: Viewport,
  byId: ReadonlyMap<string, ResolvedRegistryEntry>,
): string {
  const replacements: Replacement[] = [];
  const document = parse(html, {
    sourceCodeLocationInfo: true,
  }) as unknown as HtmlNode;
  visit(document, (node) => {
    const href = node.attrs?.find((attribute) => attribute.name === "href");
    const match = href ? MOCK_HREF.exec(href.value) : undefined;
    if (!href || !match) return;
    const id = match[1] ?? "";
    const hash = match[2] ?? "";
    const target = byId.get(id);
    if (!target) {
      throw new MokabookError(
        "build-invalid",
        `${sourceRoute} links to unknown id: ${id}`,
      );
    }
    const targetRoute = artifactRoute(target, viewport, byId);
    if (!targetRoute) {
      throw new MokabookError(
        "build-invalid",
        `${sourceRoute} links to collection id: ${id}`,
      );
    }
    const location = node.sourceCodeLocation?.attrs?.[href.name];
    if (!location) {
      throw new MokabookError(
        "build-invalid",
        `${sourceRoute} has an id link without source location`,
      );
    }
    const attributeSource = html.slice(
      location.startOffset,
      location.endOffset,
    );
    const valueRange = attributeValueRange(attributeSource);
    if (!valueRange) {
      throw new MokabookError(
        "build-invalid",
        `${sourceRoute} has an id link that cannot be rewritten`,
      );
    }
    const relative = path.posix.relative(
      path.posix.dirname(sourceRoute),
      targetRoute,
    );
    const linked = `${relative.startsWith(".") ? relative : `./${relative}`}${hash}`;
    replacements.push({
      endOffset: location.startOffset + valueRange.endOffset,
      startOffset: location.startOffset + valueRange.startOffset,
      value: linked,
    });
  });
  return replacements
    .sort((left, right) => right.startOffset - left.startOffset)
    .reduce(
      (content, replacement) =>
        `${content.slice(0, replacement.startOffset)}${replacement.value}${content.slice(replacement.endOffset)}`,
      html,
    );
}

function attributeValueRange(source: string): HtmlLocation | undefined {
  const equals = source.indexOf("=");
  if (equals < 0) return undefined;
  let startOffset = equals + 1;
  while (/\s/.test(source[startOffset] ?? "")) startOffset += 1;
  const quote = source[startOffset];
  if (quote === '"' || quote === "'") {
    startOffset += 1;
    const endOffset = source.indexOf(quote, startOffset);
    return endOffset < 0 ? undefined : { endOffset, startOffset };
  }
  let endOffset = startOffset;
  while (endOffset < source.length && !/\s/.test(source[endOffset] ?? "")) {
    endOffset += 1;
  }
  return endOffset === startOffset ? undefined : { endOffset, startOffset };
}

function artifactRoute(
  entry: ResolvedRegistryEntry,
  viewport: Viewport,
  byId: ReadonlyMap<string, ResolvedRegistryEntry>,
): string | undefined {
  if (entry.kind === "screen") return fragmentRoute(entry.route, viewport);
  if (entry.kind === "collection") return undefined;
  const first = entry.steps[0];
  const screen = first ? byId.get(first.screenId) : undefined;
  return screen?.kind === "screen"
    ? fragmentRoute(screen.route, viewport)
    : undefined;
}

function visit(node: HtmlNode, callback: (node: HtmlNode) => void): void {
  callback(node);
  for (const child of node.childNodes ?? []) visit(child, callback);
  if (node.content) visit(node.content, callback);
}
