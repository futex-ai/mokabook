import type { ReactNode } from "react";

import type { Viewport } from "@mokly/mokly";

import { SiteStage } from "../../../parts/stage.js";

import { Band, BandsActions } from "./chrome.js";
import { BrowseFigure, EditFigure, ReviewFigure } from "./figures.js";

const NOUNS = [
  { href: "#browse", label: "Browse", number: "01" },
  { href: "#review", label: "Review", number: "02" },
  { href: "#edit", label: "Edit", number: "03" },
] as const;

const FEATURES = [
  {
    body: "Each branch and pull request publishes a catalogue built from your real components. Changes shows what moved, and the check on the pull request counts it.",
    figure: <BrowseFigure />,
    id: "browse",
    label: "BROWSE",
    number: "01",
    title: "See every branch as screens.",
    tone: "folio",
  },
  {
    body: "Pin a comment to the component it is about and approve when it is right. The conversation stays in step with the pull request review.",
    figure: <ReviewFigure />,
    id: "review",
    label: "REVIEW",
    number: "02",
    title: "Comment on the screen itself.",
    tone: "muted",
  },
  {
    body: "An agent edits the mockup source in a live branch session. Click an element to bring it into the conversation, then publish back to the branch.",
    figure: <EditFigure />,
    id: "edit",
    label: "EDIT",
    number: "03",
    title: "Ask for the change beside the screen.",
    tone: "folio",
  },
] as const;

const STEPS = [
  {
    body: "Author with React and your shared components.",
    number: "01",
    title: "Shape the next screen.",
  },
  {
    body: "Open the pull request check to review the screens that changed.",
    number: "02",
    title: "Publish the branch.",
  },
  {
    body: "Keep comments and approvals with the pull request.",
    number: "03",
    title: "Build from a shared decision.",
  },
] as const;

/** The opening band: the promise on the left, the catalogue stage on the right. */
export function BandsHero({ viewport }: { viewport: Viewport }) {
  return (
    <Band className="bands-hero-band" inner="bands-hero" tone="surface">
      <div className="bands-hero-copy">
        <p className="bands-eyebrow">A design tool for teams that ship</p>
        <h1 className="bands-hero-title">
          Design in your repository.
          <br />
          <span className="site-accent">Decide in the pull request.</span>
        </h1>
        <p className="bands-hero-lead">
          Your mockups are React components in Git. Browse every branch as
          screens, review them with your team, and edit with an agent beside the
          screen.
        </p>
        <BandsActions />
        <p className="bands-hero-note">Light and dark. Mobile and desktop.</p>
      </div>
      <div className="bands-hero-stage">
        <SiteStage viewport={viewport} />
      </div>
    </Band>
  );
}

/** The narrow band under the hero: the three phases as in-page navigation. */
export function BandsJump() {
  return (
    <nav
      aria-label="Product sections"
      className="bands-band bands-band--muted bands-jump-band"
    >
      <div className="bands-inner bands-jump">
        {NOUNS.map((noun) => (
          <a className="bands-jump-item" href={noun.href} key={noun.label}>
            <span className="bands-jump-number">{noun.number}</span>
            <span className="bands-jump-label">{noun.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

function FeatureIntro() {
  return (
    <div className="bands-section-head">
      <h2 className="bands-section-title">
        Browse, review, edit.
        <br />
        <span className="site-accent">One place for all of it.</span>
      </h2>
      <p className="bands-section-lead">
        Every branch becomes a catalogue your whole team can open.
      </p>
    </div>
  );
}

function FeatureBand({
  feature,
  flip,
  intro,
}: {
  feature: (typeof FEATURES)[number];
  flip: boolean;
  intro?: ReactNode;
}) {
  return (
    <Band
      className="bands-feature-band"
      id={feature.id}
      inner="bands-feature-inner"
      tone={feature.tone}
    >
      {intro}
      <div
        className={flip ? "bands-feature bands-feature--flip" : "bands-feature"}
      >
        <div className="bands-feature-copy">
          <p className="bands-feature-eyebrow">
            <span className="bands-feature-number">{feature.number}</span>
            <span className="bands-feature-label">{feature.label}</span>
          </p>
          <h3 className="bands-feature-title">{feature.title}</h3>
          <p className="bands-feature-body">{feature.body}</p>
        </div>
        <div className="bands-feature-figure">{feature.figure}</div>
      </div>
    </Band>
  );
}

/** One band per phase, alternating surface and side. */
export function BandsFeatures() {
  return (
    <>
      {FEATURES.map((feature, index) => (
        <FeatureBand
          feature={feature}
          flip={index === 1}
          key={feature.id}
          {...(index === 0 ? { intro: <FeatureIntro /> } : {})}
        />
      ))}
    </>
  );
}

/** The closing band: the open foundation over a horizontal stepper. */
export function BandsClosing() {
  return (
    <Band className="bands-closing-band" inner="bands-closing" tone="muted">
      <div className="bands-closing-head">
        <div className="bands-closing-title">
          <p className="bands-eyebrow">An open foundation</p>
          <h2 className="bands-section-title">
            Your screens.
            <br />
            <span className="site-accent">Your building blocks.</span>
          </h2>
        </div>
        <div className="bands-closing-copy">
          <p>
            Author locally with the open-source Mokly CLI. Keep your screens in
            Git and host the catalogue anywhere. The cloud adds hosting, review
            and the agent; it never owns the source.
          </p>
          <BandsActions />
        </div>
      </div>
      <ol className="bands-stepper">
        {STEPS.map((step) => (
          <li className="bands-step" key={step.number}>
            <span aria-hidden="true" className="bands-step-dot" />
            <span className="bands-step-number">{step.number}</span>
            <h3 className="bands-step-title">{step.title}</h3>
            <p className="bands-step-body">{step.body}</p>
          </li>
        ))}
      </ol>
    </Band>
  );
}
