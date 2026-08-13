import path from "node:path";

import { isInside, isSafeRepositoryPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MokabookError, errorMessage } from "../errors.js";
import type { GitClient, GitFile } from "./git.js";

/** Confined Git reader for base-commit catalogue documents. */
export class GitReviewAssetReader {
  constructor(
    private readonly config: ResolvedConfig,
    private readonly git: GitClient,
    private readonly commit: string,
    private readonly mockupsPrefix: string,
  ) {}

  /** Read and validate many base documents in one bounded Git batch. */
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
        requested[0]?.route ?? "base document",
        errorMessage(error),
        error,
      );
    }
  }
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
    `could not read base document ${route}: ${detail}`,
    cause === undefined ? undefined : { cause },
  );
}
