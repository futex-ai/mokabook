import type {
  ColorScheme,
  ResolvedRegistryEntry,
  Viewport,
} from "../authoring/types.js";
import { fragmentRoute } from "../registry/manifest.js";
import { effectiveColorSchemes } from "../registry/views.js";

/** Resolve a registry entry to the static artifact appropriate for a view. */
export function artifactRouteForEntry(
  entry: ResolvedRegistryEntry,
  viewport: Viewport,
  colorScheme: ColorScheme,
  byId: ReadonlyMap<string, ResolvedRegistryEntry>,
  catalogueSchemes: readonly ColorScheme[],
): string | undefined {
  const screen =
    entry.kind === "screen"
      ? entry
      : entry.kind === "use-case" && entry.steps[0]
        ? byId.get(entry.steps[0].screenId)
        : undefined;
  if (screen?.kind !== "screen") return undefined;
  const targetScheme = effectiveColorSchemes(screen, catalogueSchemes).includes(
    colorScheme,
  )
    ? colorScheme
    : "light";
  return fragmentRoute(screen.route, viewport, targetScheme);
}

/** Map logical catalogue routes to concrete view artifacts. */
export function logicalArtifactRoutes(
  entries: readonly ResolvedRegistryEntry[],
  viewport: Viewport,
  colorScheme: ColorScheme,
  catalogueSchemes: readonly ColorScheme[],
): Readonly<Record<string, string>> {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return Object.fromEntries(
    entries.flatMap((entry) => {
      if (entry.kind === "collection") return [];
      const artifact = artifactRouteForEntry(
        entry,
        viewport,
        colorScheme,
        byId,
        catalogueSchemes,
      );
      return artifact ? [[entry.route, artifact] as const] : [];
    }),
  );
}
