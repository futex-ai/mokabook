import { MockLink } from "@mokly/mokly";

import { APP_LINKS, SITE_SCREENS } from "./links.js";

/** The hero and closing action pair, repeated on the home screen. */
export function SiteActions() {
  return (
    <div className="site-actions">
      <a className="site-button site-button--primary" href={APP_LINKS.signUp}>
        Get started <span aria-hidden="true">&#8594;</span>
      </a>
      <MockLink
        className="site-button site-button--quiet"
        to={SITE_SCREENS.docs}
      >
        Read the docs
      </MockLink>
    </div>
  );
}
