import { analyzeStylesheetChange } from "./analyze.js";
import type { CssDocumentPair } from "./document.js";
import { LightningCssRuleParser } from "./rules.js";
import { isStylesheetPath } from "./paths.js";
import {
  CssRuleParseError,
  type CssRuleParser,
  type CssRuleParseResult,
} from "./types.js";
import type { DependencyReason, ExcludedResource } from "../types.js";

/** Resource identities and immutable source-side bytes, supplied after confinement. */
export interface ChangedResource {
  path: string;
  before?: string;
  after?: string;
}

/** Optional view evidence is absent when empty, including on historical results. */
export interface ResourceEvidence {
  reasons?: readonly DependencyReason[];
  excludedResources?: readonly ExcludedResource[];
}

/** One parser cache per classification, shared across paths, views and source sides. */
export class CssResourceAnalysis {
  private readonly parsed = new Map<string, CssRuleParseResult>();
  private readonly cached: CssRuleParser;

  constructor(parser: CssRuleParser = new LightningCssRuleParser()) {
    this.cached = {
      parse: (source) => {
        let result = this.parsed.get(source);
        if (!result) {
          try {
            result = parser.parse(source);
          } catch (cause) {
            result = {
              status: "unresolved",
              error: new CssRuleParseError(cause),
            };
          }
          this.parsed.set(source, result);
        }
        return result;
      },
    };
  }

  /** Narrow only the supplied changed, reachable resources; never discover files here. */
  analyze(
    resources: readonly ChangedResource[],
    documents: readonly CssDocumentPair[],
  ): ResourceEvidence {
    const reasons: DependencyReason[] = [];
    const excludedResources: ExcludedResource[] = [];
    for (const resource of [...resources].sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
    )) {
      if (!isStylesheetPath(resource.path)) {
        reasons.push({ kind: "dependency", path: resource.path });
        continue;
      }
      const outcomes = (documents.length ? documents : [{}]).map((pair) =>
        analyzeStylesheetChange(
          resource.before ?? "",
          resource.after ?? "",
          pair,
          this.cached,
        ),
      );
      const kept = outcomes.filter((outcome) => outcome.kind === "kept");
      if (kept.length)
        reasons.push({
          kind: "dependency",
          path: resource.path,
          analysis: {
            status: kept.some((outcome) => outcome.status === "unresolved")
              ? "unresolved"
              : "matched",
            selectors: [
              ...new Set(kept.flatMap((outcome) => outcome.selectors)),
            ].sort(),
          },
        });
      else
        excludedResources.push({
          path: resource.path,
          reason: "no-matching-rule",
        });
    }
    return {
      ...(reasons.length ? { reasons } : {}),
      ...(excludedResources.length ? { excludedResources } : {}),
    };
  }
}
