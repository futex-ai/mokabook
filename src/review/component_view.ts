import { stripMarkers } from "../components/comparison_material.js";
import type { GeneratedComponentView } from "../components/views.js";
import { validateComponentRanges } from "../components/ranges.js";
import {
  changedComponentImplementations,
  projectComponentPair,
} from "../components/comparison_projection.js";
import type { EntryChangeReason } from "./component_types.js";
import type { ViewReview } from "./types.js";
import {
  normalizeHistoricalDocument,
  normalizeReviewPair,
  normalizeSingleDocument,
} from "./ignore.js";
import { snapshotPath } from "./paths.js";
import type { ComponentDependencyPolicy } from "./component_metadata.js";
import type { ComponentMaterialReader } from "./component_resources.js";

export interface ComparedComponentView {
  view: ViewReview;
  reasons: readonly EntryChangeReason[];
  changedImplementations: ReadonlySet<string>;
}
export interface ComponentViewContext {
  beforeReader: ComponentMaterialReader;
  afterReader: ComponentMaterialReader;
  dependencies: ComponentDependencyPolicy;
  changed: ReadonlySet<string>;
  prefix: string;
}
/** Compare material and declared inputs without altering the retained view documents. */
export async function compareComponentView(
  context: ComponentViewContext,
  before: GeneratedComponentView | undefined,
  after: GeneratedComponentView | undefined,
  root?: string,
): Promise<ComparedComponentView> {
  const selected = after ?? before;
  if (!selected) throw new Error("Comparison view requires at least one side");
  const base = before
    ? normalizeHistoricalDocument(await context.beforeReader.text(before.path))
    : undefined;
  const head = after ? await context.afterReader.text(after.path) : undefined;
  const baseRanges =
    base !== undefined && before?.usage
      ? validateComponentRanges(base, before.usage.ranges)
      : undefined;
  const headRanges =
    head !== undefined && after?.usage
      ? validateComponentRanges(head, after.usage.ranges)
      : undefined;
  const view: ViewReview = {
    viewport: selected.viewport,
    colorScheme: selected.colorScheme,
    ignoredIds: [],
    ...(before ? { beforePath: snapshotPath("before", before.path) } : {}),
    ...(after ? { afterPath: snapshotPath("after", after.path) } : {}),
    state: before ? "removed" : "added",
  };
  if (base === undefined || head === undefined) {
    normalizeSingleDocument(
      stripMarkers(
        (base ?? head)!,
        (before ?? after)!.usage,
        baseRanges ?? headRanges,
      ),
      selected.path,
    );
    return {
      view,
      reasons: [{ kind: "material" }],
      changedImplementations: new Set(),
    };
  }
  const projected = projectComponentPair(
    base,
    head,
    before?.usage,
    after?.usage,
    selected.path,
    root,
    baseRanges,
    headRanges,
  );
  const reasons: EntryChangeReason[] = [];
  if (projected.before !== projected.after) reasons.push({ kind: "material" });
  if (projected.inputs) reasons.push({ kind: "inputs" });
  if (projected.structure) reasons.push({ kind: "structure" });
  const repoPath = (path: string) =>
    context.prefix ? `${context.prefix}/${path}` : path;
  const excluded = (path: string) =>
    context.dependencies.suppressResource(
      repoPath(path),
      path,
      projected.pairedComponentIds,
      before?.usage,
      after?.usage,
      root,
    );
  const baseResources = await context.beforeReader.resources(
    before!.path,
    projected.before,
    excluded,
  );
  const headResources = await context.afterReader.resources(
    after!.path,
    projected.after,
    excluded,
  );
  for (const resource of new Set([...baseResources, ...headResources])) {
    const path = repoPath(resource);
    if (context.changed.has(path) && !excluded(resource))
      reasons.push({ kind: "dependency", path });
  }
  const actual = normalizeReviewPair(
    stripMarkers(base, before?.usage, baseRanges),
    stripMarkers(head, after?.usage, headRanges),
    selected.path,
  );
  const actualBefore = await context.beforeReader.resources(
    before!.path,
    actual.base,
    () => false,
  );
  const actualAfter = await context.afterReader.resources(
    after!.path,
    actual.head,
    () => false,
  );
  const actualResourceChange = [
    ...new Set([...actualBefore, ...actualAfter]),
  ].some((resource) => context.changed.has(repoPath(resource)));
  return {
    changedImplementations: changedComponentImplementations(
      base,
      head,
      before?.usage,
      after?.usage,
      baseRanges,
      headRanges,
    ),
    view: {
      ...view,
      ignoredIds: actual.ignoredIds,
      state:
        actual.base !== actual.head || actualResourceChange
          ? "changed"
          : projected.rawEqual
            ? "unchanged"
            : "ignored-only",
    },
    reasons,
  };
}
