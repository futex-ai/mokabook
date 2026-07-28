import { renderToStaticMarkup } from "react-dom/server";

import { encodeUrlPath } from "../config/paths.js";
import { isImpactOnly, isMaterial } from "./materiality.js";
import { comparisonPagePath } from "./paths.js";
import type { ReviewResult, ReviewState, ScreenReview } from "./types.js";

/** Artifact-root script that hydrates shared compare-page navigation. */
export const REVIEW_NAVIGATION_SCRIPT = "review-navigation.js";

const NAV_GROUPS: readonly { label: string; state: ReviewState }[] = [
  { label: "Changed", state: "changed" },
  { label: "Added", state: "added" },
  { label: "Removed", state: "removed" },
  { label: "Ignored only", state: "ignored-only" },
];

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
      data-mokabook-review-route={props.screen.route}
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

/** Complete inline navigation used by the Review index and shared payload. */
export function ChangedScreensNav(props: {
  activeRoute?: string | undefined;
  base: string;
  result: ReviewResult;
  rootPrefix: string;
}) {
  const material = props.result.screens.filter(isMaterial);
  const impacted = props.result.screens.filter(isImpactOnly);
  const total = material.length;
  return (
    <nav aria-label="Changed screens" className="mbk-nav" id="mb-review-nav">
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

/** Small no-JavaScript fallback replaced by the shared navigation payload. */
export function DeferredChangedScreensNav(props: {
  activeRoute?: string | undefined;
  result: ReviewResult;
  rootPrefix: string;
}) {
  const total = props.result.screens.filter(isMaterial).length;
  return (
    <nav
      aria-label="Changed screens"
      className="mbk-nav"
      data-mokabook-active-route={props.activeRoute}
      data-mokabook-review-navigation=""
      id="mb-review-nav"
    >
      <div className="mbk-nav-head">
        Changed screens
        <span className="mbk-nav-total">{total}</span>
      </div>
      <div className="mbk-nav-scroll">
        <p className="mbk-chg-more">
          <a href={`${props.rootPrefix}index.html`}>Open Review index</a>
        </p>
      </div>
    </nav>
  );
}

/** Render the one navigation payload shared by every comparison page. */
export function reviewNavigationScript(result: ReviewResult): string {
  const markup = renderToStaticMarkup(
    <ChangedScreensNav
      base={result.baseRef}
      result={result}
      rootPrefix="../../../"
    />,
  );
  const serialized = JSON.stringify(markup)
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
  return (
    `(()=>{const p=document.querySelector("[data-mokabook-review-navigation]");` +
    `if(!p)return;const a=p.dataset.mokabookActiveRoute;p.outerHTML=${serialized};` +
    `if(!a)return;for(const r of document.querySelectorAll(` +
    `"[data-mokabook-review-route]"))if(r.dataset.mokabookReviewRoute===a){` +
    `r.classList.add("active");r.setAttribute("aria-current","page");break}})()\n`
  );
}
