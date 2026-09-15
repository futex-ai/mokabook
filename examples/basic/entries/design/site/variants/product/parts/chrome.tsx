/**
 * Chrome for the Product direction: a white application band holding the
 * header and a utility bar, and a footer whose seven site destinations are
 * grouped into columns. The band, the crumb trail and the control geometry
 * follow the Mokly catalogue shell.
 */

import type { ReactNode } from "react";

import { MockLink } from "@mokly/mokly";

import { SiteBrand } from "../../../parts/brand.js";
import {
  APP_LINKS,
  SITE_SCREENS,
  currentPage,
  type SiteScreen,
} from "../../../parts/links.js";

import { SearchGlyph } from "./glyphs.js";
import { PACKAGE_VERSION } from "./version.js";

/** The catalogue's crumb trail, reused as the site's location line. */
export function ProductCrumbs({ trail }: { trail: readonly string[] }) {
  return (
    <nav aria-label="Location" className="pd-crumbs">
      {trail.map((crumb, index) => (
        <span className="pd-crumb" key={crumb}>
          {index > 0 ? (
            <span aria-hidden="true" className="pd-crumb-sep">
              &#8250;
            </span>
          ) : null}
          {crumb}
        </span>
      ))}
    </nav>
  );
}

/** The published CLI version, shown as the shell's quiet identity chip. */
export function ProductVersion({ label }: { label: string }) {
  return (
    <span className="pd-version">
      <span className="pd-version-label">{label}</span>
      {PACKAGE_VERSION}
    </span>
  );
}

/** The documentation search control, shaped like the catalogue's own. */
export function ProductSearch() {
  return (
    <button className="site-search pd-search" type="button">
      <SearchGlyph />
      Search docs
    </button>
  );
}

/** The utility bar under the header: location on the left, controls right. */
export function ProductUtility({
  controls,
  lead,
}: {
  controls: ReactNode;
  lead: ReactNode;
}) {
  return (
    <div className="pd-utility">
      <div className="pd-utility-inner">
        {lead}
        <div className="pd-utility-controls">{controls}</div>
      </div>
    </div>
  );
}

function ProductHeader({ active }: { active: SiteScreen }) {
  return (
    <header className="site-header pd-header">
      <SiteBrand />
      <nav aria-label="Main" className="site-nav pd-nav">
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

function FooterGroup({
  active,
  screens,
  title,
}: {
  active: SiteScreen;
  screens: ReadonlyArray<readonly [SiteScreen, string]>;
  title: string;
}) {
  return (
    <div className="pd-footer-group">
      <p className="pd-footer-heading">{title}</p>
      {screens.map(([screen, label]) => (
        <MockLink
          aria-current={currentPage(active, screen)}
          key={screen}
          to={screen}
        >
          {label}
        </MockLink>
      ))}
    </div>
  );
}

function ProductFooter({ active }: { active: SiteScreen }) {
  return (
    <footer className="site-footer pd-footer">
      <div className="pd-footer-inner">
        <div className="pd-footer-brand">
          <SiteBrand />
          <p>The Mokly CLI is open source under the MIT license.</p>
        </div>
        <nav aria-label="Footer" className="pd-footer-nav">
          <FooterGroup
            active={active}
            screens={[
              [SITE_SCREENS.home, "Home"],
              [SITE_SCREENS.docs, "Docs"],
              [SITE_SCREENS.changelog, "Changelog"],
            ]}
            title="Product"
          />
          <div className="pd-footer-group">
            <p className="pd-footer-heading">Account</p>
            <a href={APP_LINKS.signIn}>Sign in</a>
            <a href={APP_LINKS.signUp}>Get started</a>
          </div>
          <FooterGroup
            active={active}
            screens={[
              [SITE_SCREENS.terms, "Terms"],
              [SITE_SCREENS.privacy, "Privacy"],
            ]}
            title="Legal"
          />
        </nav>
      </div>
    </footer>
  );
}

/** Skip link, application band, page content and grouped footer, in order. */
export function ProductLayout({
  active,
  children,
  utility,
  viewport,
}: {
  active: SiteScreen;
  children: ReactNode;
  utility: ReactNode;
  viewport: "mobile" | "desktop";
}) {
  return (
    <div className="site-root pd-root" data-site-viewport={viewport}>
      <a className="site-skip" href="#main">
        Skip to content
      </a>
      <div className="pd-band">
        <ProductHeader active={active} />
        {utility}
      </div>
      {children}
      <ProductFooter active={active} />
    </div>
  );
}
