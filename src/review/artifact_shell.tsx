// The Mokabook shell scaffold shared by every Review artifact page: the top
// bar with brand, base indicator, and Browse/Review modes, plus the
// changed-screens navigation column the design mockups specify. Compare pages
// live three directories below the artifact root, so every shell link is
// prefixed with the page's relative path back to that root.

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { encodeUrlPath } from "../config/paths.js";
import { SHELL_CSS } from "../server/shell/css.js";
import { isImpactOnly, isMaterial } from "./materiality.js";
import { comparisonPagePath } from "./paths.js";
import type { ReviewResult, ReviewState, ScreenReview } from "./types.js";

/** Groups listed by the changed-screens navigation, in display order. */
const NAV_GROUPS: readonly { label: string; state: ReviewState }[] = [
  { label: "Changed", state: "changed" },
  { label: "Added", state: "added" },
  { label: "Removed", state: "removed" },
  { label: "Ignored only", state: "ignored-only" },
];

/** Human label for one classification badge. */
export function stateLabel(state: ReviewState): string {
  if (state === "ignored-only") return "Ignored only";
  return state.charAt(0).toUpperCase() + state.slice(1);
}

/** Colored classification badge for one compared screen or viewport. */
export function StatusBadge(props: { state: ReviewState }) {
  return (
    <span className={`mbk-status ${props.state}`}>
      {stateLabel(props.state)}
    </span>
  );
}

/** The artifact-relative compare page a nav row opens for one screen. */
export function screenPagePath(screen: ScreenReview): string | undefined {
  const viewport =
    screen.viewports.find((candidate) => candidate.state !== "unchanged") ??
    screen.viewports[0];
  if (!viewport) return undefined;
  return comparisonPagePath(screen.route, viewport.viewport);
}

function ChangedRow(props: {
  active: boolean;
  rootPrefix: string;
  screen: ScreenReview;
  tone: string;
}) {
  const target = screenPagePath(props.screen);
  const body = (
    <>
      <span aria-hidden="true" className={`mbk-chg-dot ${props.tone}`} />
      <span className="mbk-chg-text">
        <strong>{props.screen.title}</strong>
        <span>{props.screen.route}</span>
      </span>
    </>
  );
  if (!target) {
    return <span className="mbk-chg-row">{body}</span>;
  }
  return (
    <a
      aria-current={props.active ? "page" : undefined}
      className={props.active ? "mbk-chg-row active" : "mbk-chg-row"}
      href={`${props.rootPrefix}${encodeUrlPath(target)}`}
    >
      {body}
    </a>
  );
}

function NavGroup(props: {
  activeRoute?: string | undefined;
  label: string;
  rootPrefix: string;
  screens: readonly ScreenReview[];
  tone: string;
}) {
  if (props.screens.length === 0) return null;
  return (
    <div className="mbk-chg-group">
      <p className="mbk-chg-grouphead">
        <span aria-hidden="true" className={`mbk-chg-dot ${props.tone}`} />
        {props.label}
        <span className="mbk-chg-count">{props.screens.length}</span>
      </p>
      {props.screens.map((screen) => (
        <ChangedRow
          active={screen.route === props.activeRoute}
          key={screen.route}
          rootPrefix={props.rootPrefix}
          screen={screen}
          tone={props.tone}
        />
      ))}
    </div>
  );
}

function SharedImpactCard(props: { result: ReviewResult }) {
  if (props.result.sharedImpact.length === 0) return null;
  return (
    <div className="mbk-chg-shared">
      <strong>Shared impact</strong>
      <p>Unchanged screens may still look different — shared files changed.</p>
      {props.result.sharedImpact.map((item) => (
        <code key={item}>{item}</code>
      ))}
    </div>
  );
}

function IgnoredImpactCard(props: { result: ReviewResult }) {
  if (props.result.ignoredImpact.length === 0) return null;
  return (
    <div className="mbk-chg-shared">
      {props.result.ignoredImpact.map((impact) => (
        <div
          className="mbk-chg-ignored-head"
          key={`${impact.id}-${impact.viewport}`}
        >
          <code>{impact.id}</code>
          <span>Ignored</span>
        </div>
      ))}
      <p>Changes inside these regions were excluded from the comparison.</p>
    </div>
  );
}

function ChangedScreensNav(props: {
  activeRoute?: string | undefined;
  base: string;
  result: ReviewResult;
  rootPrefix: string;
}) {
  const material = props.result.screens.filter(isMaterial);
  const impacted = props.result.screens.filter(isImpactOnly);
  const total = material.length;
  return (
    <nav aria-label="Changed screens" className="mbk-nav">
      <div className="mbk-nav-head">
        Changed screens
        <span className="mbk-nav-total">{total}</span>
      </div>
      <div className="mbk-nav-scroll">
        {total === 0 ? (
          <p className="mbk-chg-more">No screens differ from {props.base}.</p>
        ) : null}
        {NAV_GROUPS.map((group) => (
          <NavGroup
            activeRoute={props.activeRoute}
            key={group.state}
            label={group.label}
            rootPrefix={props.rootPrefix}
            screens={material.filter((screen) => screen.state === group.state)}
            tone={group.state}
          />
        ))}
        <NavGroup
          activeRoute={props.activeRoute}
          label="Impacted"
          rootPrefix={props.rootPrefix}
          screens={impacted}
          tone="impacted"
        />
        <SharedImpactCard result={props.result} />
        <IgnoredImpactCard result={props.result} />
      </div>
    </nav>
  );
}

function TopBar(props: {
  base: string;
  browseHref?: string | undefined;
  rootPrefix: string;
}) {
  const brand = (
    <>
      <span aria-hidden="true" className="mbk-mark">
        ◫
      </span>
      Mokabook
    </>
  );
  return (
    <header className="mbk-topbar">
      {props.browseHref ? (
        <a className="mbk-brand" href={props.browseHref}>
          {brand}
        </a>
      ) : (
        <span className="mbk-brand">{brand}</span>
      )}
      <span className="mbk-basewatch">
        <span aria-hidden="true" className="mbk-basewatch-dot" />
        Comparing this branch with <strong>{props.base}</strong>
      </span>
      {props.browseHref ? (
        <nav aria-label="Mokabook modes" className="mbk-modes">
          <a className="mbk-mode" href={props.browseHref}>
            Browse
          </a>
          <a
            aria-current="page"
            className="mbk-mode active"
            href={`${props.rootPrefix}index.html`}
          >
            Review
          </a>
        </nav>
      ) : null}
    </header>
  );
}

/** Render one complete Review artifact document in the Mokabook shell. */
export function reviewDocument(props: {
  activeRoute?: string | undefined;
  /** When set, the shell links back to Browse and loads live updates. */
  browseHref?: string | undefined;
  children: ReactNode;
  result: ReviewResult;
  rootPrefix: string;
  script?: string | undefined;
  title: string;
}): string {
  const markup = renderToStaticMarkup(
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <title>{props.title}</title>
        <style dangerouslySetInnerHTML={{ __html: SHELL_CSS }} />
      </head>
      <body className="mbk-fs">
        <div className="mbk">
          <TopBar
            base={props.result.baseRef}
            browseHref={props.browseHref}
            rootPrefix={props.rootPrefix}
          />
          <div className="mbk-body">
            <ChangedScreensNav
              activeRoute={props.activeRoute}
              base={props.result.baseRef}
              result={props.result}
              rootPrefix={props.rootPrefix}
            />
            <main className="mbk-main">{props.children}</main>
          </div>
        </div>
        {props.script ? (
          <script dangerouslySetInnerHTML={{ __html: props.script }} />
        ) : null}
        {props.browseHref ? (
          <script src="/__mokabook/client/browser.js" type="module" />
        ) : null}
      </body>
    </html>,
  );
  return `<!doctype html>\n${markup}\n`;
}
