/**
 * The framed catalogue stage beside the hero. The site renders this repository's
 * own example catalogue here at build time; the mockup depicts the example
 * Welcome screen and the pull request that published it.
 */

/** The merged pull request depicted in the stage head. */
export const STAGE_PULL_REQUEST = "Pull request #71";

/** The example screen named in the stage foot. */
export const STAGE_SCREEN = "Welcome";

function StageScreen({ viewport }: { viewport: "mobile" | "desktop" }) {
  const desktop = viewport === "desktop";
  return (
    <div className={desktop ? "site-shot" : "site-shot site-shot--phone"}>
      <div className="site-shot-bar">
        {desktop ? (
          <span className="site-shot-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        ) : null}
        <span className="site-shot-address">example.test/welcome</span>
      </div>
      <div className="site-shot-body">
        <span className="site-shot-nav">
          {desktop ? "Example navigation" : "Menu"}
        </span>
        <span className="site-shot-head">
          <span className="site-shot-title">Welcome to Mokly</span>
          <span className="site-badge site-badge--neutral">Example</span>
        </span>
        <span className="site-shot-field">Name this workspace</span>
        <span className="site-shot-button">View details</span>
        <span className="site-shot-link">Open the details screen</span>
        <span className="site-shot-panel">
          <span className="site-shot-panel-title">Workspace actions</span>
          <span>Explore the catalogue.</span>
        </span>
      </div>
    </div>
  );
}

/** Quiet framed panel: pull request head, screen body and screen name. */
export function SiteStage({ viewport }: { viewport: "mobile" | "desktop" }) {
  return (
    <div className="site-stage">
      <div className="site-stage-head">
        <span>{STAGE_PULL_REQUEST}</span>
        <span className="site-badge site-badge--success">
          <span aria-hidden="true" className="site-badge-dot" />
          Ready for review
        </span>
      </div>
      <div className="site-stage-body">
        <StageScreen viewport={viewport} />
      </div>
      <div className="site-stage-foot">{STAGE_SCREEN}</div>
    </div>
  );
}
