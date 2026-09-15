/** Factual comparison evidence belongs in Details, never in the canvas. */
import { decodeProps } from "../components/codec.js";
import type { WorkspaceData } from "../server/shell/workspace_data.js";

import { element } from "./inspector_panels.js";
import { propText } from "./prop_display.js";

export function renderWorkspaceEvidence(
  panel: HTMLElement,
  data: WorkspaceData,
  variantId?: string,
): void {
  const doc = panel.ownerDocument;
  panel.replaceChildren();
  panel.hidden = data.status === undefined;
  if (panel.hidden) return;
  panel.append(
    element(doc, "h3", "Comparison details"),
    element(doc, "p", `Compared with the branch point on ${data.base}.`),
  );
  const labels = {
    added: "Added to this branch.",
    removed: "Removed on this branch.",
    material: "Rendered content changed.",
    inputs: "Supplied props or slots changed.",
    structure: "Component instances changed.",
    metadata: "Page details or saved examples changed.",
  };
  for (const component of data.relatedComponents) {
    const link = element(doc, "a", component.title);
    link.href = `/view/${component.route.split("/").map(encodeURIComponent).join("/")}`;
    const row = element(doc, "p", "Changed component: ");
    row.append(link);
    panel.append(row);
  }
  for (const change of data.inputChanges.filter(
    (item) => item.variantId === variantId,
  )) {
    panel.append(
      element(
        doc,
        "h3",
        `${change.title} · ${change.instanceId} · ${change.viewport} · ${change.colorScheme}`,
      ),
    );
    for (const [label, props] of [
      ["Before", change.before],
      ["Current", change.after],
    ] as const)
      panel.append(
        element(doc, "p", label),
        element(doc, "pre", propText(decodeProps(props))),
      );
  }
  for (const reason of data.change?.reasons ?? [])
    panel.append(
      element(
        doc,
        "p",
        reason.kind === "dependency"
          ? `Related file changed: ${reason.path}`
          : reason.kind === "screen"
            ? `A screen in this flow changed: ${reason.route}`
            : labels[reason.kind],
      ),
    );
  if (data.comparison) {
    const views =
      "variants" in data.comparison
        ? (data.comparison.variants.find((item) => item.id === variantId)
            ?.views ?? [])
        : data.comparison.views;
    const ignored = [...new Set(views.flatMap((view) => view.ignoredIds))];
    if (ignored.length)
      panel.append(
        element(doc, "p", `Excluded content: ${ignored.join(", ")}.`),
      );
    if (!data.change && views.some((view) => view.state === "changed"))
      panel.append(
        element(
          doc,
          "p",
          "Shared component changes affect this preview. This page has no independent entry in Changes.",
        ),
      );
    if ("variants" in data.comparison) {
      const variant = data.comparison.variants.find(
        (item) => item.id === variantId,
      );
      if (
        variant?.before &&
        variant.after &&
        JSON.stringify(variant.before.props) !==
          JSON.stringify(variant.after.props)
      ) {
        panel.append(element(doc, "h3", "Saved props changed"));
        for (const [title, props] of [
          ["Before", variant.before.props],
          ["Current", variant.after.props],
        ] as const)
          panel.append(
            element(doc, "p", title),
            element(doc, "pre", propText(decodeProps(props))),
          );
      }
    }
  }
  if (data.status === "Unmodified")
    panel.append(element(doc, "p", "No changes to this saved view."));
}
