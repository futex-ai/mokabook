import { SiteActions } from "../../../parts/actions.js";

/** The three numbered features, set as a ruled table of contents. */
export const EDITORIAL_FEATURES = [
  {
    anchor: "browse",
    body: "Each branch and pull request publishes a catalogue built from your real components. Changes shows what moved, and the check on the pull request counts it.",
    label: "BROWSE",
    name: "Browse",
    number: "01",
    title: "See every branch as screens.",
  },
  {
    anchor: "review",
    body: "Pin a comment to the component it is about and approve when it is right. The conversation stays in step with the pull request review.",
    label: "REVIEW",
    name: "Review",
    number: "02",
    title: "Comment on the screen itself.",
  },
  {
    anchor: "edit",
    body: "An agent edits the mockup source in a live branch session. Click an element to bring it into the conversation, then publish back to the branch.",
    label: "EDIT",
    name: "Edit",
    number: "03",
    title: "Ask for the change beside the screen.",
  },
] as const;

const STEPS = [
  {
    body: "Author with React and your shared components.",
    title: "Shape the next screen.",
  },
  {
    body: "Open the pull request check to review the screens that changed.",
    title: "Publish the branch.",
  },
  {
    body: "Keep comments and approvals with the pull request.",
    title: "Build from a shared decision.",
  },
] as const;

/** Browse, review and edit as numbered entries on a ruled contents list. */
export function EditorialContents() {
  return (
    <section className="ed-section ed-contents">
      <div className="ed-measure">
        <div className="ed-section-head">
          <h2>
            Browse, review, edit.
            <br />
            <span className="site-accent">One place for all of it.</span>
          </h2>
          <p>Every branch becomes a catalogue your whole team can open.</p>
        </div>
        <ol className="ed-toc">
          {EDITORIAL_FEATURES.map((feature) => (
            <li className="ed-toc-row" id={feature.anchor} key={feature.number}>
              <span className="ed-toc-index">
                <span className="ed-toc-number">{feature.number}</span>
                <span className="ed-rubric">{feature.label}</span>
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** The open-foundation closing: a ruled box with the three-step workflow. */
export function EditorialClosing() {
  return (
    <section className="ed-section ed-closing-section" id="foundation">
      <div className="ed-measure">
        <div className="ed-closing">
          <div className="ed-closing-copy">
            <p className="ed-rubric">An open foundation</p>
            <h2>
              Your screens.
              <br />
              <span className="site-accent">Your building blocks.</span>
            </h2>
            <p>
              Author locally with the open-source Mokly CLI. Keep your screens
              in Git and host the catalogue anywhere. The cloud adds hosting,
              review and the agent; it never owns the source.
            </p>
            <SiteActions />
          </div>
          <ol className="ed-steps">
            {STEPS.map((step, index) => (
              <li className="ed-step" key={step.title}>
                <span className="ed-step-number">0{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
