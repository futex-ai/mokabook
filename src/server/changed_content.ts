/** Read-only material output checks for the catalogue Changes filter. */

import path from "node:path";

import { isReservedSource } from "../build/source_inventory.js";
import { isInside, toPosixPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { MoklyError } from "../errors.js";
import {
  FORMER_MANIFEST_NAME,
  LEGACY_MANIFEST_NAME,
  MANIFEST_NAME,
} from "../registry/manifest.js";
import type { Manifest } from "../registry/types.js";
import { VIEWPORTS } from "../registry/views.js";
import {
  FileSystemReviewAssetReader,
  GitReviewAssetReader,
  type OptionalReviewAssetReader,
} from "../review/assets.js";
import { baselineResourceConfig } from "../review/base_manifest.js";
import type { BaselineReader } from "../review/git.js";
import {
  normalizeHistoricalDocument,
  normalizeReviewPair,
  normalizeSingleDocument,
} from "../review/ignore.js";
import { pageBaselines } from "../review/page_baselines.js";
import { fragmentForView, unionColorSchemes } from "../review/screen_views.js";
import { ChangedResourceGraph } from "./changed_resources.js";

interface DocumentPair {
  base?: string;
  head: string;
  context: string;
  changed: boolean;
}

/**
 * Find material document/resource changes using live files or a captured reader.
 * Exclude authoring paths lexically so retargeted public aliases still reach validation.
 */
export async function changedContentPaths(
  manifest: Manifest,
  baseline: Manifest,
  config: ResolvedConfig,
  git: BaselineReader,
  commit: string,
  changedPaths: readonly string[],
  headReader: OptionalReviewAssetReader = new FileSystemReviewAssetReader(
    config,
  ),
  documents: "all" | "pages" = "all",
): Promise<readonly string[]> {
  const prefix = toPosixPath(path.relative(config.repoRoot, config.mockupsDir));
  const repoPath = (route: string) => (prefix ? `${prefix}/${route}` : route);
  const publicChanges = new Set(
    changedPaths.flatMap((changed) => {
      const candidate = path.resolve(config.repoRoot, changed);
      if (
        !isInside(config.mockupsDir, candidate) ||
        isInside(config.entriesDir, candidate) ||
        isReservedSource(candidate) ||
        config.sourceFiles?.includes(changed)
      )
        return [];
      const route = toPosixPath(path.relative(config.mockupsDir, candidate));
      return route === MANIFEST_NAME ||
        route === FORMER_MANIFEST_NAME ||
        route === LEGACY_MANIFEST_NAME
        ? []
        : [route];
    }),
  );
  const derived = config.generatedOutput === "derived";
  if (!derived && publicChanges.size === 0) return [];
  const pairs = documentPairs(manifest, baseline, publicChanges, documents);
  if (derived) for (const pair of pairs) pair.changed = true;
  const baseReader = new GitReviewAssetReader(
    baselineResourceConfig(config, baseline),
    git,
    commit,
    prefix,
  );
  const result = new Set<string>();
  const normalizedDocuments = new Map<string, string>();
  const changedPairs = pairs.filter(
    (pair): pair is DocumentPair & { base: string } =>
      pair.changed && pair.base !== undefined,
  );
  for (let offset = 0; offset < changedPairs.length; offset += 32) {
    const batch = changedPairs.slice(offset, offset + 32);
    const bases = await baseReader.readMany(batch.map((pair) => pair.base));
    for (const pair of batch) {
      const base = bases.get(pair.base);
      if (!base) {
        throw new MoklyError(
          "review-invalid",
          `base fragment is missing: ${pair.base}`,
        );
      }
      const before = normalizeHistoricalDocument(
        Buffer.from(base).toString("utf8"),
      );
      const after = Buffer.from(await headReader.read(pair.head)).toString(
        "utf8",
      );
      const normalized = normalizeReviewPair(before, after, pair.context);
      normalizedDocuments.set(pair.head, normalized.head);
      if (normalized.base !== normalized.head) {
        result.add(repoPath(pair.head));
        if (derived) publicChanges.add(pair.head);
      } else if (pair.base === pair.head) {
        publicChanges.delete(pair.head);
      }
    }
  }
  if (!derived && publicChanges.size === 0) return [...result].sort();
  const resources = new ChangedResourceGraph(
    headReader,
    baseReader,
    publicChanges,
    normalizedDocuments,
    derived,
  );
  for (const pair of pairs) {
    let document = normalizedDocuments.get(pair.head);
    if (document === undefined) {
      const after = Buffer.from(await headReader.read(pair.head)).toString(
        "utf8",
      );
      document = pair.base
        ? normalizeReviewPair(after, after, pair.context).head
        : normalizeSingleDocument(after, pair.context);
    }
    if (await resources.affects(pair.head, document))
      result.add(repoPath(pair.head));
  }
  return [...result].sort();
}

function documentPairs(
  manifest: Manifest,
  baseline: Manifest,
  changed: ReadonlySet<string>,
  documents: "all" | "pages",
): DocumentPair[] {
  const bases = new Map(baseline.entries.map((entry) => [entry.id, entry]));
  const pages = pageBaselines(manifest, baseline);
  const pairs: DocumentPair[] = [];
  for (const screen of manifest.entries) {
    const baseEntry = bases.get(screen.id);
    if (screen.kind === "page") {
      const base = pages.get(screen.id)?.route;
      pairs.push({
        ...(base ? { base } : {}),
        head: screen.route,
        context: screen.route,
        changed: base !== screen.route || changed.has(screen.route),
      });
      continue;
    }
    if (documents === "pages" || screen.kind !== "screen") continue;
    const base = baseEntry?.kind === "screen" ? baseEntry : undefined;
    for (const viewport of VIEWPORTS) {
      for (const scheme of unionColorSchemes(base, screen)) {
        const before = base
          ? fragmentForView(base, viewport, scheme)
          : undefined;
        const after = fragmentForView(screen, viewport, scheme);
        if (!after) continue;
        pairs.push({
          ...(before ? { base: before } : {}),
          head: after,
          context: `${screen.route} (${viewport}, ${scheme})`,
          changed: before !== after || changed.has(after),
        });
      }
    }
  }
  return pairs;
}
