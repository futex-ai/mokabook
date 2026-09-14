import type { CatalogueNavigationProps } from "./catalogue-navigation.js";

export type NavigationRow = CatalogueNavigationProps["rows"][number];
type NavigationSectionId = "components" | "pages";

interface NavigationBranch {
  children: NavigationBranch[];
  row: NavigationRow;
}

function navigationForest(rows: readonly NavigationRow[]): NavigationBranch[] {
  const roots: NavigationBranch[] = [];
  const parents: Array<{ branch: NavigationBranch; depth: number }> = [];
  for (const row of rows) {
    while ((parents.at(-1)?.depth ?? -1) >= row.depth) parents.pop();
    const branch = { children: [], row };
    const parent = parents.at(-1)?.branch;
    (parent?.children ?? roots).push(branch);
    if (row.kind === "collection") parents.push({ branch, depth: row.depth });
  }
  return roots;
}

function projectBranch(
  branch: NavigationBranch,
  section: NavigationSectionId,
): NavigationBranch | undefined {
  if (branch.row.kind !== "collection") {
    const component = branch.row.kind === "component";
    return component === (section === "components") ? branch : undefined;
  }
  const children = branch.children.flatMap((child) => {
    const projected = projectBranch(child, section);
    return projected ? [projected] : [];
  });
  const emptyPageFolder = section === "pages" && branch.children.length === 0;
  if (children.length === 0 && !emptyPageFolder) return undefined;
  const { count: _count, ...row } = branch.row;
  return {
    children,
    row: children.length > 0 ? { ...row, count: children.length } : row,
  };
}

function flattenBranches(
  branches: readonly NavigationBranch[],
): NavigationRow[] {
  return branches.flatMap((branch) => [
    branch.row,
    ...flattenBranches(branch.children),
  ]);
}

export function navigationSections(rows: readonly NavigationRow[]) {
  const forest = navigationForest(rows);
  return (["pages", "components"] as const).flatMap((id) => {
    const projected = forest.flatMap((branch) => {
      const section = projectBranch(branch, id);
      return section ? [section] : [];
    });
    const sectionRows = flattenBranches(projected);
    return sectionRows.length > 0
      ? [
          {
            id,
            label: id === "pages" ? "Pages" : "Components",
            rows: sectionRows,
          },
        ]
      : [];
  });
}
