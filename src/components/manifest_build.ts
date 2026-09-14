import type { ColorScheme, ResolvedRegistryEntry } from "../authoring/types.js";
import type { ManifestEntryBase } from "../registry/types.js";
import { effectiveColorSchemes, VIEWPORTS } from "../registry/views.js";

import { encodeProps } from "./codec.js";
import { componentInputs } from "./inputs.js";
import type {
  ComponentViewRecord,
  ManifestComponent,
} from "./manifest_types.js";
import { componentFragmentRoute } from "./paths.js";

export function componentManifestEntry(
  entry: Extract<ResolvedRegistryEntry, { kind: "component" }>,
  common: Omit<ManifestEntryBase, "kind">,
  schemes: readonly ColorScheme[],
  views: ReadonlyMap<string, ComponentViewRecord>,
): ManifestComponent {
  return {
    ...common,
    declaredDependencies: [...new Set(entry.dependencies)].sort(),
    kind: "component",
    route: entry.route,
    viewports: ["mobile", "desktop"],
    ...(entry.tags?.length ? { tags: [...entry.tags] } : {}),
    propSchema: entry.propSchema,
    controls: entry.controls,
    slots: entry.slots,
    ownedDependencies: entry.ownedDependencies,
    variants: entry.variants.map((variant) => {
      const data = componentInputs(
        entry,
        variant.props,
        `${entry.id} / ${variant.id}`,
      );
      const fragment = (
        viewport: "mobile" | "desktop",
        scheme: ColorScheme = "light",
      ) => componentFragmentRoute(entry.route, variant.id, viewport, scheme);
      return {
        id: variant.id,
        title: variant.title,
        ...(variant.description ? { description: variant.description } : {}),
        props: encodeProps(data.data),
        suppliedSlots: Object.keys(data.slots).sort(),
        fragments: { mobile: fragment("mobile"), desktop: fragment("desktop") },
        ...(effectiveColorSchemes(entry, schemes).includes("dark")
          ? {
              darkFragments: {
                mobile: fragment("mobile", "dark"),
                desktop: fragment("desktop", "dark"),
              },
            }
          : {}),
        componentViews: VIEWPORTS.flatMap((viewport) =>
          effectiveColorSchemes(entry, schemes).flatMap(
            (scheme) => views.get(fragment(viewport, scheme)) ?? [],
          ),
        ),
      };
    }),
  };
}
