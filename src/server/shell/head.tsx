// The heading block above every served Mokabook view: the breadcrumb trail and
// the screen title with its id chip. Parent breadcrumbs link back up the
// catalogue hierarchy. Structural collection crumbs remain text; only legacy
// directory groups with an Overview page become parent links.

import type { ReactNode } from "react";

import { encodeUrlPath } from "../../config/paths.js";
import type { Catalogue } from "../catalogue.js";
import {
  legacyCrumbTrail,
  legacyPageTitle,
  structuredCrumbTrail,
} from "./nav_tree.js";
import type { CrumbLink } from "./nav_tree.js";
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

/** Viewport selection shown in the header of a screen route. */
export function ViewportSwitch() {
  const options = [
    ["mobile", "Mobile"],
    ["desktop", "Desktop"],
    ["both", "Both"],
  ] as const;
  return (
    <span
      aria-label="Viewport"
      className="mbk-seg"
      data-mokabook-viewswitch=""
      role="group"
    >
      {options.map(([value, label]) => (
        <button
          aria-pressed={value === "both" ? "true" : "false"}
          data-viewport-option={value}
          key={value}
          type="button"
        >
          {label}
        </button>
      ))}
    </span>
  );
}

/**
 * Color scheme selection for catalogues that render dark fragments. The shell
 * renders one instance in the top bar and one in the screen head band; the
 * stylesheet reveals whichever fits the current width.
 */
export function SchemeSwitch() {
  const options = [
    ["light", "Light"],
    ["dark", "Dark"],
  ] as const;
  return (
    <span
      aria-label="Color scheme"
      className="mbk-seg"
      data-mokabook-schemeswitch=""
      role="group"
    >
      {options.map(([value, label]) => (
        <button
          aria-pressed={value === "light" ? "true" : "false"}
          data-color-scheme-option={value}
          key={value}
          type="button"
        >
          {label}
        </button>
      ))}
    </span>
  );
}

/** The breadcrumb, title, and optional action rendered above a target view. */
export function ScreenHead(props: {
  action?: ReactNode;
  crumbs: readonly CrumbLink[];
  heading: string;
  id?: string | undefined;
}) {
  return (
    <div className="mbk-screen-head">
      <div className="mbk-screen-head-copy">
        <Crumbs items={props.crumbs} />
        <div className="mbk-title-row">
          <h2>{props.heading}</h2>
          {props.id ? (
            <button
              aria-label={`Copy ID ${props.id}`}
              className="mbk-idchip"
              data-copy-id={props.id}
              type="button"
            >
              #{props.id}
            </button>
          ) : null}
        </div>
      </div>
      {props.action}
    </div>
  );
}

/** The breadcrumb trail, id, and title for one resolved route target. */
export function targetHead(
  catalogue: Catalogue,
  target: RouteTarget,
): { crumbs: CrumbLink[]; id?: string; title: string } {
  if (target.kind === "entry") {
    return {
      crumbs: structuredCrumbTrail(catalogue.hierarchy, target.entry.id),
      id: target.entry.id,
      title: target.entry.title,
    };
  }
  return {
    crumbs: legacyCrumbTrail(catalogue.manifest.legacyPages, target.page.route),
    title: legacyPageTitle(catalogue.manifest.legacyPages, target.page.route),
  };
}
