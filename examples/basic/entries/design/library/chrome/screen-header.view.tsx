import { Fragment } from "react";

import { changeStatusBadge } from "../controls/change-status.js";
import { comparisonToolbar } from "../controls/comparison-toolbar.js";
import { useDesignStyle } from "../style_context.js";
import type { ScreenHeaderProps } from "./screen-header.js";
import { DesignLink } from "../../parts/design_navigation.js";

export function ScreenHeaderView({
  title,
  crumbs,
  idChip,
  status,
  comparisons,
  mode,
  accessible,
  destinations,
  actions,
}: ScreenHeaderProps) {
  useDesignStyle("screen-header");
  return (
    <>
      <div className="mbk-screen-head">
        <div>
          <nav className="mbk-crumbs" aria-label="Catalogue location">
            {crumbs.map((crumb, index) => (
              <Fragment key={crumb.key}>
                {index > 0 ? <span className="sep">›</span> : null}
                <DesignLink to={crumb.destination}>
                  <span>{crumb.label}</span>
                </DesignLink>
              </Fragment>
            ))}
          </nav>
          <div className="mbk-title-row">
            <h2>{title}</h2>
            {idChip ? (
              <span aria-label={`ID ${idChip}`} className="mbk-idchip">
                #{idChip}
              </span>
            ) : null}
            {status ? <changeStatusBadge.Component status={status} /> : null}
          </div>
        </div>
        {actions}
      </div>
      {idChip && comparisons ? (
        <comparisonToolbar.Component
          mode={mode}
          eligible
          accessible={accessible}
          destinations={destinations}
        />
      ) : null}
    </>
  );
}
