// The Mokabook shell scaffold shared by every Review artifact page: the top
// bar with brand, base indicator, and Browse/Review modes, plus the
// changed-screens navigation column the design mockups specify. Compare pages
// live three directories below the artifact root, so every shell link is
// prefixed with the page's relative path back to that root.

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SHELL_CSS } from "../server/shell/css.js";
import {
  ChangedScreensNav,
  DeferredChangedScreensNav,
  REVIEW_NAVIGATION_SCRIPT,
} from "./artifact_navigation.js";
import type { ReviewResult, ReviewState } from "./types.js";

const DRAWER_SCRIPT =
  `(()=>{const shell=document.querySelector("[data-mokabook-review-shell]"),` +
  `button=document.querySelector("[data-mokabook-menu]");` +
  `if(!shell||!button)return;button.addEventListener("click",()=>{` +
  `const open=shell.dataset.drawer!=="open";` +
  `shell.dataset.drawer=open?"open":"closed";` +
  `button.setAttribute("aria-expanded",String(open))})})()`;

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
      <button
        aria-controls="mb-review-nav"
        aria-expanded="false"
        aria-label="Open changed screens navigation"
        className="mbk-menu"
        data-mokabook-menu=""
        type="button"
      >
        <span aria-hidden="true">☰</span>
      </button>
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
      <nav aria-label="Mokabook modes" className="mbk-modes">
        {props.browseHref ? (
          <a className="mbk-mode" href={props.browseHref}>
            Browse
          </a>
        ) : null}
        <a
          aria-current="page"
          className="mbk-mode active"
          href={`${props.rootPrefix}index.html`}
        >
          Review
        </a>
      </nav>
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
  navigation?: "inline" | "shared" | undefined;
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
        <div className="mbk" data-drawer="closed" data-mokabook-review-shell="">
          <TopBar
            base={props.result.baseRef}
            browseHref={props.browseHref}
            rootPrefix={props.rootPrefix}
          />
          <div className="mbk-body">
            {props.navigation === "shared" ? (
              <DeferredChangedScreensNav
                activeRoute={props.activeRoute}
                result={props.result}
                rootPrefix={props.rootPrefix}
              />
            ) : (
              <ChangedScreensNav
                activeRoute={props.activeRoute}
                base={props.result.baseRef}
                result={props.result}
                rootPrefix={props.rootPrefix}
              />
            )}
            <main className="mbk-main">{props.children}</main>
          </div>
        </div>
        {props.navigation === "shared" ? (
          <script src={`${props.rootPrefix}${REVIEW_NAVIGATION_SCRIPT}`} />
        ) : null}
        <script dangerouslySetInnerHTML={{ __html: DRAWER_SCRIPT }} />
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
