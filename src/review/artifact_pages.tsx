/** The Review artifact's index and per-view compare pages, rendered in
 * the Mokabook shell design: a changed-screens navigation column beside a
 * main view with the compare head, the mode, viewport, and color-scheme
 * segments, panes, and evidence cards. */

import path from "node:path";

import { encodeUrlPath } from "../config/paths.js";
import { reviewDocument, stateLabel, StatusBadge } from "./artifact_shell.js";
import { isImpactOnly, isMaterial } from "./materiality.js";
import { comparisonPagePath } from "./paths.js";
import type {
  ReviewResult,
  ReviewState,
  ScreenReview,
  ViewReview,
} from "./types.js";

/** Presentation hooks for Review artifacts rendered behind a server. */
export interface ReviewRenderOptions {
  /** When set, artifact pages link back to the Browse shell at this href. */
  browseHref?: string;
}

const COMPARE_MODES = [
  ["side", "Side by side"],
  ["overlay", "Overlay"],
  ["difference", "Difference"],
] as const;

const COLOR_SCHEMES = [
  ["light", "Light"],
  ["dark", "Dark"],
] as const;

const MODE_SCRIPT =
  `for(const button of document.querySelectorAll("[data-mode]"))` +
  `button.addEventListener("click",()=>{` +
  `document.querySelector(".mb-panes").dataset.compareMode=button.dataset.mode;` +
  `for(const other of document.querySelectorAll("[data-mode]"))` +
  `other.setAttribute("aria-pressed",other===button?"true":"false")})`;

/** Render the Review summary page inside the shell. */
export function indexPage(
  result: ReviewResult,
  options: ReviewRenderOptions = {},
): string {
  const material = result.screens.filter(isMaterial);
  const impacted = result.screens.filter(isImpactOnly);
  const unchanged = result.screens.length - material.length;
  const states: readonly ReviewState[] = [
    "changed",
    "added",
    "removed",
    "ignored-only",
  ];
  const counts = [
    ...states.map(
      (state) =>
        `${result.screens.filter((screen) => screen.state === state).length} ` +
        stateLabel(state).toLowerCase(),
    ),
    `${impacted.length} impacted`,
  ].join(" · ");
  const empty = material.length === 0;
  return reviewDocument({
    browseHref: options.browseHref,
    children: (
      <div className="mbk-empty">
        <h2>{empty ? "No visual changes" : "Mokabook review"}</h2>
        <p>
          {empty
            ? `This branch matches ${result.baseRef} for every screen in the catalogue.`
            : `${counts} against ${result.baseRef}. Choose a screen from the list to compare it.`}
        </p>
        <p className="mbk-empty-note">
          {unchanged} screen{unchanged === 1 ? "" : "s"} unchanged
        </p>
        {options.browseHref ? (
          <a className="mbk-empty-link" href="index.html?refresh=1">
            Recompute the comparison
          </a>
        ) : null}
      </div>
    ),
    result,
    rootPrefix: "",
    title: "Mokabook Review",
  });
}

/** Render one per-view comparison page inside the shell. */
export function comparePage(
  result: ReviewResult,
  screen: ScreenReview,
  view: ViewReview,
  options: ReviewRenderOptions = {},
): string {
  const pagePath = comparisonPagePath(
    screen.route,
    view.viewport,
    view.colorScheme,
  );
  return reviewDocument({
    activeRoute: screen.route,
    browseHref: options.browseHref,
    children: (
      <>
        <div className="mbk-screen-head">
          <div className="mbk-screen-head-copy">
            <div className="mbk-title-row">
              <h2>{screen.title}</h2>
              <StatusBadge state={view.state} />
            </div>
            <code className="mbk-code">{screen.route}</code>
          </div>
        </div>
        <div className="mbk-cmp-toolbar">
          <span aria-label="Comparison mode" className="mbk-seg" role="group">
            {COMPARE_MODES.map(([mode, label]) => (
              <button
                aria-pressed={mode === "side" ? "true" : "false"}
                data-mode={mode}
                key={mode}
                type="button"
              >
                {label}
              </button>
            ))}
          </span>
          <ViewportSegment pagePath={pagePath} screen={screen} view={view} />
          <SchemeSegment pagePath={pagePath} screen={screen} view={view} />
        </div>
        <div className="mbk-rvw-stage">
          <div className="mb-panes" data-compare-mode="side">
            <Pane
              artifactPath={view.beforePath}
              label={`Before — ${result.baseRef}`}
              missingMessage={`This screen does not exist on ${result.baseRef}.`}
              pagePath={pagePath}
              side="before"
              tone={view.state === "removed" ? "removed" : undefined}
            />
            <Pane
              artifactPath={view.afterPath}
              label="After — this branch"
              missingMessage="This screen does not exist on this branch."
              pagePath={pagePath}
              side="after"
              tone={view.state === "added" ? "added" : undefined}
            />
          </div>
          <ImpactCard sharedImpact={screen.sharedImpact} />
          <IgnoredCard ignoredIds={view.ignoredIds} />
        </div>
        <div className="mbk-review-summary">
          <StatusBadge state={view.state} />
          <span className="mbk-review-facts">
            {viewportLabel(view.viewport)} · {stateLabel(view.state)}
          </span>
        </div>
      </>
    ),
    result,
    rootPrefix: "../../../",
    navigation: "shared",
    script: MODE_SCRIPT,
    title:
      view.colorScheme === "light"
        ? `${screen.title} · ${view.viewport}`
        : `${screen.title} · ${view.viewport} · ${view.colorScheme}`,
  });
}

function ViewportSegment(props: {
  pagePath: string;
  screen: ScreenReview;
  view: ViewReview;
}) {
  const siblings = props.screen.views.filter(
    (candidate) => candidate.colorScheme === props.view.colorScheme,
  );
  return (
    <span aria-label="Viewport" className="mbk-seg" role="group">
      {siblings.map((candidate) => (
        <ViewOption
          active={candidate.viewport === props.view.viewport}
          colorScheme={props.view.colorScheme}
          key={candidate.viewport}
          label={viewportLabel(candidate.viewport)}
          pagePath={props.pagePath}
          route={props.screen.route}
          viewport={candidate.viewport}
        />
      ))}
    </span>
  );
}

/** Scheme choice for screens compared in both schemes; absent for light-only. */
function SchemeSegment(props: {
  pagePath: string;
  screen: ScreenReview;
  view: ViewReview;
}) {
  const siblings = COLOR_SCHEMES.filter(([colorScheme]) =>
    props.screen.views.some(
      (candidate) =>
        candidate.viewport === props.view.viewport &&
        candidate.colorScheme === colorScheme,
    ),
  );
  if (siblings.length < 2) return null;
  return (
    <span aria-label="Color scheme" className="mbk-seg" role="group">
      {siblings.map(([colorScheme, label]) => (
        <ViewOption
          active={colorScheme === props.view.colorScheme}
          colorScheme={colorScheme}
          key={colorScheme}
          label={label}
          pagePath={props.pagePath}
          route={props.screen.route}
          viewport={props.view.viewport}
        />
      ))}
    </span>
  );
}

function ViewOption(props: {
  active: boolean;
  colorScheme: ViewReview["colorScheme"];
  label: string;
  pagePath: string;
  route: string;
  viewport: ViewReview["viewport"];
}) {
  if (props.active) {
    return (
      <span aria-current="page" className="active">
        {props.label}
      </span>
    );
  }
  const target = relativeLink(
    props.pagePath,
    comparisonPagePath(props.route, props.viewport, props.colorScheme),
  );
  return <a href={target}>{props.label}</a>;
}

function viewportLabel(viewport: ViewReview["viewport"]): string {
  return viewport === "mobile" ? "Mobile" : "Desktop";
}

function Pane(props: {
  artifactPath: string | undefined;
  label: string;
  missingMessage: string;
  pagePath: string;
  side: "after" | "before";
  tone?: "added" | "removed" | undefined;
}) {
  if (!props.artifactPath) {
    return (
      <div className={`mb-pane mb-pane--${props.side}`}>
        <p className="mb-pane-label">{props.label}</p>
        <div className="mb-pane-missing">{props.missingMessage}</div>
      </div>
    );
  }
  const toneClass = props.tone ? ` mb-pane-doc--${props.tone}` : "";
  return (
    <div className={`mb-pane mb-pane--${props.side}`}>
      <p className="mb-pane-label">{props.label}</p>
      <div className={`mb-pane-doc${toneClass}`}>
        <iframe
          className="mb-frag"
          sandbox=""
          src={relativeLink(props.pagePath, props.artifactPath)}
          title={props.label}
        />
      </div>
    </div>
  );
}

function ImpactCard(props: { sharedImpact: readonly string[] }) {
  if (props.sharedImpact.length === 0) return null;
  return (
    <section className="mb-impact-card">
      <h3>Impact evidence</h3>
      {props.sharedImpact.map((item) => (
        <span className="mbk-code" key={item}>
          {item}{" "}
        </span>
      ))}
      <p>These changed inputs may affect this screen.</p>
    </section>
  );
}

function IgnoredCard(props: { ignoredIds: readonly string[] }) {
  if (props.ignoredIds.length === 0) return null;
  return (
    <section className="mb-impact-card">
      <h3>Ignored regions</h3>
      <p>
        {props.ignoredIds.map((id) => (
          <span className="mbk-code" key={id}>
            {id}{" "}
          </span>
        ))}
        <span className="mbk-status ignored-only">Ignored</span>
      </p>
      <p>Differences inside these regions were excluded from the comparison.</p>
    </section>
  );
}

function relativeLink(from: string, to: string): string {
  const relative = path.posix.relative(path.posix.dirname(from), to);
  const encoded = encodeUrlPath(relative);
  return encoded.startsWith(".") ? encoded : `./${encoded}`;
}
