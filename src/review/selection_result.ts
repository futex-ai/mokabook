/** Project completed ownership evidence onto the one comparison being displayed. */
import { MoklyError } from "../errors.js";
import type { ReviewResultV3 } from "./component_types.js";
import { aggregateIgnored } from "./screen_views.js";
import type { ReviewSelection } from "./selection_types.js";

export function selectedComponentResult(
  result: ReviewResultV3,
  selection: ReviewSelection,
): ReviewResultV3 {
  const screens =
    selection.variantId === undefined
      ? result.screens.filter((screen) => screen.route === selection.route)
      : [];
  const component = result.components.find(
    (entry) => entry.route === selection.route,
  );
  const variant = component?.variants.find(
    (entry) => entry.id === selection.variantId,
  );
  if (!screens.length && (!component || !variant)) throw missingSelection();
  const components =
    component && variant
      ? [{ ...component, state: variant.state, variants: [variant] }]
      : [];
  return {
    ...result,
    screens,
    components,
    changes: result.changes.filter(
      (entry) =>
        entry.kind === (components.length ? "component" : "screen") &&
        (entry.after ?? entry.before)?.route === selection.route,
    ),
    affectedConsumers: [],
    ignoredImpact: aggregateIgnored(screens),
  };
}

export function missingSelection(): MoklyError {
  return new MoklyError(
    "review-invalid",
    "The selected view has no comparison",
  );
}
