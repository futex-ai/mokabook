export type LibraryGroup = "chrome" | "controls" | "inspector" | "preview";

/** Registration metadata is separate from implementation impact dependencies. */
export function libraryMetadata(
  group: LibraryGroup,
  slug: LibraryStyle,
  title: string,
  description: string,
) {
  const view = `examples/basic/entries/design/library/${group}/${slug}.view.tsx`;
  const stylesheet = `examples/basic/generated/${libraryStyleFiles[slug]}`;
  return {
    id: `design-ui-${slug}`,
    route: `design/library/${group}/${slug}.html`,
    title,
    description,
    dependencies: [view, stylesheet],
    ownedDependencies: [view, stylesheet],
    relatedDocs: ["docs/protocol/mokly-design-component-library.md"],
    colorSchemes: ["light"] as const,
  };
}
import { libraryStyleFiles, type LibraryStyle } from "./style_files.js";
