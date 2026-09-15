import { SiteActions } from "./actions.js";

const FEATURES = [
  {
    body: "Each branch and pull request publishes a catalogue built from your real components. Changes shows what moved, and the check on the pull request counts it.",
    label: "BROWSE",
    number: "01",
    title: "See every branch as screens.",
  },
  {
    body: "Pin a comment to the component it is about and approve when it is right. The conversation stays in step with the pull request review.",
    label: "REVIEW",
    number: "02",
    title: "Comment on the screen itself.",
  },
  {
    body: "An agent edits the mockup source in a live branch session. Click an element to bring it into the conversation, then publish back to the branch.",
    label: "EDIT",
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

/** Three numbered features: browse, review and edit. */
export function SiteFeatures() {
  return (
    <section className="site-section site-features">
      <div className="site-section-title">
        <h2>
          Browse, review, edit.
          <br />
          <span className="site-accent">One place for all of it.</span>
        </h2>
        <p>Every branch becomes a catalogue your whole team can open.</p>
      </div>
      <div className="site-feature-grid">
        {FEATURES.map((feature) => (
          <article className="site-feature" key={feature.number}>
            <p className="site-feature-eyebrow">
              <span className="site-feature-number">{feature.number}</span>
              <span className="site-feature-label">{feature.label}</span>
            </p>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/** The open-foundation closing with the repeated actions and three steps. */
export function SiteClosing() {
  return (
    <section className="site-section">
      <div className="site-closing">
        <div className="site-closing-copy">
          <p className="site-eyebrow">An open foundation</p>
          <h2>
            Your screens.
            <br />
            <span className="site-accent">Your building blocks.</span>
          </h2>
          <p>
            Author locally with the open-source Mokly CLI. Keep your screens in
            Git and host the catalogue anywhere. The cloud adds hosting, review
            and the agent; it never owns the source.
          </p>
          <SiteActions />
        </div>
        <ol className="site-steps">
          {STEPS.map((step, index) => (
            <li className="site-step" key={step.title}>
              <span className="site-step-number">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
