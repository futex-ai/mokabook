import fs from "node:fs";
import path from "node:path";

import { parse } from "parse5";

import type { ResolvedConfig } from "../config/types.js";
import { isInside } from "../config/paths.js";
import { MokabookError } from "../errors.js";

interface HtmlAttribute {
  name: string;
  value: string;
}

interface HtmlNode {
  attrs?: HtmlAttribute[];
  childNodes?: HtmlNode[];
}

interface DocumentLinks {
  anchors: ReadonlySet<string>;
  hrefs: readonly string[];
}

/** Validate relative document links and anchors across generated output. */
export function validateHtmlLinks(
  outputs: ReadonlyMap<string, string>,
  configuredRoutes: ReadonlySet<string>,
  config: ResolvedConfig,
): void {
  const parsed = new Map(
    [...outputs].map(([route, content]) => [route, documentLinks(content)]),
  );
  const violations: string[] = [];
  for (const [route, links] of parsed) {
    for (const href of links.hrefs) {
      const violation = validateHref(
        href,
        route,
        links,
        parsed,
        configuredRoutes,
        config,
      );
      if (violation) violations.push(`${route}: ${violation}`);
    }
  }
  if (violations.length > 0) {
    throw new MokabookError(
      "build-invalid",
      `document links are invalid:\n${violations
        .sort()
        .map((item) => `- ${item}`)
        .join("\n")}`,
    );
  }
}

function validateHref(
  href: string,
  sourceRoute: string,
  source: DocumentLinks,
  parsed: ReadonlyMap<string, DocumentLinks>,
  configuredRoutes: ReadonlySet<string>,
  config: ResolvedConfig,
): string | undefined {
  if (
    href === "" ||
    href.startsWith("?") ||
    /^(?:https?:|mailto:|tel:|data:)/.test(href)
  )
    return undefined;
  if (href.startsWith("mock:")) return `unresolved id link ${href}`;
  if (href.startsWith("/")) return undefined;
  if (href.startsWith("#")) {
    return source.anchors.has(decodeURIComponent(href.slice(1)))
      ? undefined
      : `missing anchor ${href}`;
  }
  const [withoutHash, rawHash] = href.split("#", 2);
  const rawPath = (withoutHash ?? "").split("?", 1)[0] ?? "";
  const rawTarget = path.posix.normalize(
    path.posix.join(
      path.posix.dirname(sourceRoute),
      decodeURIComponent(rawPath),
    ),
  );
  if (rawTarget === ".." || rawTarget.startsWith("../"))
    return `link escapes mockupsDir: ${href}`;
  const target = rawTarget.replace(/^\.\//, "");
  const generated = parsed.get(target);
  if (!generated && !configuredRoutes.has(target)) {
    const absolute = path.resolve(config.mockupsDir, target);
    if (!isInside(config.mockupsDir, absolute) || !fs.existsSync(absolute))
      return `missing target ${href}`;
  }
  if (rawHash) {
    const targetLinks = generated ?? readAuthoredLinks(config, target);
    if (!targetLinks?.anchors.has(decodeURIComponent(rawHash))) {
      return `missing target anchor ${href}`;
    }
  }
  return undefined;
}

function readAuthoredLinks(
  config: ResolvedConfig,
  route: string,
): DocumentLinks | undefined {
  const candidate = path.resolve(config.mockupsDir, route);
  if (!isInside(config.mockupsDir, candidate) || !fs.existsSync(candidate))
    return undefined;
  return documentLinks(fs.readFileSync(candidate, "utf8"));
}

function documentLinks(html: string): DocumentLinks {
  const anchors = new Set<string>();
  const hrefs: string[] = [];
  visit(parse(html) as unknown as HtmlNode, (attributes) => {
    for (const attribute of attributes) {
      if (attribute.name === "id") anchors.add(attribute.value);
      if (attribute.name === "href") hrefs.push(attribute.value);
    }
  });
  return { anchors, hrefs };
}

function visit(
  node: HtmlNode,
  callback: (attributes: readonly HtmlAttribute[]) => void,
): void {
  if (node.attrs) callback(node.attrs);
  for (const child of node.childNodes ?? []) visit(child, callback);
}
