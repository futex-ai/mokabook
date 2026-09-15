import type {
  CatalogueReadModel,
  CatalogueRoutedEntry,
  CatalogueUsage,
  CatalogueView,
} from "../catalogue/types.js";

import { routedEntries } from "./selection.js";
import type { InstanceRef, ViewerSelection } from "./types.js";

export interface ViewerFrame {
  element: HTMLIFrameElement;
  entry: CatalogueRoutedEntry;
  stepIndex?: number;
  view?: CatalogueView;
  path: string;
  variantId?: string;
}
export function frameDescriptors(
  root: HTMLElement,
  model: CatalogueReadModel,
  selection: ViewerSelection,
  variantId?: string,
): ViewerFrame[] {
  const entry = routedEntries(model).find(
    (entry) => entry.id === selection.screenId,
  );
  if (!entry) return [];
  if (entry.kind === "page") {
    const element = root.querySelector<HTMLIFrameElement>(
      "iframe[data-mokly-fragment-frame]",
    );
    return element && entry.documentPath
      ? [{ element, entry, path: entry.documentPath }]
      : [];
  }
  const targets =
    entry.kind === "use-case"
      ? entry.steps.flatMap((step, stepIndex) => {
          const screen = model.screens.find(
            (screen) => screen.id === step.screenId,
          );
          return screen ? [{ entry: screen, stepIndex }] : [];
        })
      : [{ entry, stepIndex: undefined }];
  return targets.flatMap((target) => {
    const owner = target.entry;
    const variant =
      owner.kind === "component"
        ? (owner.variants.find((variant) => variant.id === variantId) ??
          owner.variants[0])
        : undefined;
    const views =
      owner.kind === "component" ? (variant?.views ?? []) : owner.views;
    const elements =
      target.stepIndex === undefined
        ? root.querySelectorAll<HTMLIFrameElement>(
            "iframe[data-workspace-frame]",
          )
        : root.querySelectorAll<HTMLIFrameElement>(
            `.flow-step:nth-child(${target.stepIndex + 1}) iframe.mbk-frag`,
          );
    return [...elements].flatMap((element) => {
      const viewport =
        target.stepIndex !== undefined
          ? "desktop"
          : element.dataset["workspaceFrame"];
      if (
        target.stepIndex === undefined &&
        selection.viewport !== "both" &&
        viewport !== selection.viewport
      )
        return [];
      const view =
        views.find(
          (view) =>
            view.viewport === viewport &&
            view.colorScheme === selection.colorScheme,
        ) ??
        views.find(
          (view) => view.viewport === viewport && view.colorScheme === "light",
        );
      return view?.fragmentPath
        ? [
            {
              element,
              entry: owner,
              view,
              path: view.fragmentPath,
              ...(target.stepIndex === undefined
                ? {}
                : { stepIndex: target.stepIndex }),
              ...(variant ? { variantId: variant.id } : {}),
            },
          ]
        : [];
    });
  });
}
export function frameInstance(frame: ViewerFrame, key: string): InstanceRef {
  return {
    screenId: frame.entry.id,
    viewport: frame.view!.viewport,
    colorScheme: frame.view!.colorScheme,
    key,
    ...(frame.variantId ? { variantId: frame.variantId } : {}),
  };
}
export function hasInstance(
  usage: CatalogueUsage | undefined,
  key: string,
): boolean {
  return (
    usage?.status === "ready" &&
    usage.instances.some((instance) => instance.key === key)
  );
}
