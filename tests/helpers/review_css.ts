import { parse } from "parse5";

import { analyzeStylesheetChange } from "../../src/review/css/analyze.js";
import type { CssDocumentPair } from "../../src/review/css/document.js";
import type { CssAnalysisOutcome } from "../../src/review/css/match_types.js";
import { LightningCssRuleParser } from "../../src/review/css/rules.js";
import type { CssRuleParser } from "../../src/review/css/types.js";

export const buttonDocument =
  '<!doctype html><button class="button">Save</button>';

export function documents(
  before: string | undefined = buttonDocument,
  after: string | undefined = before,
): CssDocumentPair {
  return {
    ...(before === undefined ? {} : { before: parse(before) }),
    ...(after === undefined ? {} : { after: parse(after) }),
  };
}

export function analyze(
  before: string,
  after: string,
  pair: CssDocumentPair = documents(),
  parser: CssRuleParser = new LightningCssRuleParser(),
): CssAnalysisOutcome {
  return analyzeStylesheetChange(before, after, pair, parser);
}

export function kept(
  status: "matched" | "unresolved",
  ...selectors: string[]
): CssAnalysisOutcome {
  return { kind: "kept", status, selectors: [...new Set(selectors)].sort() };
}

export const excluded = { kind: "excluded" } as const;
