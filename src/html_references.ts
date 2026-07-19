import { parse } from "parse5";

interface HtmlAttribute {
  name: string;
  value: string;
}

interface HtmlNode {
  attrs?: HtmlAttribute[];
  childNodes?: HtmlNode[];
  tagName?: string;
  value?: string;
}

/** URL and fragment data extracted from one complete HTML document. */
export interface HtmlReferences {
  anchors: ReadonlySet<string>;
  hrefs: readonly string[];
  resources: readonly string[];
}

const SOURCE_ATTRIBUTES = new Map<string, readonly string[]>([
  ["audio", ["src"]],
  ["embed", ["src"]],
  ["iframe", ["src"]],
  ["image", ["href", "xlink:href"]],
  ["img", ["src"]],
  ["input", ["src"]],
  ["link", ["href"]],
  ["object", ["data"]],
  ["script", ["src"]],
  ["source", ["src"]],
  ["track", ["src"]],
  ["use", ["href", "xlink:href"]],
  ["video", ["poster", "src"]],
]);

/** Extract navigation links, resource URLs, and anchors from HTML. */
export function extractHtmlReferences(content: string): HtmlReferences {
  const anchors = new Set<string>();
  const hrefs: string[] = [];
  const resources: string[] = [];
  visit(parse(content) as unknown as HtmlNode, (node) => {
    const attributes = new Map(
      (node.attrs ?? []).map((attribute) => [attribute.name, attribute.value]),
    );
    const id = attributes.get("id");
    if (id !== undefined) anchors.add(id);
    const href = attributes.get("href");
    const sourceAttributes = SOURCE_ATTRIBUTES.get(node.tagName ?? "") ?? [];
    if (href !== undefined && !sourceAttributes.includes("href")) {
      hrefs.push(href);
    }
    for (const name of sourceAttributes) {
      const value = attributes.get(name);
      if (value !== undefined) resources.push(value);
    }
    const sourceSet = attributes.get("srcset");
    if (sourceSet) resources.push(...extractSourceSetReferences(sourceSet));
    const inlineStyle = attributes.get("style");
    if (inlineStyle) resources.push(...extractCssReferences(inlineStyle));
    if (node.tagName === "style") {
      const style = (node.childNodes ?? [])
        .map((child) => child.value ?? "")
        .join("");
      resources.push(...extractCssReferences(style));
    }
  });
  return { anchors, hrefs, resources };
}

/** Extract `url()` and string-form `@import` references from CSS. */
export function extractCssReferences(content: string): string[] {
  const withoutComments = content.replace(/\/\*[\s\S]*?\*\//g, "");
  const references = [
    ...withoutComments.matchAll(
      /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s][^)]*?))\s*\)/gi,
    ),
  ].flatMap((match) => match[1] ?? match[2] ?? match[3] ?? []);
  for (const match of withoutComments.matchAll(
    /@import\s+(?:"([^"]*)"|'([^']*)')/gi,
  )) {
    const value = match[1] ?? match[2];
    if (value) references.push(value);
  }
  return references;
}

function extractSourceSetReferences(value: string): string[] {
  const references: string[] = [];
  let position = 0;
  while (position < value.length) {
    while (/[\s,]/.test(value[position] ?? "")) position += 1;
    const start = position;
    while (position < value.length && !/\s/.test(value[position] ?? "")) {
      position += 1;
    }
    const token = value.slice(start, position);
    const reference = token.replace(/,+$/, "");
    if (reference) references.push(reference);
    if (reference !== token) continue;
    while (position < value.length && value[position] !== ",") position += 1;
  }
  return references;
}

function visit(node: HtmlNode, callback: (node: HtmlNode) => void): void {
  callback(node);
  for (const child of node.childNodes ?? []) visit(child, callback);
}
