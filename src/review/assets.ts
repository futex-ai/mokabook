import fs from "node:fs";
import path from "node:path";

import { isInside, isSafeRepositoryPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError, errorMessage } from "../errors.js";
import {
  extractCssReferences,
  extractHtmlReferences,
} from "../html_references.js";
import type { GitClient, GitFile } from "./git.js";
import { addArtifactFile, snapshotPath } from "./paths.js";
import type { ReviewArtifactContent } from "./types.js";

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
    const files = await this.readMany([route]);
    const content = files.get(route);
    if (!content) throw assetError(route, "Git batch omitted the file");
    return content;
  }

  /** Read and validate many base-snapshot assets in one bounded Git batch. */
  async readMany(
    routes: readonly string[],
  ): Promise<ReadonlyMap<string, Uint8Array>> {
    const requested = [...new Set(routes)].sort().map((route) => {
      assertPublicStaticRoute(route, this.config);
      return {
        repoPath:
          this.mockupsPrefix === "" ? route : `${this.mockupsPrefix}/${route}`,
        route,
      };
    });
    try {
      const repoPaths = requested.map(({ repoPath }) => repoPath);
      const gitFiles = this.git.readFiles
        ? await this.git.readFiles(this.commit, repoPaths)
        : await readGitFilesIndividually(this.git, this.commit, repoPaths);
      const files = new Map<string, Uint8Array>();
      for (const { repoPath, route } of requested) {
        const file = gitFiles.get(repoPath);
        if (!file || file.kind !== "regular") {
          throw assetError(
            route,
            `not a regular Git file (${file?.kind ?? "missing"})`,
          );
        }
        files.set(route, file.bytes);
      }
      return files;
    } catch (error) {
      if (error instanceof MokabookError && error.code === "review-invalid") {
        throw error;
      }
      throw assetError(
        requested[0]?.route ?? "base snapshot",
        errorMessage(error),
        error,
      );
    }
  }
}

/** Copy a pane and every transitively referenced local CSS/static dependency. */
export async function copySnapshotDependencies(
  files: Map<string, ReviewArtifactContent>,
  side: "after" | "before",
  seedRoutes: ReadonlySet<string>,
  read: (route: string) => Promise<ReviewArtifactContent>,
  readMany?: (
    routes: readonly string[],
  ) => Promise<ReadonlyMap<string, ReviewArtifactContent>>,
): Promise<void> {
  let queued = [...seedRoutes].sort();
  const seen = new Set<string>();
  while (queued.length > 0) {
    const batch = queued.filter((route) => !seen.has(route));
    for (const route of batch) seen.add(route);
    const missing = batch.filter(
      (route) => files.get(snapshotPath(side, route)) === undefined,
    );
    if (missing.length > 0) {
      const loaded = readMany
        ? await readMany(missing)
        : await readIndividually(missing, read);
      for (const route of missing) {
        const content = loaded.get(route);
        if (content === undefined) {
          throw assetError(route, "batch reader omitted the file");
        }
        addArtifactFile(files, snapshotPath(side, route), content);
      }
    }
    const discovered = new Set<string>();
    for (const route of batch) {
      const content = files.get(snapshotPath(side, route));
      if (content === undefined) {
        throw assetError(route, "snapshot dependency is unavailable");
      }
      for (const dependency of referencedRoutes(route, content)) {
        if (!seen.has(dependency)) discovered.add(dependency);
      }
    }
    queued = [...discovered].sort();
  }
}

async function readIndividually(
  routes: readonly string[],
  read: (route: string) => Promise<ReviewArtifactContent>,
): Promise<ReadonlyMap<string, ReviewArtifactContent>> {
  const files = new Map<string, ReviewArtifactContent>();
  for (const route of routes) files.set(route, await read(route));
  return files;
}

async function readGitFilesIndividually(
  git: GitClient,
  commit: string,
  repoPaths: readonly string[],
): Promise<ReadonlyMap<string, GitFile>> {
  const files = new Map<string, GitFile>();
  for (const repoPath of repoPaths) {
    const kind = await git.fileKind(commit, repoPath);
    files.set(
      repoPath,
      kind === "regular"
        ? { bytes: await git.readFileBytes(commit, repoPath), kind }
        : { kind },
    );
  }
  return files;
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
