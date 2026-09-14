import { variantAddress, viewPairs } from "./component_pairing.js";
import path from "node:path";
import { minimatch } from "minimatch";

import { canonicalJson } from "../components/data.js";
import { generatedViews } from "../components/views.js";
import { toPosixPath } from "../config/paths.js";
import type { ResolvedConfig } from "../config/types.js";
import { analyzeHierarchy } from "../registry/hierarchy.js";
import type { Manifest, ManifestEntry } from "../registry/types.js";
import type { ReviewAssetReader } from "./assets.js";
import { affectedConsumers } from "./component_affected.js";
import { validateComponentReviewSources } from "./component_result_sources.js";
import {
  address,
  ComponentDependencyPolicy,
  entryPairs,
  lexical,
  metadata,
  uniqueReasons,
} from "./component_metadata.js";
import { ComponentMaterialReader } from "./component_resources.js";
import type {
  ChangedEntry,
  ComponentReview,
  ComponentVariantReview,
  EntryChangeReason,
  ReviewResultV3,
  ScreenReviewV3,
} from "./component_types.js";
import {
  compareComponentView,
  type ComponentViewContext,
} from "./component_view.js";
import { aggregateIgnored, aggregateState } from "./screen_views.js";

export interface ComponentClassificationInput {
  before: Manifest;
  after: Manifest;
  beforeReader: ReviewAssetReader;
  afterReader: ReviewAssetReader;
  config: ResolvedConfig;
  changedPaths: readonly string[];
  baseCommit: string;
  baseRef: string;
}

/** The sole component-aware membership policy, shared by Browse, Review, and publishing. */
export async function classifyComponents(
  input: ComponentClassificationInput,
): Promise<ReviewResultV3> {
  const { before, after, changedPaths, config } = input;
  const dependencies = new ComponentDependencyPolicy(
    before,
    after,
    config.review.sharedImpact,
  );
  const context: ComponentViewContext = {
    beforeReader: new ComponentMaterialReader(input.beforeReader),
    afterReader: new ComponentMaterialReader(input.afterReader),
    dependencies,
    changed: new Set(changedPaths),
    prefix: toPosixPath(path.relative(config.repoRoot, config.mockupsDir)),
    compareResourceBytes: config.generatedOutput === "derived",
  };
  await Promise.all([
    context.beforeReader.prefetch(
      before.entries.flatMap((entry) =>
        generatedViews(entry).map((view) => view.path),
      ),
    ),
    context.afterReader.prefetch(
      after.entries.flatMap((entry) =>
        generatedViews(entry).map((view) => view.path),
      ),
    ),
  ]);
  const sharedImpact = changedPaths.filter((path) =>
    config.review.sharedImpact.some((glob) =>
      minimatch(path, glob, { dot: true }),
    ),
  );
  const screens: ScreenReviewV3[] = [];
  const components: ComponentReview[] = [];
  const changes: ChangedEntry[] = [];
  const impacting = new Set<string>();
  const actualImplementations = new Set<string>();
  const pairs = entryPairs(before, after);
  const beforeHierarchy = analyzeHierarchy<ManifestEntry>(
    before.entries as readonly ManifestEntry[],
  ).hierarchy;
  const afterHierarchy = analyzeHierarchy<ManifestEntry>(
    after.entries as readonly ManifestEntry[],
  ).hierarchy;
  for (const pair of pairs) {
    const entry = (pair.after ?? pair.before)!;
    const sides = {
      ...(pair.before ? { before: address(pair.before) } : {}),
      ...(pair.after ? { after: address(pair.after) } : {}),
    };
    const reasons: EntryChangeReason[] = [];
    if (!pair.before) reasons.push({ kind: "added" });
    if (!pair.after) reasons.push({ kind: "removed" });
    if (
      pair.before &&
      pair.after &&
      metadata(pair.before, before, beforeHierarchy) !==
        metadata(pair.after, after, afterHierarchy)
    )
      reasons.push({ kind: "metadata" });
    reasons.push(
      ...dependencies.reasons(pair.before, pair.after, changedPaths),
    );
    const common = {
      ...address(entry),
      ...sides,
      dependencies: [
        ...new Set([
          ...(pair.before?.dependencies ?? []),
          ...(pair.after?.dependencies ?? []),
        ]),
      ].sort(),
      sharedImpact: [
        ...new Set([
          ...sharedImpact,
          ...reasons.flatMap((reason) =>
            reason.kind === "dependency" ? [reason.path] : [],
          ),
        ]),
      ].sort(),
    };
    const baseViews = pair.before ? generatedViews(pair.before) : [];
    const headViews = pair.after ? generatedViews(pair.after) : [];
    const pairedViews = viewPairs(baseViews, headViews);
    const compared = await Promise.all(
      pairedViews.map((view) =>
        compareComponentView(
          context,
          view.before,
          view.after,
          entry.kind === "component" ? entry.id : undefined,
        ),
      ),
    );
    reasons.push(...compared.flatMap((result) => result.reasons));
    for (const comparison of compared)
      for (const id of comparison.changedImplementations)
        actualImplementations.add(id);
    if (entry.kind === "screen")
      screens.push({
        ...common,
        state: aggregateState(compared.map((result) => result.view.state)),
        views: compared.map((result) => result.view),
      });
    if (entry.kind === "component") {
      const bases =
        pair.before?.kind === "component" ? pair.before.variants : [];
      const heads = pair.after?.kind === "component" ? pair.after.variants : [];
      const variants: ComponentVariantReview[] = [];
      for (const id of [
        ...new Set([
          ...heads.map((variant) => variant.id),
          ...bases.map((variant) => variant.id),
        ]),
      ]) {
        const base = bases.find((variant) => variant.id === id);
        const head = heads.find((variant) => variant.id === id);
        const selected = (head ?? base)!;
        const variantComparisons = compared.filter(
          (_result, index) =>
            (pairedViews[index]!.after ?? pairedViews[index]!.before)
              ?.variantId === id,
        );
        const views = variantComparisons.map((result) => result.view);
        variants.push({
          id,
          title: selected.title,
          ...(base ? { before: variantAddress(base) } : {}),
          ...(head ? { after: variantAddress(head) } : {}),
          state: aggregateState(views.map((view) => view.state)),
          views,
        });
        if (
          base &&
          head &&
          canonicalJson(base.props) === canonicalJson(head.props) &&
          variantComparisons.some(
            (comparison) => comparison.reasons.length > 0,
          ) &&
          !reasons.some((reason) => reason.kind === "metadata")
        )
          impacting.add(entry.id);
      }
      if (
        reasons.some(
          (reason) =>
            reason.kind === "added" ||
            reason.kind === "removed" ||
            reason.kind === "dependency",
        )
      )
        impacting.add(entry.id);
      components.push({
        ...common,
        state: aggregateState(variants.map((variant) => variant.state)),
        variants,
      });
    }
    if (reasons.length)
      changes.push({
        kind: entry.kind,
        ...sides,
        reasons: uniqueReasons(reasons),
      });
  }
  for (const id of actualImplementations) {
    impacting.add(id);
    const component = components.find((entry) => entry.id === id)!;
    const existing = changes.find(
      (entry) =>
        entry.kind === "component" && (entry.after ?? entry.before)!.id === id,
    );
    if (existing)
      existing.reasons = uniqueReasons([
        ...existing.reasons,
        { kind: "material" },
      ]);
    else
      changes.push({
        kind: "component",
        ...(component.before ? { before: component.before } : {}),
        ...(component.after ? { after: component.after } : {}),
        reasons: [{ kind: "material" }],
      });
  }
  const changedScreens = new Set(
    changes
      .filter((entry) => entry.kind === "screen")
      .flatMap((entry) =>
        [entry.before?.route, entry.after?.route].filter(
          (route): route is string => route !== undefined,
        ),
      ),
  );
  for (const pair of pairs) {
    const entry = (pair.after ?? pair.before)!;
    if (entry.kind !== "use-case") continue;
    const routes = new Set(
      [pair.before, pair.after].flatMap((item, index) =>
        item?.kind === "use-case"
          ? item.steps.flatMap((step) =>
              (index === 0 ? before : after).entries.flatMap((screen) =>
                screen.kind === "screen" &&
                screen.id === step.screenId &&
                changedScreens.has(screen.route)
                  ? [screen.route]
                  : [],
              ),
            )
          : [],
      ),
    );
    if (!routes.size) continue;
    const existing = changes.find(
      (change) =>
        change.kind === "use-case" &&
        (change.after ?? change.before)?.route === entry.route,
    );
    const reasons = uniqueReasons([
      ...(existing?.reasons ?? []),
      ...[...routes].map((route) => ({ kind: "screen" as const, route })),
    ]);
    if (existing) existing.reasons = reasons;
    else
      changes.push({
        kind: "use-case",
        ...(pair.before ? { before: address(pair.before) } : {}),
        ...(pair.after ? { after: address(pair.after) } : {}),
        reasons,
      });
  }
  screens.sort((a, b) => lexical(a.route, b.route));
  components.sort((a, b) => lexical(a.id, b.id));
  changes.sort(
    (a, b) =>
      lexical((a.after ?? a.before)!.route, (b.after ?? b.before)!.route) ||
      lexical(a.kind, b.kind) ||
      lexical((a.after ?? a.before)!.id, (b.after ?? b.before)!.id),
  );
  const result: ReviewResultV3 = {
    schemaVersion: 3,
    baseCommit: input.baseCommit,
    baseRef: input.baseRef,
    changedPaths: [...changedPaths].sort(),
    sharedImpact,
    screens,
    components,
    changes,
    affectedConsumers: affectedConsumers(before, after, impacting),
    ignoredImpact: aggregateIgnored(screens),
  };
  validateComponentReviewSources(result, before, after, impacting);
  return result;
}
