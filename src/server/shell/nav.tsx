// Renders the served Mokly left navigation as native disclosure elements:
// groups are <details> whose summary row carries the folder icon (no chevron),
// so collapsing works without any client script and the shell stylesheet swaps
// the closed folder for the open one while the <details> is open. Leaves are
// plain links to their `/view/<route>` page marked with the screen / page /
// use-case icon for their kind. Folders and leaves share one icon column so a
// folder's label lines up with a sibling file's label at the same depth, and
// every row paints faint vertical guide lines (see `navRowStyle`) so the
// nesting reads at a glance. Groups on the path to the active route open by
// default; top-level groups start open so the catalogue is scannable.

import { catalogueViewHref } from "../../navigation/delivery.js";
import type { Catalogue } from "../catalogue.js";
import type { ShellContext } from "./context.js";
import {
  FlowIcon,
  FolderIcon,
  FolderOpenIcon,
  PageIcon,
  ScreenIcon,
} from "./icons.js";
import { navRowStyle } from "./nav_guides.js";
import { NavigationResizeHandle } from "./nav_resize.js";
import { buildNavTree } from "./nav_tree.js";
import type { NavGroupNode, NavLeafNode, NavNode } from "./nav_tree.js";
import { WorkspaceIcon } from "./workspace_icons.js";
import { NavFilter, NavStatus } from "./nav_filter.js";

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
      {props.entryKind === "component" ? (
        <WorkspaceIcon name="components" />
      ) : props.entryKind === "page" ? (
        <PageIcon />
      ) : (
        <ScreenIcon />
      )}
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
  const tags = props.node.tags ?? [];
  return (
    <a
      aria-current={active ? "page" : undefined}
      className="mbk-nav-row"
      data-changed={changed ? "true" : undefined}
      data-entry-id={props.node.entryId}
      data-nav-row=""
      data-nav-removed={props.node.key.startsWith("removed:") ? "" : undefined}
      data-removed-page={props.node.removedPage ? "" : undefined}
      hidden={props.node.removedPage ? true : undefined}
      data-route={props.node.route}
      data-tags={tags.length > 0 ? tags.join(" ") : undefined}
      href={catalogueViewHref(props.node.route)}
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
  node: NavGroupNode;
}) {
  const node = props.node;
  const open =
    props.depth === 0 || containsRoute(node, props.context.activeRoute);
  return (
    <details
      className="mbk-nav-group"
      data-nav-collection={node.key}
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
      />
    </details>
  );
}

function NavRows(props: {
  context: ShellContext;
  depth: number;
  nodes: readonly NavNode[];
}) {
  return (
    <>
      {props.nodes.map((node) => {
        return node.kind === "group" ? (
          <GroupRow
            context={props.context}
            depth={props.depth}
            key={node.key}
            node={node}
          />
        ) : (
          <LeafRow
            context={props.context}
            depth={props.depth}
            key={node.key}
            node={node}
          />
        );
      })}
    </>
  );
}

/** The served catalogue navigation column. */
export function CatalogueNav(props: {
  catalogue: Catalogue;
  context: ShellContext;
}) {
  const nodes = [
    ...buildNavTree(props.catalogue.hierarchy),
    ...props.catalogue.removedEntries.map(({ entry }): NavLeafNode => ({
      kind: "leaf",
      key: `removed:${entry.route}`,
      entryId: entry.id,
      entryKind: entry.kind,
      label: `${entry.title} · Removed`,
      route: entry.route,
      tags: entry.tags ?? [],
      removedPage: entry.kind === "page",
    })),
  ];
  return (
    <nav
      aria-label="Catalogue"
      className="mbk-nav"
      data-mokly-nav=""
      id="mb-nav"
    >
      <div className="mbk-nav-head">
        Catalogue
        <button
          className="mbk-nav-collapse"
          data-mokly-collapse=""
          type="button"
        >
          Collapse all
        </button>
      </div>
      <NavFilter context={props.context} />
      <div className="mbk-nav-scroll" data-mokly-nav-scroll="">
        <NavStatus context={props.context} />
        <NavRows context={props.context} depth={0} nodes={nodes} />
      </div>
      <NavigationResizeHandle />
    </nav>
  );
}
