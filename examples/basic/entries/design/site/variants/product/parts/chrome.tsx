/**
 * Chrome for the Product direction: a white application band holding one
 * header row, and a footer whose seven site destinations are grouped into
 * columns. The documentation search sits in the header beside the
 * navigation; the location trail is set as the eyebrow above a page title.
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

/** The location trail, set as the eyebrow line above the page title. */
export function ProductEyebrow({ trail }: { trail: readonly string[] }) {
  return (
    <nav aria-label="Location" className="pd-eyebrow">
      {trail.map((step, index) => (
        <span className="pd-eyebrow-step" key={step}>
          {index > 0 ? (
            <span aria-hidden="true" className="pd-eyebrow-sep">
              &#8250;
            </span>
          ) : null}
          {step}
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

function ProductHeader({
  active,
  search,
}: {
  active: SiteScreen;
  search: boolean;
}) {
  return (
    <header className="site-header pd-header">
      <SiteBrand />
      {search ? <ProductSearch /> : null}
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
          className="pd-footer-link"
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
            <a className="pd-footer-link" href={APP_LINKS.signIn}>
              Sign in
            </a>
            <a className="pd-footer-link" href={APP_LINKS.signUp}>
              Get started
            </a>
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
  search = false,
  viewport,
}: {
  active: SiteScreen;
  children: ReactNode;
  search?: boolean;
  viewport: "mobile" | "desktop";
}) {
  return (
    <div className="site-root pd-root" data-site-viewport={viewport}>
      <a className="site-skip" href="#main">
        Skip to content
      </a>
      <div className="pd-band">
        <ProductHeader active={active} search={search} />
      </div>
      {children}
      <ProductFooter active={active} />
    </div>
  );
}
