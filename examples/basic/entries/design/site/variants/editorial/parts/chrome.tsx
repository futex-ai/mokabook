import type { ReactNode } from "react";

import { MockLink } from "@mokly/mokly";

import { SiteBrand } from "../../../parts/brand.js";
import {
  APP_LINKS,
  SITE_SCREENS,
  currentPage,
  type SiteScreen,
} from "../../../parts/links.js";

/** The docs search control, carried in the masthead rail of the docs page. */
function EditorialSearch() {
  return (
    <button className="site-search ed-search" type="button">
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

/**
 * The masthead: a heavy top rule, the brand and main navigation on the first
 * ruled line, and a page rail between two hairlines below it.
 */
export function EditorialMasthead({
  active,
  rail,
  search = false,
}: {
  active: SiteScreen;
  rail: ReactNode;
  search?: boolean;
}) {
  return (
    <header className="ed-masthead">
      <div className="ed-masthead-line">
        <div className="ed-measure ed-masthead-row">
          <SiteBrand />
          <nav aria-label="Main" className="ed-nav">
            <MockLink
              aria-current={currentPage(active, SITE_SCREENS.docs)}
              className="ed-nav-link"
              to={SITE_SCREENS.docs}
            >
              Docs
            </MockLink>
            <MockLink
              aria-current={currentPage(active, SITE_SCREENS.changelog)}
              className="ed-nav-link site-desktop-only"
              to={SITE_SCREENS.changelog}
            >
              Changelog
            </MockLink>
            <a className="ed-nav-link" href={APP_LINKS.signIn}>
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
      </div>
      <div className="ed-masthead-rail">
        <div className="ed-measure ed-rail">
          {rail}
          {search ? <EditorialSearch /> : null}
        </div>
      </div>
    </header>
  );
}

/** The footer: one heavy rule, the brand and the seven links in three groups. */
export function EditorialFooter({ active }: { active: SiteScreen }) {
  return (
    <footer className="ed-footer">
      <div className="ed-measure ed-footer-inner">
        <SiteBrand />
        <nav aria-label="Footer" className="ed-footer-nav">
          <div className="ed-footer-group">
            <span className="ed-rubric">Site</span>
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
          <div className="ed-footer-group">
            <span className="ed-rubric">Account</span>
            <a href={APP_LINKS.signIn}>Sign in</a>
            <a href={APP_LINKS.signUp}>Get started</a>
          </div>
          <div className="ed-footer-group">
            <span className="ed-rubric">Legal</span>
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

/**
 * Skip link, masthead, page content and footer, in reading order. The
 * documentation measure is wider than the marketing measure, and the masthead
 * and footer rules align with whichever measure the page uses.
 */
export function EditorialLayout({
  active,
  children,
  measure = "marketing",
  rail,
  search,
  viewport,
}: {
  active: SiteScreen;
  children: ReactNode;
  measure?: "docs" | "marketing";
  rail: ReactNode;
  search?: boolean;
  viewport: "mobile" | "desktop";
}) {
  return (
    <div
      className={
        measure === "docs"
          ? "site-root ed-root ed-root--docs"
          : "site-root ed-root"
      }
      data-site-viewport={viewport}
    >
      <a className="site-skip" href="#main">
        Skip to content
      </a>
      <EditorialMasthead active={active} rail={rail} search={search ?? false} />
      {children}
      <EditorialFooter active={active} />
    </div>
  );
}
