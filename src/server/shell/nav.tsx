// Renders the served Mokabook left navigation as native disclosure elements:
// groups are <details> whose summary row carries the folder icon (no chevron),
// so collapsing works without any client script and the shell stylesheet swaps
// the closed folder for the open one while the <details> is open. Leaves are
// plain links to their `/view/<route>` page marked with the screen / page /
// use-case icon for their kind. Folders and leaves share one icon column so a
// folder's label lines up with a sibling file's label at the same depth, and
// every row paints faint vertical guide lines (see `navRowStyle`) so the
// nesting reads at a glance. Groups on the path to the active route open by
// default; top-level groups start open so the catalogue is scannable.

import { encodeUrlPath } from "../../config/paths.js";
import type { ManifestV3 } from "../../registry/types.js";
import type { ShellContext } from "./context.js";
import {
  FlowIcon,
  FolderIcon,
  FolderOpenIcon,
  PageIcon,
  ScreenIcon,
} from "./icons.js";
import { navRowStyle } from "./nav_guides.js";
import { buildNavTree } from "./nav_tree.js";
import type { NavGroupNode, NavLeafNode, NavNode } from "./nav_tree.js";

function containsRoute(node: NavNode, route: string | undefined): boolean {
  if (route === undefined) {
    return false;
  }
  if (node.kind === "leaf") {
    return node.route === route;
  }
  return node.children.some((child) => containsRoute(child, route));
}

function LeafGlyph(props: { entryKind: NavLeafNode["entryKind"] }) {
  if (props.entryKind === "use-case") {
    return (
      <span className="mbk-nav-ico flow">
        <FlowIcon />
      </span>
    );
  }
  return (
    <span className="mbk-nav-ico">
      {props.entryKind === "page" ? <PageIcon /> : <ScreenIcon />}
    </span>
  );
}

function LeafRow(props: {
  context: ShellContext;
  depth: number;
  node: NavLeafNode;
}) {
  const active = props.node.route === props.context.activeRoute;
  const changed =
    props.context.changedRoutes?.includes(props.node.route) === true;
  return (
    <a
      aria-current={active ? "page" : undefined}
      className="mbk-nav-row"
      data-changed={changed ? "true" : undefined}
      data-nav-row=""
      data-route={props.node.route}
      href={`/view/${encodeUrlPath(props.node.route)}`}
      style={navRowStyle(props.depth)}
    >
      <LeafGlyph entryKind={props.node.entryKind} />
      {props.node.label}
    </a>
  );
}

function GroupRow(props: {
  context: ShellContext;
  depth: number;
  navKey: string;
  node: NavGroupNode;
}) {
  const node = props.node;
  const open =
    props.depth === 0 || containsRoute(node, props.context.activeRoute);
  return (
    <details
      className="mbk-nav-group"
      data-nav-collection={props.navKey}
      open={open ? true : undefined}
    >
      <summary className="mbk-nav-row" style={navRowStyle(props.depth)}>
        <span className="mbk-nav-ico folder">
          <FolderIcon />
          <FolderOpenIcon />
        </span>
        <span className="mbk-nav-label">{node.label}</span>
        {node.children.length > 0 ? (
          <span className="mbk-nav-count">{node.children.length}</span>
        ) : null}
      </summary>
      <NavRows
        context={props.context}
        depth={props.depth + 1}
        nodes={node.children}
        parentKey={props.navKey}
      />
    </details>
  );
}

function NavRows(props: {
  context: ShellContext;
  depth: number;
  nodes: readonly NavNode[];
  parentKey: string;
}) {
  return (
    <>
      {props.nodes.map((node, index) => {
        const segment = node.kind === "group" ? node.label : node.route;
        const key = `${props.parentKey}/${segment}`;
        return node.kind === "group" ? (
          <GroupRow
            context={props.context}
            depth={props.depth}
            key={`${node.label}-${index}`}
            navKey={key}
            node={node}
          />
        ) : (
          <LeafRow
            context={props.context}
            depth={props.depth}
            key={`${node.label}-${index}`}
            node={node}
          />
        );
      })}
    </>
  );
}

function NavFilter(props: { context: ShellContext }) {
  const changed = props.context.changedRoutes;
  if (!changed || props.context.mode !== "browse") {
    return null;
  }
  return (
    <div
      aria-label="Catalogue filter"
      className="mbk-nav-filter"
      data-mokabook-filter=""
      role="group"
    >
      <button
        aria-pressed="true"
        className="mbk-nav-filter-opt"
        data-filter="all"
        type="button"
      >
        All
      </button>
      <button
        aria-pressed="false"
        className="mbk-nav-filter-opt"
        data-filter="changed"
        type="button"
      >
        Changed
        <span className="mbk-nav-filter-count">{changed.length}</span>
      </button>
    </div>
  );
}

/** The served catalogue navigation column. */
export function CatalogueNav(props: {
  context: ShellContext;
  manifest: ManifestV3;
}) {
  const nodes = buildNavTree(
    props.manifest.entries,
    props.manifest.legacyPages,
  );
  return (
    <nav
      aria-label="Catalogue"
      className="mbk-nav"
      data-mokabook-nav=""
      id="mb-nav"
    >
      <div className="mbk-nav-head">
        Catalogue
        <button
          className="mbk-nav-collapse"
          data-mokabook-collapse=""
          type="button"
        >
          Collapse all
        </button>
      </div>
      <NavFilter context={props.context} />
      <div className="mbk-nav-scroll" data-mokabook-nav-scroll="">
        <NavRows context={props.context} depth={0} nodes={nodes} parentKey="" />
      </div>
    </nav>
  );
}
