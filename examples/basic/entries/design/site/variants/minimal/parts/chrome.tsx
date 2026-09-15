import type { ReactNode } from "react";

import { MockLink } from "@mokly/mokly";

import { SiteBrand } from "../../../parts/brand.js";
import {
  APP_LINKS,
  SITE_SCREENS,
  currentPage,
  type SiteScreen,
} from "../../../parts/links.js";

/** The quiet search control, present only in the documentation header. */
function MinimalSearch() {
  return (
    <button className="site-search mn-search" type="button">
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

/** A spare header: the brand, then four quiet links and no boundaries. */
function MinimalHeader({
  active,
  search,
}: {
  active: SiteScreen;
  search: boolean;
}) {
  return (
    <header className="site-header mn-header">
      <SiteBrand />
      <nav aria-label="Main" className="site-nav mn-nav">
        {search ? <MinimalSearch /> : null}
        <MockLink
          aria-current={currentPage(active, SITE_SCREENS.docs)}
          className="site-nav-link"
          to={SITE_SCREENS.docs}
        >
          Docs
        </MockLink>
        <MockLink
          aria-current={currentPage(active, SITE_SCREENS.changelog)}
          className="site-nav-link"
          to={SITE_SCREENS.changelog}
        >
          Changelog
        </MockLink>
        <a className="site-nav-link" href={APP_LINKS.signIn}>
          Sign in
        </a>
        <a className="site-nav-link mn-nav-cta" href={APP_LINKS.signUp}>
          Get started <span aria-hidden="true">&#8594;</span>
        </a>
      </nav>
    </header>
  );
}

/** The footer centers the brand over the seven site destinations. */
function MinimalFooter({ active }: { active: SiteScreen }) {
  return (
    <footer className="site-footer mn-footer">
      <div className="site-footer-inner mn-footer-inner">
        <SiteBrand />
        <nav aria-label="Footer" className="site-footer-nav mn-footer-nav">
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

/** Skip link, spare header, page content and centered footer, in order. */
export function MinimalLayout({
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
    <div className="site-root mn-root" data-site-viewport={viewport}>
      <a className="site-skip" href="#main">
        Skip to content
      </a>
      <MinimalHeader active={active} search={search ?? false} />
      {children}
      <MinimalFooter active={active} />
    </div>
  );
}
