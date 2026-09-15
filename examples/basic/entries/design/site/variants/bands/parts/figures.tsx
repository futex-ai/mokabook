/**
 * Framed illustrations for the three feature bands. Each one depicts a phase
 * of the product with the labels the catalogue and the cloud already use, and
 * names the example Welcome screen the hero stage renders.
 */

/** Changes between a branch and its base, screen by screen. */
export function BrowseFigure() {
  return (
    <figure className="bands-figure">
      <div className="bands-figure-head">
        <span className="bands-figure-title">Changes</span>
        <span className="site-badge site-badge--neutral">2 screens</span>
      </div>
      <div className="bands-figure-body">
        <div className="bands-change">
          <span className="bands-change-name">Welcome</span>
          <span className="bands-change-state">Updated</span>
        </div>
        <div className="bands-change">
          <span className="bands-change-name">Details</span>
          <span className="bands-change-state">Added</span>
        </div>
      </div>
      <div className="bands-figure-foot">
        <span className="bands-tag">Mobile</span>
        <span className="bands-tag">Desktop</span>
        <span className="bands-tag">Light</span>
        <span className="bands-tag">Dark</span>
      </div>
    </figure>
  );
}

/** A comment pinned to the component it is about, and its approval. */
export function ReviewFigure() {
  return (
    <figure className="bands-figure">
      <div className="bands-figure-head">
        <span className="bands-figure-title">Welcome</span>
        <span className="site-badge site-badge--neutral">Pull request #71</span>
      </div>
      <div className="bands-figure-body">
        <div className="bands-pin">
          <span aria-hidden="true" className="bands-pin-marker">
            1
          </span>
          <span className="bands-pin-target">View details</span>
        </div>
        <div className="bands-comment">
          <p className="bands-comment-text">
            Use the shared button component here.
          </p>
          <p className="bands-comment-foot">
            <span className="bands-chip">Reply</span>
            <span className="bands-chip bands-chip--accent">Approve</span>
          </p>
        </div>
      </div>
    </figure>
  );
}

/** An agent editing the mockup source in a live branch session. */
export function EditFigure() {
  return (
    <figure className="bands-figure">
      <div className="bands-figure-head">
        <span className="bands-figure-title">Agent session</span>
        <span className="site-badge site-badge--neutral">Welcome</span>
      </div>
      <div className="bands-figure-body">
        <p className="bands-message">
          Make the primary action full width on mobile.
        </p>
        <p className="bands-message bands-message--agent">
          Edited <code>catalogue.mockup.tsx</code>
        </p>
      </div>
      <div className="bands-figure-foot">
        <span className="bands-chip bands-chip--accent">Publish to branch</span>
      </div>
    </figure>
  );
}
