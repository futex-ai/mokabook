import fs from "node:fs";
import path from "node:path";

import { parse } from "parse5";

import { isInside, isSafeRepositoryPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError, errorMessage } from "../errors.js";
import type { GitClient } from "./git.js";
import { addArtifactFile, snapshotPath } from "./paths.js";
import type { ReviewArtifactContent } from "./types.js";

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

/** Filesystem boundary for current-worktree Review assets. */
export interface ReviewAssetReader {
  read(route: string): Promise<Uint8Array>;
}

/** Confined filesystem implementation for current-worktree Review assets. */
export class FileSystemReviewAssetReader implements ReviewAssetReader {
  constructor(private readonly config: ResolvedConfig) {}

  async read(route: string): Promise<Uint8Array> {
    const candidate = assertPublicStaticRoute(route, this.config);
    try {
      const [realRoot, realCandidate] = await Promise.all([
        fs.promises.realpath(this.config.mockupsDir),
        fs.promises.realpath(candidate),
      ]);
      const sourceRoots = await Promise.all([
        fs.promises.realpath(this.config.entriesDir),
        ...(this.config.legacy
          ? [fs.promises.realpath(this.config.legacy.pagesDir)]
          : []),
      ]);
      if (
        !isInside(realRoot, realCandidate) ||
        sourceRoots.some((root) => isInside(root, realCandidate)) ||
        !(await fs.promises.stat(realCandidate)).isFile()
      ) {
        throw assetError(route, "not a public static file");
      }
      return await fs.promises.readFile(realCandidate);
    } catch (error) {
      if (error instanceof MokabookError) throw error;
      throw assetError(route, errorMessage(error), error);
    }
  }
}

/** Confined Git implementation for base-commit Review assets. */
export class GitReviewAssetReader implements ReviewAssetReader {
  constructor(
    private readonly config: ResolvedConfig,
    private readonly git: GitClient,
    private readonly commit: string,
    private readonly mockupsPrefix: string,
  ) {}

  async read(route: string): Promise<Uint8Array> {
    assertPublicStaticRoute(route, this.config);
    const repoPath =
      this.mockupsPrefix === "" ? route : `${this.mockupsPrefix}/${route}`;
    try {
      const kind = await this.git.fileKind(this.commit, repoPath);
      if (kind !== "regular") {
        throw assetError(route, `not a regular Git file (${kind})`);
      }
      return await this.git.readFileBytes(this.commit, repoPath);
    } catch (error) {
      if (error instanceof MokabookError && error.code === "review-invalid") {
        throw error;
      }
      throw assetError(route, errorMessage(error), error);
    }
  }
}

/** Copy a pane and every transitively referenced local CSS/static dependency. */
export async function copySnapshotDependencies(
  files: Map<string, ReviewArtifactContent>,
  side: "after" | "before",
  seedRoutes: ReadonlySet<string>,
  read: (route: string) => Promise<ReviewArtifactContent>,
): Promise<void> {
  const queued = [...seedRoutes].sort();
  const seen = new Set<string>();
  while (queued.length > 0) {
    const route = queued.shift();
    if (!route || seen.has(route)) continue;
    seen.add(route);
    const artifactPath = snapshotPath(side, route);
    let content = files.get(artifactPath);
    if (content === undefined) {
      content = await read(route);
      addArtifactFile(files, artifactPath, content);
    }
    for (const dependency of referencedRoutes(route, content)) {
      if (!seen.has(dependency) && !queued.includes(dependency)) {
        queued.push(dependency);
        queued.sort();
      }
    }
  }
}

function referencedRoutes(
  sourceRoute: string,
  content: ReviewArtifactContent,
): string[] {
  const extension = path.posix.extname(sourceRoute).toLowerCase();
  const text =
    typeof content === "string"
      ? content
      : Buffer.from(content).toString("utf8");
  const references =
    extension === ".css"
      ? cssReferences(text)
      : extension === ".html" || extension === ".htm"
        ? htmlReferences(text)
        : [];
  return [
    ...new Set(
      references.flatMap((reference) => {
        const resolved = resolveReference(sourceRoute, reference);
        return resolved ? [resolved] : [];
      }),
    ),
  ].sort();
}

function htmlReferences(content: string): string[] {
  const references: string[] = [];
  visit(parse(content) as unknown as HtmlNode, (node) => {
    const attributes = new Map(
      (node.attrs ?? []).map((attribute) => [attribute.name, attribute.value]),
    );
    const sourceAttribute = sourceAttributeFor(node.tagName, attributes);
    if (sourceAttribute) references.push(sourceAttribute);
    const sourceSet = attributes.get("srcset");
    if (sourceSet) references.push(...sourceSetReferences(sourceSet));
    const inlineStyle = attributes.get("style");
    if (inlineStyle) references.push(...cssReferences(inlineStyle));
    if (node.tagName === "style") {
      const style = (node.childNodes ?? [])
        .map((child) => child.value ?? "")
        .join("");
      references.push(...cssReferences(style));
    }
  });
  return references;
}

function sourceAttributeFor(
  tagName: string | undefined,
  attributes: ReadonlyMap<string, string>,
): string | undefined {
  if (tagName === "link") return attributes.get("href");
  if (tagName === "object") return attributes.get("data");
  if (tagName === "video")
    return attributes.get("poster") ?? attributes.get("src");
  if (
    ["audio", "embed", "img", "input", "script", "source", "track"].includes(
      tagName ?? "",
    )
  ) {
    return attributes.get("src");
  }
  if (tagName === "use")
    return attributes.get("href") ?? attributes.get("xlink:href");
  return undefined;
}

function cssReferences(content: string): string[] {
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

function sourceSetReferences(value: string): string[] {
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

function resolveReference(
  sourceRoute: string,
  rawReference: string,
): string | undefined {
  const reference = rawReference.trim();
  if (
    reference === "" ||
    reference.startsWith("#") ||
    reference.startsWith("/") ||
    reference.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(reference)
  ) {
    return undefined;
  }
  const encodedPath = reference.split(/[?#]/, 1)[0] ?? "";
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(encodedPath);
  } catch (error) {
    throw assetError(sourceRoute, `invalid asset URL ${reference}`, error);
  }
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(sourceRoute), decodedPath),
  );
  if (!isSafeRepositoryPath(resolved)) {
    throw assetError(sourceRoute, `asset URL escapes mockupsDir: ${reference}`);
  }
  return resolved;
}

function visit(node: HtmlNode, callback: (node: HtmlNode) => void): void {
  callback(node);
  for (const child of node.childNodes ?? []) visit(child, callback);
}

function assertPublicStaticRoute(
  route: string,
  config: ResolvedConfig,
): string {
  if (!isSafeRepositoryPath(route)) throw assetError(route, "unsafe path");
  const candidate = path.resolve(config.mockupsDir, route);
  if (
    !isInside(config.mockupsDir, candidate) ||
    isInside(config.entriesDir, candidate) ||
    Boolean(config.legacy && isInside(config.legacy.pagesDir, candidate))
  ) {
    throw assetError(route, "not a public static file");
  }
  return candidate;
}

function assetError(
  route: string,
  detail: string,
  cause?: unknown,
): MokabookError {
  return new MokabookError(
    "review-invalid",
    `could not retain Review asset ${route}: ${detail}`,
    cause === undefined ? undefined : { cause },
  );
}
