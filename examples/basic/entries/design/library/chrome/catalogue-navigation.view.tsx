import { useDesignStyle } from "../style_context.js";
import type { CSSProperties } from "react";
import type { Viewport } from "mokabook";
import { MockLink } from "mokabook";
import { DesignLink } from "../../parts/design_navigation.js";
import type { DesignDestination } from "../../parts/destinations.js";
import {
  ChevronIcon,
  FlowIcon,
  FolderIcon,
  FolderOpenIcon,
  ScreenIcon,
  PageIcon,
} from "../../parts/icons.js";
import { NavResizeHandle } from "../../parts/nav_resize.js";
import type { CatalogueNavigationProps } from "./catalogue-navigation.js";
import {
  navigationSections,
  type NavigationRow,
} from "./catalogue-navigation-sections.js";

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
  activeDestination,
  activeLabel,
  node,
}: {
  activeDestination?: DesignDestination | undefined;
  activeLabel?: string | undefined;
  node: NavigationRow;
}) {
  const isActive =
    node.kind !== "collection" &&
    (activeDestination !== undefined
      ? node.to === activeDestination
      : activeLabel !== undefined && node.label === activeLabel);
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
  const content = (
    <>
      <span
        className={node.kind === "flow" ? "mbk-nav-ico flow" : "mbk-nav-ico"}
        aria-hidden="true"
      >
        {node.kind === "component" ? (
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 16 16"
            width="15"
            height="15"
          >
            <path d="m8 1 6 3.5v7L8 15l-6-3.5v-7L8 1Zm0 7 6-3.5M8 8v7M8 8 2 4.5" />
          </svg>
        ) : node.kind === "page" ? (
          <PageIcon />
        ) : node.kind === "flow" ? (
          <FlowIcon />
        ) : (
          <ScreenIcon />
        )}
      </span>
      {node.label}
    </>
  );
  const rowProps = {
    className,
    style: navRowStyle(node.depth),
    "aria-current": isActive ? ("page" as const) : undefined,
  };
  return node.to === undefined ? (
    <span {...rowProps}>{content}</span>
  ) : (
    <MockLink {...rowProps} to={node.to}>
      {content}
    </MockLink>
  );
}

export function CatalogueNavigationView({
  activeDestination,
  activeLabel,
  changedCount,
  changedOnly,
  changesStatus = "ready",
  showChanges = true,
  rows,
  presentation,
  allDestination,
  changesDestination,
  viewport,
}: CatalogueNavigationProps & { viewport: Viewport }) {
  useDesignStyle("catalogue-navigation");
  const sections = navigationSections(rows);
  const body = (
    <>
      <div className="mbk-nav-head">
        Catalogue<span>Collapse all</span>
      </div>
      {showChanges ? (
        <div
          className="mbk-nav-filter"
          role="group"
          aria-label="Catalogue filter"
        >
          <DesignLink to={changedOnly ? allDestination : undefined}>
            <span
              className={
                changedOnly ? "mbk-nav-filter-opt" : "mbk-nav-filter-opt active"
              }
            >
              All
            </span>
          </DesignLink>
          <DesignLink to={changedOnly ? undefined : changesDestination}>
            <span
              className={
                changedOnly ? "mbk-nav-filter-opt active" : "mbk-nav-filter-opt"
              }
            >
              Changes
              <span className="mbk-nav-filter-count">
                {changesStatus === "pending" ? (
                  <span
                    className="mbk-nav-spinner"
                    aria-label="Checking for changes"
                    role="status"
                  />
                ) : changesStatus === "ready" ? (
                  changedCount
                ) : (
                  "—"
                )}
              </span>
            </span>
          </DesignLink>
        </div>
      ) : null}
      <div className="mbk-nav-scroll">
        {changedOnly && changesStatus !== "ready" ? (
          <div className="mbk-nav-status" role="status">
            {changesStatus === "pending" ? (
              <span className="mbk-nav-spinner" aria-hidden="true" />
            ) : null}
            {changesStatus === "pending"
              ? "Checking for changes…"
              : "Changes are unavailable. You can still browse All."}
          </div>
        ) : (
          sections.map((section) => (
            <details
              className="mbk-nav-section"
              data-nav-section={section.id}
              key={section.id}
              open
            >
              <summary className="mbk-nav-section-head">
                <span className="mbk-nav-section-chevron" aria-hidden="true">
                  <ChevronIcon />
                </span>
                {section.label}
              </summary>
              {section.rows.map((node) => (
                <NavRow
                  key={node.key}
                  activeDestination={activeDestination}
                  activeLabel={activeLabel}
                  node={node}
                />
              ))}
            </details>
          ))
        )}
      </div>
    </>
  );
  const drawer = presentation === "drawer" || viewport === "mobile";
  return (
    <nav
      className={drawer ? "mbk-nav mbk-drawer" : "mbk-nav"}
      aria-label="Catalogue"
    >
      {body}
      {drawer ? null : <NavResizeHandle />}
    </nav>
  );
}
