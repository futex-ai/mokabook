import type { ReactNode } from "react";

import { MockLink, type Viewport } from "@mokly/mokly";

import { MoklyMark } from "../../../parts/brand.js";
import { APP_LINKS } from "../../../parts/links.js";

import { BANDS_SCREENS, bandsCurrent, type BandsScreen } from "./links.js";

/** The three surfaces a band alternates between down the page. */
export type BandTone = "folio" | "muted" | "surface";

/** One full-bleed horizontal band with its content at the shared measure. */
export function Band({
  children,
  className,
  id,
  inner,
  tone,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  inner?: string;
  tone: BandTone;
}) {
  const band = ["bands-band", `bands-band--${tone}`, className]
    .filter((part) => part !== undefined)
    .join(" ");
  return (
    <section className={band} {...(id === undefined ? {} : { id })}>
      <div
        className={inner === undefined ? "bands-inner" : `bands-inner ${inner}`}
      >
        {children}
      </div>
    </section>
  );
}

/** The mark beside the wordmark, linking the direction's home. */
function BandsBrand() {
  return (
    <MockLink
      aria-label="Mokly home"
      className="site-brand"
      to={BANDS_SCREENS.home}
    >
      <MoklyMark />
      <span>
        mokly<span className="site-brand-dot">.</span>
      </span>
    </MockLink>
  );
}

/** The documentation search control, shown once on the documentation page. */
export function BandsSearch({ block = false }: { block?: boolean }) {
  return (
    <button
      className={
        block
          ? "site-search bands-search bands-search--block"
          : "site-search bands-search"
      }
      type="button"
    >
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

/** The hero and closing action pair, repeated on the home screen. */
export function BandsActions() {
  return (
    <div className="site-actions bands-actions">
      <a className="site-button site-button--primary" href={APP_LINKS.signUp}>
        Get started <span aria-hidden="true">&#8594;</span>
      </a>
      <MockLink
        className="site-button site-button--quiet"
        to={BANDS_SCREENS.docs}
      >
        Read the docs
      </MockLink>
    </div>
  );
}

/** The header band: brand, the site destinations and the sign-up action. */
export function BandsHeader({
  active,
  search = false,
}: {
  active: BandsScreen;
  search?: boolean;
}) {
  return (
    <div className="bands-band bands-band--folio bands-header-band">
      <header className="site-header bands-header">
        <BandsBrand />
        <nav aria-label="Main" className="bands-nav">
          {search ? <BandsSearch /> : null}
          <MockLink
            aria-current={bandsCurrent(active, BANDS_SCREENS.docs)}
            className="site-nav-link bands-nav-link"
            to={BANDS_SCREENS.docs}
          >
            Docs
          </MockLink>
          <MockLink
            aria-current={bandsCurrent(active, BANDS_SCREENS.changelog)}
            className="site-nav-link bands-nav-link site-desktop-only"
            to={BANDS_SCREENS.changelog}
          >
            Changelog
          </MockLink>
          <a className="site-nav-link bands-nav-link" href={APP_LINKS.signIn}>
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
    </div>
  );
}

/** The footer band: the brand beside grouped columns of every destination. */
export function BandsFooter({ active }: { active: BandsScreen }) {
  return (
    <footer className="site-footer bands-footer">
      <div className="bands-inner bands-footer-inner">
        <BandsBrand />
        <nav aria-label="Footer" className="bands-footer-nav">
          <div className="bands-footer-group">
            <p className="bands-footer-group-title">Site</p>
            <MockLink
              aria-current={bandsCurrent(active, BANDS_SCREENS.home)}
              to={BANDS_SCREENS.home}
            >
              Home
            </MockLink>
            <MockLink
              aria-current={bandsCurrent(active, BANDS_SCREENS.docs)}
              to={BANDS_SCREENS.docs}
            >
              Docs
            </MockLink>
            <MockLink
              aria-current={bandsCurrent(active, BANDS_SCREENS.changelog)}
              to={BANDS_SCREENS.changelog}
            >
              Changelog
            </MockLink>
          </div>
          <div className="bands-footer-group">
            <p className="bands-footer-group-title">Account</p>
            <a href={APP_LINKS.signIn}>Sign in</a>
            <a href={APP_LINKS.signUp}>Get started</a>
          </div>
          <div className="bands-footer-group">
            <p className="bands-footer-group-title">Legal</p>
            <MockLink to={BANDS_SCREENS.terms}>Terms</MockLink>
            <MockLink to={BANDS_SCREENS.privacy}>Privacy</MockLink>
          </div>
        </nav>
      </div>
    </footer>
  );
}

/** Skip link, header band, page bands and footer band, in reading order. */
export function BandsLayout({
  active,
  children,
  search,
  tabs,
  viewport,
}: {
  active: BandsScreen;
  children: ReactNode;
  search?: boolean;
  tabs?: ReactNode;
  viewport: Viewport;
}) {
  return (
    <div className="site-root bands-root" data-site-viewport={viewport}>
      <a className="site-skip" href="#main">
        Skip to content
      </a>
      <BandsHeader active={active} search={search ?? false} />
      {tabs}
      {children}
      <BandsFooter active={active} />
    </div>
  );
}
