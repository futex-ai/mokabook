import { SiteActions } from "../../../parts/actions.js";

import { FACTS, FEATURES, STEPS } from "./copy.js";

/** The feature row: three bordered cards, each four columns wide. */
export function GridFeatures() {
  return (
    <section className="grid-section grid-features">
      <div className="grid-inner grid-12 grid-section-head">
        <h2>
          Browse, review, edit.
          <br />
          <span className="site-accent">One place for all of it.</span>
        </h2>
        <p>Every branch becomes a catalogue your whole team can open.</p>
      </div>
      <div className="grid-inner grid-12 grid-cards">
        {FEATURES.map((feature) => (
          <article
            className="grid-card"
            id={feature.anchor}
            key={feature.number}
          >
            <p className="grid-card-index">
              <span className="grid-card-number">{feature.number}</span>
              <span className="grid-card-label">{feature.label}</span>
            </p>
            <h3>{feature.title}</h3>
            <p className="grid-card-body">{feature.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/** The row of facts: the product nouns this page uses, defined once. */
export function GridFacts() {
  return (
    <section className="grid-section grid-facts">
      <div className="grid-inner">
        <p className="grid-eyebrow">The words on this page</p>
        <dl className="grid-12 grid-definitions">
          {FACTS.map((fact) => (
            <div className="grid-definition" key={fact.term}>
              <dt>{fact.term}</dt>
              <dd>{fact.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** The open-foundation closing above the three-cell workflow strip. */
export function GridClosing() {
  return (
    <section className="grid-section grid-closing" id="foundation">
      <div className="grid-inner grid-12 grid-closing-head">
        <div className="grid-closing-copy">
          <p className="grid-eyebrow">An open foundation</p>
          <h2>
            Your screens.
            <br />
            <span className="site-accent">Your building blocks.</span>
          </h2>
        </div>
        <div className="grid-closing-body">
          <p>
            Author locally with the open-source Mokly CLI. Keep your screens in
            Git and host the catalogue anywhere. The cloud adds hosting, review
            and the agent; it never owns the source.
          </p>
          <SiteActions />
        </div>
      </div>
      <div className="grid-inner">
        <ol className="grid-12 grid-steps">
          {STEPS.map((step) => (
            <li className="grid-step" key={step.number}>
              <span className="grid-step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
