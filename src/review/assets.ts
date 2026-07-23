import path from "node:path";

import { readPublicStaticFile } from "../config/public_files.js";
import { isInside, isSafeRepositoryPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError, errorMessage } from "../errors.js";
import {
  extractCssReferences,
  extractHtmlReferences,
} from "../html_references.js";
import type { GitClient } from "./git.js";
import { addArtifactFile, snapshotPath } from "./paths.js";
import type { ReviewArtifactContent } from "./types.js";

/** Filesystem boundary for current-worktree Review assets. */
export interface ReviewAssetReader {
  read(route: string, signal?: AbortSignal): Promise<Uint8Array>;
}

/** Confined filesystem implementation for current-worktree Review assets. */
export class FileSystemReviewAssetReader implements ReviewAssetReader {
  constructor(private readonly config: ResolvedConfig) {}

  async read(route: string, signal?: AbortSignal): Promise<Uint8Array> {
    signal?.throwIfAborted();
    const candidate = assertPublicStaticRoute(route, this.config);
    const file = readPublicStaticFile(candidate, this.config);
    signal?.throwIfAborted();
    if (!file) throw assetError(route, "not a public static file");
    return file.content;
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

  async read(route: string, signal?: AbortSignal): Promise<Uint8Array> {
    signal?.throwIfAborted();
    assertPublicStaticRoute(route, this.config);
    const repoPath =
      this.mockupsPrefix === "" ? route : `${this.mockupsPrefix}/${route}`;
    try {
      const kind = await this.git.fileKind(this.commit, repoPath);
      signal?.throwIfAborted();
      if (kind !== "regular") {
        throw assetError(route, `not a regular Git file (${kind})`);
      }
      const content = await this.git.readFileBytes(this.commit, repoPath);
      signal?.throwIfAborted();
      return content;
    } catch (error) {
      signal?.throwIfAborted();
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
  read: (route: string, signal?: AbortSignal) => Promise<ReviewArtifactContent>,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  const queued = [...seedRoutes].sort();
  const seen = new Set<string>();
  while (queued.length > 0) {
    signal?.throwIfAborted();
    const route = queued.shift();
    if (!route || seen.has(route)) continue;
    seen.add(route);
    const artifactPath = snapshotPath(side, route);
    let content = files.get(artifactPath);
    if (content === undefined) {
      content = await read(route, signal);
      signal?.throwIfAborted();
      addArtifactFile(files, artifactPath, content);
    }
    for (const dependency of referencedRoutes(route, content)) {
      signal?.throwIfAborted();
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
      ? extractCssReferences(text)
      : extension === ".html" || extension === ".htm"
        ? extractHtmlReferences(text).resources
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

function resolveReference(
  sourceRoute: string,
  rawReference: string,
): string | undefined {
  const reference = rawReference.trim();
  if (reference.startsWith("//")) {
    throw assetError(
      sourceRoute,
      `non-portable asset URL ${reference} (protocol-relative)`,
    );
  }
  if (reference.startsWith("/")) {
    throw assetError(
      sourceRoute,
      `non-portable asset URL ${reference} (root-absolute)`,
    );
  }
  if (
    reference === "" ||
    reference.startsWith("#") ||
    /^(?:https?:|data:)/i.test(reference)
  ) {
    return undefined;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(reference)) {
    throw assetError(
      sourceRoute,
      `non-portable asset URL ${reference} (unsupported scheme)`,
    );
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
