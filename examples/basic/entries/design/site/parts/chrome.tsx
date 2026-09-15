import type { ReactNode } from "react";

import { MockLink } from "@mokly/mokly";

import { SiteBrand } from "./brand.js";
import {
  APP_LINKS,
  SITE_SCREENS,
  currentPage,
  type SiteScreen,
} from "./links.js";

/** The docs search control, present only in the documentation header. */
function DocsSearch() {
  return (
    <button className="site-search" type="button">
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

/** Shared header: brand, Docs, Changelog, Sign in and Get started. */
export function SiteHeader({
  active,
  search = false,
}: {
  active: SiteScreen;
  search?: boolean;
}) {
  return (
    <header className="site-header">
      <SiteBrand />
      <nav aria-label="Main" className="site-nav">
        {search ? <DocsSearch /> : null}
        <MockLink
          aria-current={currentPage(active, SITE_SCREENS.docs)}
          className="site-nav-link"
          to={SITE_SCREENS.docs}
        >
          Docs
        </MockLink>
        <MockLink
          aria-current={currentPage(active, SITE_SCREENS.changelog)}
          className="site-nav-link site-desktop-only"
          to={SITE_SCREENS.changelog}
        >
          Changelog
        </MockLink>
        <a className="site-nav-link" href={APP_LINKS.signIn}>
          Sign in
        </a>
        <a
          className="site-button site-button--secondary site-desktop-only"
          href={APP_LINKS.signUp}
        >
          Get started <span aria-hidden="true">&#8594;</span>
        </a>
      </nav>
    </header>
  );
}

/** Shared footer: brand and the seven site destinations in order. */
export function SiteFooter({ active }: { active: SiteScreen }) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <SiteBrand />
        <nav aria-label="Footer" className="site-footer-nav">
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
          <a href={APP_LINKS.signIn}>Sign in</a>
          <a href={APP_LINKS.signUp}>Get started</a>
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
        </nav>
      </div>
    </footer>
  );
}

/** Skip link, header, page content and footer, in reading order. */
export function SiteLayout({
  active,
  children,
  search,
  viewport,
}: {
  active: SiteScreen;
  children: ReactNode;
  search?: boolean;
  viewport: "mobile" | "desktop";
}) {
  return (
    <div className="site-root" data-site-viewport={viewport}>
      <a className="site-skip" href="#main">
        Skip to content
      </a>
      <SiteHeader active={active} search={search ?? false} />
      {children}
      <SiteFooter active={active} />
    </div>
  );
}
