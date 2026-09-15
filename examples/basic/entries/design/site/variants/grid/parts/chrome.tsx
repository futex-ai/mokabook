import type { ReactNode } from "react";

import { MockLink } from "@mokly/mokly";

import { SiteBrand } from "../../../parts/brand.js";
import {
  APP_LINKS,
  SITE_SCREENS,
  currentPage,
  type SiteScreen,
} from "../../../parts/links.js";

/** Header row: brand on the left, the four global destinations on the right. */
function GridHeader({ active }: { active: SiteScreen }) {
  return (
    <header className="grid-header">
      <div className="grid-inner grid-header-inner">
        <SiteBrand />
        <nav aria-label="Main" className="grid-nav">
          <MockLink
            aria-current={currentPage(active, SITE_SCREENS.docs)}
            className="grid-nav-link"
            to={SITE_SCREENS.docs}
          >
            Docs
          </MockLink>
          <MockLink
            aria-current={currentPage(active, SITE_SCREENS.changelog)}
            className="grid-nav-link site-desktop-only"
            to={SITE_SCREENS.changelog}
          >
            Changelog
          </MockLink>
          <a className="grid-nav-link" href={APP_LINKS.signIn}>
            Sign in
          </a>
          <a
            className="site-button site-button--secondary site-desktop-only"
            href={APP_LINKS.signUp}
          >
            Get started <span aria-hidden="true">&#8594;</span>
          </a>
        </nav>
      </div>
    </header>
  );
}

/**
 * The context row under the header: where the reader is on the left, and the
 * navigation that belongs to this page on the right.
 */
export function GridSubhead({
  children,
  crumbs,
}: {
  children?: ReactNode;
  crumbs: readonly string[];
}) {
  return (
    <div className="grid-subhead">
      <div className="grid-inner grid-subhead-inner">
        <p className="grid-crumbs">
          {crumbs.map((crumb, index) => (
            <span key={crumb}>
              {index === 0 ? null : (
                <span aria-hidden="true" className="grid-crumb-rule">
                  /
                </span>
              )}
              {crumb}
            </span>
          ))}
        </p>
        {children === undefined ? null : (
          <div className="grid-subhead-end">{children}</div>
        )}
      </div>
    </div>
  );
}

/** The docs search control, present only in the documentation context row. */
export function GridSearch() {
  return (
    <button className="site-search grid-search" type="button">
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <circle
          cx="7"
          cy="7"
          r="4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M10.5 10.5 14 14"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      Search docs
    </button>
  );
}

/** Footer: the brand beside three grouped columns of the seven destinations. */
function GridFooter({ active }: { active: SiteScreen }) {
  return (
    <footer className="grid-footer">
      <div className="grid-inner grid-footer-inner">
        <SiteBrand />
        <nav aria-label="Footer" className="grid-footer-nav">
          <div className="grid-footer-group">
            <p className="grid-footer-title">Site</p>
            <MockLink
              aria-current={currentPage(active, SITE_SCREENS.home)}
              to={SITE_SCREENS.home}
            >
              Home
            </MockLink>
            <MockLink
              aria-current={currentPage(active, SITE_SCREENS.docs)}
              to={SITE_SCREENS.docs}
            >
              Docs
            </MockLink>
            <MockLink
              aria-current={currentPage(active, SITE_SCREENS.changelog)}
              to={SITE_SCREENS.changelog}
            >
              Changelog
            </MockLink>
          </div>
          <div className="grid-footer-group">
            <p className="grid-footer-title">Account</p>
            <a href={APP_LINKS.signIn}>Sign in</a>
            <a href={APP_LINKS.signUp}>Get started</a>
          </div>
          <div className="grid-footer-group">
            <p className="grid-footer-title">Policies</p>
            <MockLink
              aria-current={currentPage(active, SITE_SCREENS.terms)}
              to={SITE_SCREENS.terms}
            >
              Terms
            </MockLink>
            <MockLink
              aria-current={currentPage(active, SITE_SCREENS.privacy)}
              to={SITE_SCREENS.privacy}
            >
              Privacy
            </MockLink>
          </div>
        </nav>
      </div>
    </footer>
  );
}

/** Skip link, header, context row, page content and footer, in reading order. */
export function GridLayout({
  active,
  children,
  subhead,
  viewport,
}: {
  active: SiteScreen;
  children: ReactNode;
  subhead: ReactNode;
  viewport: "mobile" | "desktop";
}) {
  return (
    <div className="site-root grid-root" data-site-viewport={viewport}>
      <a className="site-skip" href="#main">
        Skip to content
      </a>
      <GridHeader active={active} />
      {subhead}
      {children}
      <GridFooter active={active} />
    </div>
  );
}
