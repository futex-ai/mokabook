import path from "node:path";

import type { Viewport } from "../authoring/types.js";
import { encodeUrlPath } from "../config/paths.js";
import { MokabookError } from "../errors.js";
import type { LogicalTarget } from "../navigation/logical.js";
import type { ManifestScreen } from "../registry/types.js";
import type { Catalogue } from "../server/catalogue.js";

/** Manifest-derived identity for one generated Browse document. */
export interface TrustedBrowseDocument {
  colorScheme: "dark" | "light";
  sourcePath: string;
  viewport: Viewport;
}

/** Resolve a public route only when the current manifest owns it. */
export function trustedDocument(
  route: string,
  catalogue: Catalogue,
): TrustedBrowseDocument | undefined {
  for (const entry of catalogue.manifest.entries) {
    if (entry.kind !== "screen") continue;
    for (const viewport of ["mobile", "desktop"] as const) {
      if (entry.fragments[viewport] === route) {
        return { colorScheme: "light", sourcePath: entry.sourcePath, viewport };
      }
      if (entry.darkFragments?.[viewport] === route) {
        return { colorScheme: "dark", sourcePath: entry.sourcePath, viewport };
      }
    }
  }
  const legacy = catalogue.manifest.legacyPages.find(
    (page) => page.route === route,
  );
  return legacy
    ? {
        colorScheme: "light",
        sourcePath: legacy.sourcePath,
        viewport: route.endsWith(".mobile.html") ? "mobile" : "desktop",
      }
    : undefined;
}

/** Derive the exact portable href expected for a trusted logical marker. */
export function expectedPortableHref(
  sourceRoute: string,
  source: TrustedBrowseDocument,
  destination: LogicalTarget,
  catalogue: Catalogue,
): string {
  const entry = catalogue.byId.get(destination.id);
  const screen =
    entry?.kind === "screen"
      ? entry
      : entry?.kind === "use-case" && entry.steps[0]
        ? catalogue.byId.get(entry.steps[0].screenId)
        : undefined;
  if (screen?.kind !== "screen") {
    throw invalid(
      sourceRoute,
      `trusted marker links to an invalid id: ${destination.id}`,
    );
  }
  const targetRoute = fragmentFor(screen, source.viewport, source.colorScheme);
  const relative = path.posix.relative(
    path.posix.dirname(sourceRoute),
    targetRoute,
  );
  const encoded = encodeUrlPath(relative);
  const portable = encoded.startsWith(".") ? encoded : `./${encoded}`;
  return `${portable}${destination.fragment ? `#${destination.fragment}` : ""}`;
}

function fragmentFor(
  screen: ManifestScreen,
  viewport: Viewport,
  colorScheme: "dark" | "light",
): string {
  return colorScheme === "dark" && screen.darkFragments?.[viewport]
    ? screen.darkFragments[viewport]
    : screen.fragments[viewport];
}

function invalid(route: string, message: string): MokabookError {
  return new MokabookError("build-invalid", `${route}: ${message}`);
}
