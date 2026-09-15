/**
 * The catalogue shell as the home's hero image. The depiction follows the
 * real Mokly shell — top bar, catalogue navigation with its Pages and
 * Components sections and the All or Changes filter, the screen header, and
 * the stage holding the example Welcome screen in a browser frame — redrawn
 * from the site tokens. The framed panel carries the merged pull request
 * label and the Ready for review status the site publishes with it.
 */

import {
  ChevronGlyph,
  ComponentGlyph,
  FlowGlyph,
  FolderGlyph,
  MarkGlyph,
  PageGlyph,
  ScreenGlyph,
  SearchGlyph,
  TagGlyph,
} from "./glyphs.js";

/** The merged pull request whose publication the stage depicts. */
export const STAGE_PULL_REQUEST = "Pull request #71";

/** The example screen the stage holds. */
export const STAGE_SCREEN = "Welcome";

type RowKind = "collection" | "component" | "flow" | "page" | "screen";

interface NavigationRow {
  count?: number;
  current?: boolean;
  depth: 0 | 1 | 2;
  kind: RowKind;
  label: string;
}

interface NavigationSection {
  rows: readonly NavigationRow[];
  title: string;
}

const NAVIGATION: readonly NavigationSection[] = [
  {
    rows: [
      { count: 2, depth: 0, kind: "collection", label: "Design" },
      { count: 3, depth: 1, kind: "collection", label: "Mokly design" },
      { count: 6, depth: 1, kind: "collection", label: "Site" },
      { count: 3, depth: 0, kind: "collection", label: "Example" },
      { count: 2, depth: 1, kind: "collection", label: "Screens" },
      { current: true, depth: 2, kind: "screen", label: "Welcome" },
      { depth: 2, kind: "screen", label: "Details" },
      { depth: 1, kind: "flow", label: "Example tour" },
      { depth: 1, kind: "page", label: "Getting started" },
    ],
    title: "Pages",
  },
  {
    rows: [
      { count: 1, depth: 0, kind: "collection", label: "Design" },
      { count: 4, depth: 1, kind: "collection", label: "Shared components" },
      { count: 1, depth: 0, kind: "collection", label: "Example" },
      { count: 2, depth: 1, kind: "collection", label: "Components" },
      { depth: 2, kind: "component", label: "Action" },
      { depth: 2, kind: "component", label: "Toolbar" },
    ],
    title: "Components",
  },
];

function RowGlyph({ kind }: { kind: RowKind }) {
  if (kind === "collection") return <FolderGlyph />;
  if (kind === "component") return <ComponentGlyph />;
  if (kind === "flow") return <FlowGlyph />;
  if (kind === "page") return <PageGlyph />;
  return <ScreenGlyph />;
}

function rowClassName(row: NavigationRow): string {
  const classes = ["site-row"];
  if (row.kind === "collection") classes.push("site-row--group");
  if (row.current) classes.push("site-row--current");
  return classes.join(" ");
}

function NavigationTree() {
  return (
    <nav aria-label="Catalogue" className="site-tree">
      <div className="site-tree-head">
        Catalogue<span>Collapse all</span>
      </div>
      <div className="site-filter" role="group" aria-label="Catalogue filter">
        <span className="site-filter-option site-filter-option--current">
          All
        </span>
        <span className="site-filter-option">
          Changes<span className="site-filter-count">3</span>
        </span>
      </div>
      <div className="site-tree-scroll">
        {NAVIGATION.map((section) => (
          <div className="site-tree-section" key={section.title}>
            <p className="site-tree-section-head">
              <span aria-hidden="true" className="site-tree-chevron">
                <ChevronGlyph />
              </span>
              {section.title}
            </p>
            {section.rows.map((row) => (
              <span
                className={rowClassName(row)}
                data-site-depth={row.depth}
                key={`${section.title}-${row.label}-${row.depth}`}
              >
                <span aria-hidden="true" className="site-row-ico">
                  <RowGlyph kind={row.kind} />
                </span>
                <span className="site-row-label">{row.label}</span>
                {row.count === undefined ? null : (
                  <span className="site-row-count">{row.count}</span>
                )}
              </span>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}

function ShellTopBar({ viewport }: { viewport: "mobile" | "desktop" }) {
  return (
    <div className="site-topbar">
      {viewport === "mobile" ? (
        <span aria-hidden="true" className="site-topbar-menu">
          <span />
          <span />
          <span />
        </span>
      ) : null}
      <span className="site-topbar-brand">
        <span aria-hidden="true" className="site-topbar-mark">
          <MarkGlyph />
        </span>
        {viewport === "desktop" ? "Mokly" : null}
      </span>
      <span className="site-topbar-search">
        <SearchGlyph />
        Search catalogue&#8230;
        <span aria-hidden="true" className="site-topbar-tag">
          <TagGlyph />
        </span>
      </span>
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="site-shot">
      <div className="site-shot-bar">
        <span aria-hidden="true" className="site-shot-dots">
          <span />
          <span />
          <span />
        </span>
        <span className="site-shot-address">example.test/welcome</span>
      </div>
      <div className="site-shot-body">
        <span className="site-shot-nav">Example navigation</span>
        <span className="site-shot-head">
          <span className="site-shot-title">Welcome to Mokly</span>
          <span className="site-badge site-badge--neutral">Example</span>
        </span>
        <span className="site-shot-field">Name this workspace</span>
        <span className="site-shot-button">View details</span>
        <span className="site-shot-link">Open the details screen</span>
        <span className="site-shot-panel">
          <span className="site-shot-panel-title">Workspace actions</span>
          <span>Explore the catalogue.</span>
        </span>
        <span className="site-shot-link">Read the handbook</span>
        <span className="site-shot-link">See the Mokly shell design</span>
      </div>
    </div>
  );
}

function ScreenHeader() {
  return (
    <div className="site-screen-head">
      <nav aria-label="Catalogue location" className="site-crumbs">
        <span className="site-crumb">Catalogue home</span>
        <span className="site-crumb">
          <span aria-hidden="true" className="site-crumb-sep">
            &#8250;
          </span>
          Example
        </span>
        <span className="site-crumb">
          <span aria-hidden="true" className="site-crumb-sep">
            &#8250;
          </span>
          Screens
        </span>
      </nav>
      <div className="site-screen-title-row">
        <span className="site-screen-title">{STAGE_SCREEN}</span>
        <span className="site-idchip">#welcome</span>
      </div>
    </div>
  );
}

/**
 * The framed Browse: the pull request head, the shell itself and the screen
 * the publication names.
 */
export function CatalogueFrame({
  viewport,
}: {
  viewport: "mobile" | "desktop";
}) {
  return (
    <figure className="site-frame">
      <div className="site-frame-head">
        <span className="site-frame-label">{STAGE_PULL_REQUEST}</span>
        <span className="site-badge site-badge--success">
          <span aria-hidden="true" className="site-badge-dot" />
          Ready for review
        </span>
      </div>
      <div className="site-shell">
        <ShellTopBar viewport={viewport} />
        <div className="site-shell-body">
          {viewport === "desktop" ? <NavigationTree /> : null}
          <div className="site-shell-main">
            <ScreenHeader />
            <div className="site-stage">
              <p className="site-stage-label">Desktop</p>
              <WelcomeScreen />
            </div>
          </div>
        </div>
      </div>
      <figcaption className="site-frame-foot">
        <span className="site-frame-foot-label">Screen</span>
        {STAGE_SCREEN}
      </figcaption>
    </figure>
  );
}
