/** Optional changed-route detection powering the Browse changed/all filter. */

import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { minimatch } from "minimatch";

import { GitReviewAssetReader } from "../changes/base_assets.js";
import { readBaseManifest } from "../changes/base_manifest.js";
import { reviewChangedPaths } from "../changes/changed_paths.js";
import type { GitClient } from "../changes/git.js";
import { NodeGitCommandRunner, RepositoryGitClient } from "../changes/git.js";
import { normalizeReviewPair } from "../changes/ignore.js";
import { projectRealPath, toPosixPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { dependencyContainsChangedPath } from "../registry/dependency_paths.js";
import { readManifest } from "../registry/manifest.js";
import type {
  ManifestEntry,
  ManifestScreen,
  ManifestUseCase,
  ManifestV3,
} from "../registry/types.js";

/** Reader returning base documents for fragment-change confirmation. */
export interface BaseDocumentReader {
  readMany(routes: readonly string[]): Promise<ReadonlyMap<string, Uint8Array>>;
}

/** Compute routes affected since the base branch point, if available. */
export async function computeChangedRoutes(
  config: ResolvedConfig,
  base: string,
  git?: GitClient,
): Promise<readonly string[] | undefined> {
  try {
    let client = git;
    if (!client) {
      const runner = new NodeGitCommandRunner(config.repoRoot);
      const toplevel = (
        await runner.run(["rev-parse", "--show-toplevel"])
      ).trim();
      if (projectRealPath(toplevel) !== projectRealPath(config.repoRoot))
        return undefined;
      client = new RepositoryGitClient(runner);
    }
    const commit = await client.mergeBase(base, "HEAD");
    const changed = await reviewChangedPaths(client, commit, config);
    const manifest = readManifest(config);
    const baseManifest = await readBaseManifest(client, commit, config);
    const reader = new GitReviewAssetReader(
      config,
      client,
      commit,
      mockupsPrefix(config),
    );
    return await changedManifestRoutes(
      manifest,
      baseManifest,
      config,
      changed,
      reader,
    );
  } catch {
    return undefined;
  }
}

/**
 * Match manifest entries against repository-relative changed paths. With a
 * base reader, a screen whose only evidence is generated-fragment changes is
 * confirmed by comparing normalized base and head documents; without one,
 * fragment evidence counts directly.
 */
export async function changedManifestRoutes(
  manifest: ManifestV3,
  baseManifest: ManifestV3,
  config: ResolvedConfig,
  changedPaths: readonly string[],
  baseReader?: BaseDocumentReader,
): Promise<readonly string[]> {
  const prefix = mockupsPrefix(config);
  const impact = sharedImpactEvidence(config, changedPaths, prefix);
  const routes = new Set<string>();
  const changedScreenIds = new Set<string>();
  const pending: { changedFragments: string[]; screen: ManifestScreen }[] = [];
  const baseEntries = new Map(
    baseManifest.entries.map((entry) => [entry.id, entry]),
  );
  const mark = (entry: ManifestScreen | ManifestUseCase): void => {
    routes.add(entry.route);
    if (entry.kind === "screen") changedScreenIds.add(entry.id);
  };
  for (const entry of manifest.entries) {
    if (entry.kind === "collection") continue;
    const baseEntry = baseEntries.get(entry.id);
    const dependencyHit = dependencyCandidates(entry, baseEntry).some(
      (candidate) =>
        changedPaths.some((changedPath) =>
          dependencyContainsChangedPath(candidate, changedPath),
        ),
    );
    if (
      impact.catalogueWide ||
      !isDeepStrictEqual(entry, baseEntry) ||
      dependencyHit ||
      stylesheetImpactHit(entry.route, config, impact.stylesheetPaths, prefix)
    ) {
      mark(entry);
      continue;
    }
    const changedFragments = fragmentPaths(entry, prefix).filter((fragment) =>
      changedPaths.includes(fragment),
    );
    if (changedFragments.length === 0) continue;
    if (!baseReader || entry.kind !== "screen") {
      mark(entry);
      continue;
    }
    pending.push({ changedFragments, screen: entry });
  }
  if (pending.length > 0 && baseReader) {
    for (const screen of await materiallyChangedScreens(
      pending,
      config,
      baseReader,
      prefix,
    )) {
      mark(screen);
    }
  }
  for (const entry of manifest.entries) {
    if (
      entry.kind === "use-case" &&
      entry.steps.some((step) => changedScreenIds.has(step.screenId))
    ) {
      routes.add(entry.route);
    }
  }
  return [...routes].sort();
}

/**
 * Confirm fragment-only evidence by normalizing review-ignore regions on both
 * sides; a screen stays changed when any view differs after normalization or
 * when its documents cannot be compared.
 */
async function materiallyChangedScreens(
  pending: readonly { changedFragments: string[]; screen: ManifestScreen }[],
  config: ResolvedConfig,
  baseReader: BaseDocumentReader,
  prefix: string,
): Promise<ManifestScreen[]> {
  const fragmentRoutes = pending.flatMap(({ changedFragments }) =>
    changedFragments.map((fragment) => stripPrefix(fragment, prefix)),
  );
  let baseDocuments: ReadonlyMap<string, Uint8Array>;
  try {
    baseDocuments = await baseReader.readMany(fragmentRoutes);
  } catch {
    return pending.map(({ screen }) => screen);
  }
  const changed: ManifestScreen[] = [];
  for (const { changedFragments, screen } of pending) {
    if (
      changedFragments.some((fragment) =>
        viewDiffers(fragment, screen, config, baseDocuments, prefix),
      )
    ) {
      changed.push(screen);
    }
  }
  return changed;
}

function viewDiffers(
  fragment: string,
  screen: ManifestScreen,
  config: ResolvedConfig,
  baseDocuments: ReadonlyMap<string, Uint8Array>,
  prefix: string,
): boolean {
  const route = stripPrefix(fragment, prefix);
  const baseDocument = baseDocuments.get(route);
  if (!baseDocument) return true;
  try {
    const head = fs.readFileSync(path.join(config.mockupsDir, route), "utf8");
    const base = Buffer.from(baseDocument).toString("utf8");
    const context = `${screen.route} (${route})`;
    const normalized = normalizeReviewPair(base, head, context);
    return normalized.base !== normalized.head;
  } catch {
    return true;
  }
}

interface SharedImpactEvidence {
  /** A shared-impact path that is no route's stylesheet affects every route. */
  catalogueWide: boolean;
  /** Changed shared-impact paths that are configured stylesheets. */
  stylesheetPaths: readonly string[];
}

function sharedImpactEvidence(
  config: ResolvedConfig,
  changedPaths: readonly string[],
  prefix: string,
): SharedImpactEvidence {
  const matched = changedPaths.filter((changed) =>
    config.changes.sharedImpact.some((glob) =>
      minimatch(changed, glob, { dot: true }),
    ),
  );
  if (matched.length === 0)
    return { catalogueWide: false, stylesheetPaths: [] };
  const configured = new Set(
    config.stylesheets.flatMap((rule) =>
      ruleStylesheets(rule).map((sheet) => joinPrefix(prefix, sheet)),
    ),
  );
  return {
    catalogueWide: matched.some((changed) => !configured.has(changed)),
    stylesheetPaths: matched.filter((changed) => configured.has(changed)),
  };
}

function stylesheetImpactHit(
  route: string,
  config: ResolvedConfig,
  stylesheetPaths: readonly string[],
  prefix: string,
): boolean {
  if (stylesheetPaths.length === 0) return false;
  return config.stylesheets.some(
    (rule) =>
      minimatch(route, rule.match, { dot: true }) &&
      ruleStylesheets(rule).some((sheet) =>
        stylesheetPaths.includes(joinPrefix(prefix, sheet)),
      ),
  );
}

function ruleStylesheets(
  rule: ResolvedConfig["stylesheets"][number],
): string[] {
  return [
    ...rule.stylesheets,
    ...(rule.lightStylesheets ?? []),
    ...(rule.darkStylesheets ?? []),
  ].filter((sheet) => !/^https?:/i.test(sheet));
}

function dependencyCandidates(
  entry: ManifestEntry,
  baseEntry: ManifestEntry | undefined,
): string[] {
  return [
    ...declaredDependencies(entry),
    ...(baseEntry ? declaredDependencies(baseEntry) : []),
  ];
}

function fragmentPaths(entry: ManifestEntry, prefix: string): string[] {
  if (entry.kind !== "screen") return [];
  const paths = [
    joinPrefix(prefix, entry.fragments.mobile),
    joinPrefix(prefix, entry.fragments.desktop),
  ];
  if (entry.darkFragments) {
    paths.push(
      joinPrefix(prefix, entry.darkFragments.mobile),
      joinPrefix(prefix, entry.darkFragments.desktop),
    );
  }
  return paths;
}

function declaredDependencies(entry: ManifestEntry): readonly string[] {
  return entry.dependencies.filter(
    (dependency) => dependency !== entry.sourcePath,
  );
}

function mockupsPrefix(config: ResolvedConfig): string {
  return toPosixPath(path.relative(config.repoRoot, config.mockupsDir));
}

function joinPrefix(prefix: string, route: string): string {
  return prefix === "" ? route : `${prefix}/${route}`;
}

function stripPrefix(repoPath: string, prefix: string): string {
  return prefix !== "" && repoPath.startsWith(`${prefix}/`)
    ? repoPath.slice(prefix.length + 1)
    : repoPath;
}
