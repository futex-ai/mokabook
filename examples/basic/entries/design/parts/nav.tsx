import type { CSSProperties } from "react";

import { FlowIcon, FolderIcon, FolderOpenIcon, ScreenIcon } from "./icons.js";

/** One entry in the catalogue navigation tree. */
interface NavNode {
  /** Optional child count shown for a collection. */
  count?: number;
  /** Nesting depth (0 = top level), used for indentation. */
  depth: number;
  kind: "collection" | "flow" | "screen";
  label: string;
  /** Whether a collection is expanded (screens and flows ignore this). */
  open?: boolean;
}

const NAV_TREE: readonly NavNode[] = [
  { count: 3, depth: 0, kind: "collection", label: "Example", open: true },
  { count: 2, depth: 1, kind: "collection", label: "Screens", open: true },
  { depth: 2, kind: "screen", label: "Welcome" },
  { depth: 2, kind: "screen", label: "Details" },
  { depth: 1, kind: "flow", label: "Example tour" },
  { count: 2, depth: 0, kind: "collection", label: "Design", open: true },
  { depth: 1, kind: "collection", label: "Browse shell" },
  { depth: 1, kind: "collection", label: "Review" },
];

/** Left padding applied to a top-level (depth 0) row, in pixels. */
const ROOT_INSET = 8;
/** Horizontal distance between nesting levels, in pixels. */
const INDENT_STEP = 16;
/** X offset of a level's guide line, aligned under that level's icon. */
const GUIDE_OFFSET = 15;

function navRowStyle(depth: number): CSSProperties {
  const level = Math.max(depth, 0);
  const style: Record<string, number | string> = {
    "--mbk-indent": `${level * INDENT_STEP}px`,
    paddingLeft: ROOT_INSET + level * INDENT_STEP,
  };
  if (level === 0) {
    return style as CSSProperties;
  }
  const images: string[] = [];
  const positions: string[] = [];
  const sizes: string[] = [];
  for (let ancestor = 0; ancestor < level; ancestor += 1) {
    images.push("linear-gradient(var(--mbk-guide), var(--mbk-guide))");
    positions.push(`${GUIDE_OFFSET + ancestor * INDENT_STEP}px 0`);
    sizes.push("1px 100%");
  }
  style.backgroundImage = images.join(", ");
  style.backgroundPosition = positions.join(", ");
  style.backgroundSize = sizes.join(", ");
  style.backgroundRepeat = "no-repeat";
  return style as CSSProperties;
}

function NavRow({
  activeLabel,
  node,
}: {
  activeLabel?: string | undefined;
  node: NavNode;
}) {
  const isActive =
    node.kind !== "collection" &&
    activeLabel !== undefined &&
    node.label === activeLabel;
  const className = isActive ? "mbk-nav-row active" : "mbk-nav-row";
  if (node.kind === "collection") {
    return (
      <span className={className} style={navRowStyle(node.depth)}>
        <span className="mbk-nav-ico folder" aria-hidden="true">
          {node.open ? <FolderOpenIcon /> : <FolderIcon />}
        </span>
        <span className="mbk-nav-label">{node.label}</span>
        {node.count !== undefined ? (
          <span className="mbk-nav-count">{node.count}</span>
        ) : null}
      </span>
    );
  }
  return (
    <span
      className={className}
      style={navRowStyle(node.depth)}
      aria-current={isActive ? "page" : undefined}
    >
      <span
        className={node.kind === "flow" ? "mbk-nav-ico flow" : "mbk-nav-ico"}
        aria-hidden="true"
      >
        {node.kind === "flow" ? <FlowIcon /> : <ScreenIcon />}
      </span>
      {node.label}
    </span>
  );
}

interface NavTreeProps {
  activeLabel?: string | undefined;
}

function CatalogueBody({ activeLabel }: NavTreeProps) {
  return (
    <>
      <div className="mbk-nav-head">
        Catalogue<span>Collapse all</span>
      </div>
      <div
        className="mbk-nav-filter"
        role="group"
        aria-label="Catalogue filter"
      >
        <span className="mbk-nav-filter-opt active">All</span>
        <span className="mbk-nav-filter-opt">
          Changed<span className="mbk-nav-filter-count">3</span>
        </span>
      </div>
      <div className="mbk-nav-scroll">
        {NAV_TREE.map((node, index) => (
          <NavRow
            key={`${node.label}-${index}`}
            activeLabel={activeLabel}
            node={node}
          />
        ))}
      </div>
    </>
  );
}

/** Persistent desktop catalogue navigation. */
export function NavTree({ activeLabel }: NavTreeProps) {
  return (
    <nav className="mbk-nav" aria-label="Catalogue">
      <CatalogueBody activeLabel={activeLabel} />
    </nav>
  );
}

/** Mobile catalogue navigation drawer, shown open. */
export function NavDrawer({ activeLabel }: NavTreeProps) {
  return (
    <nav className="mbk-nav mbk-drawer" aria-label="Catalogue">
      <CatalogueBody activeLabel={activeLabel} />
    </nav>
  );
}
