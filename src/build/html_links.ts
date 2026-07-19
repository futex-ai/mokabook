import fs from "node:fs";
import path from "node:path";

import { isPublicStaticFile } from "../config/public_files.js";
import { isSafeRepositoryPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError } from "../errors.js";
import {
  extractCssReferences,
  extractHtmlReferences,
  type HtmlReferences,
} from "../html_references.js";

interface ParsedResource {
  anchors: ReadonlySet<string>;
  references: readonly ResourceReference[];
}

interface ResourceReference {
  checkFragment: boolean;
  value: string;
}

interface ReferenceResult {
  target?: string;
  violation?: string;
}

/** Validate navigation links and transitive local resources in generated HTML. */
export function validateHtmlLinks(
  outputs: ReadonlyMap<string, string>,
  config: ResolvedConfig,
): void {
  const parsed = new Map<string, ParsedResource>();
  for (const [route, content] of outputs) {
    parsed.set(route, htmlResource(extractHtmlReferences(content)));
  }
  const pending = [...outputs.keys()].sort();
  const visited = new Set<string>();
  const violations: string[] = [];
  while (pending.length > 0) {
    const route = pending.shift();
    if (!route || visited.has(route)) continue;
    visited.add(route);
    const resource = parsed.get(route);
    if (!resource) continue;
    for (const reference of resource.references) {
      const result = validateReference(
        reference,
        route,
        resource,
        parsed,
        config,
      );
      if (result.violation) violations.push(`${route}: ${result.violation}`);
      if (
        result.target &&
        !visited.has(result.target) &&
        !pending.includes(result.target)
      ) {
        const targetResource = loadResource(result.target, outputs, config);
        if (targetResource) {
          parsed.set(result.target, targetResource);
          pending.push(result.target);
          pending.sort();
        }
      }
    }
  }
  if (violations.length > 0) {
    throw new MokabookError(
      "build-invalid",
      `document links and resources are invalid:\n${violations
        .sort()
        .map((item) => `- ${item}`)
        .join("\n")}`,
    );
  }
}

function validateReference(
  item: ResourceReference,
  sourceRoute: string,
  source: ParsedResource,
  parsed: Map<string, ParsedResource>,
  config: ResolvedConfig,
): ReferenceResult {
  const reference = item.value;
  if (
    reference === "" ||
    reference.startsWith("?") ||
    /^(?:https?:|mailto:|tel:|data:)/i.test(reference)
  ) {
    return {};
  }
  if (reference.startsWith("mock:")) {
    return { violation: `unresolved id link ${reference}` };
  }
  if (reference.startsWith("/")) {
    return { violation: `root-absolute link is not portable: ${reference}` };
  }
  if (reference.startsWith("#")) {
    return item.checkFragment ? fragmentResult(reference, source) : {};
  }
  const [withoutHash, rawHash] = reference.split("#", 2);
  const rawPath = (withoutHash ?? "").split("?", 1)[0] ?? "";
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return { violation: `invalid URL encoding: ${reference}` };
  }
  if (decodedPath.startsWith("/") || decodedPath.startsWith("\\")) {
    return { violation: `root-absolute link is not portable: ${reference}` };
  }
  const rawTarget = path.posix.normalize(
    path.posix.join(path.posix.dirname(sourceRoute), decodedPath),
  );
  if (
    rawTarget === ".." ||
    rawTarget.startsWith("../") ||
    !isSafeRepositoryPath(rawTarget)
  ) {
    return { violation: `link escapes mockupsDir: ${reference}` };
  }
  const target = rawTarget.replace(/^\.\//, "");
  let targetResource = parsed.get(target);
  if (!targetResource) {
    targetResource = loadResource(target, new Map(), config);
    if (!targetResource) return { violation: `missing target ${reference}` };
    parsed.set(target, targetResource);
  }
  if (rawHash && item.checkFragment) {
    let fragment: string;
    try {
      fragment = decodeURIComponent(rawHash);
    } catch {
      return { violation: `invalid URL encoding: ${reference}` };
    }
    if (!targetResource.anchors.has(fragment)) {
      return { violation: `missing target anchor ${reference}` };
    }
  }
  return { target };
}

function fragmentResult(
  reference: string,
  source: ParsedResource,
): ReferenceResult {
  let fragment: string;
  try {
    fragment = decodeURIComponent(reference.slice(1));
  } catch {
    return { violation: `invalid URL encoding: ${reference}` };
  }
  return source.anchors.has(fragment)
    ? {}
    : { violation: `missing anchor ${reference}` };
}

function loadResource(
  route: string,
  outputs: ReadonlyMap<string, string>,
  config: ResolvedConfig,
): ParsedResource | undefined {
  const generated = outputs.get(route);
  if (generated !== undefined)
    return htmlResource(extractHtmlReferences(generated));
  const candidate = path.resolve(config.mockupsDir, route);
  if (!isPublicStaticFile(candidate, config)) return undefined;
  const extension = path.posix.extname(route).toLowerCase();
  if (extension !== ".css" && extension !== ".html" && extension !== ".htm") {
    return { anchors: new Set(), references: [] };
  }
  const content = fs.readFileSync(candidate, "utf8");
  return extension === ".css"
    ? {
        anchors: new Set(),
        references: extractCssReferences(content).map((value) => ({
          checkFragment: false,
          value,
        })),
      }
    : htmlResource(extractHtmlReferences(content));
}

function htmlResource(references: HtmlReferences): ParsedResource {
  const navigation = references.hrefs.map((value) => ({
    checkFragment: true,
    value,
  }));
  const resources = references.resources.map((value) => ({
    checkFragment: false,
    value,
  }));
  return {
    anchors: references.anchors,
    references: distinctReferences([...navigation, ...resources]),
  };
}

function distinctReferences(
  references: readonly ResourceReference[],
): ResourceReference[] {
  const seen = new Set<string>();
  return references.filter((reference) => {
    const key = `${reference.checkFragment}:${reference.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
