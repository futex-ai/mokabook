// The heading block above every served Mokabook view: the breadcrumb trail and
// the screen title with its id chip. Parent breadcrumbs link back up the
// catalogue hierarchy. Structural collection crumbs remain text; only legacy
// directory groups with an Overview page become parent links.

import { encodeUrlPath } from "../../config/paths.js";
import type { Catalogue } from "../catalogue.js";
import { buildNavTree, resolveCrumbTrail, titleCase } from "./nav_tree.js";
import type { CrumbLink, NavNode } from "./nav_tree.js";
import type { RouteTarget } from "./target.js";

function Crumbs(props: { items: readonly CrumbLink[] }) {
  return (
    <p aria-label="Catalogue location" className="mbk-crumbs">
      {props.items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 ? <span className="sep">›</span> : null}
          {item.route ? (
            <a
              className="mbk-crumb-link"
              href={`/view/${encodeUrlPath(item.route)}`}
            >
              {item.label}
            </a>
          ) : (
            item.label
          )}
        </span>
      ))}
    </p>
  );
}

/** The breadcrumb + title block rendered above every target view. */
export function ScreenHead(props: {
  crumbs: readonly CrumbLink[];
  heading: string;
  id?: string | undefined;
}) {
  return (
    <div className="mbk-screen-head">
      <Crumbs items={props.crumbs} />
      <div className="mbk-title-row">
        <h2>{props.heading}</h2>
        {props.id ? (
          <a
            className="mbk-idchip"
            href={`/id/${encodeURIComponent(props.id)}`}
          >
            {props.id}
          </a>
        ) : null}
      </div>
    </div>
  );
}

/** The breadcrumb trail, id, and title for one resolved route target. */
export function targetHead(
  catalogue: Catalogue,
  target: RouteTarget,
): { crumbs: CrumbLink[]; id?: string; title: string } {
  const tree = navTreeFor(catalogue);
  if (target.kind === "entry") {
    return {
      crumbs: crumbsFor(tree, target.entry.navPath, target.entry.route),
      id: target.entry.id,
      title: target.entry.title,
    };
  }
  const segments = target.page.route.split("/");
  const stem = (segments.pop() ?? "").replace(/\.html$/, "");
  const labels = segments.map(titleCase);
  const title =
    stem === "index"
      ? labels.length > 0
        ? "Overview"
        : "Home"
      : titleCase(stem);
  return { crumbs: crumbsFor(tree, labels, target.page.route), title };
}

const navTreeCache = new WeakMap<Catalogue, NavNode[]>();

function navTreeFor(catalogue: Catalogue): NavNode[] {
  const cached = navTreeCache.get(catalogue);
  if (cached) {
    return cached;
  }
  const tree = buildNavTree(
    catalogue.manifest.entries,
    catalogue.manifest.legacyPages,
  );
  navTreeCache.set(catalogue, tree);
  return tree;
}

/**
 * Resolve the trail and drop the link on any crumb that resolves to the page
 * being viewed — a legacy directory's Overview crumb would otherwise point at
 * itself when that Overview page is the current target.
 */
function crumbsFor(
  tree: readonly NavNode[],
  labels: readonly string[],
  activeRoute: string,
): CrumbLink[] {
  return resolveCrumbTrail(tree, labels).map((crumb) =>
    crumb.route === activeRoute ? { label: crumb.label } : crumb,
  );
}
