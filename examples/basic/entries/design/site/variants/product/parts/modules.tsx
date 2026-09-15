/**
 * The three product modules on the home. Each pairs the approved feature
 * copy with a small framed detail of the catalogue shell — the Changes
 * filter, a comment pinned to a screen, and the agent rail beside a screen —
 * drawn as token-styled shapes carrying only real product labels.
 */

import type { ReactNode } from "react";

import { SiteActions } from "../../../parts/actions.js";

import { SendGlyph } from "./glyphs.js";

function BrowseDetail() {
  return (
    <div className="pd-detail">
      <div className="pd-filter pd-filter--detail">
        <span className="pd-filter-option pd-filter-option--current">All</span>
        <span className="pd-filter-option">
          Changes<span className="pd-filter-count">3</span>
        </span>
      </div>
      <div className="pd-detail-rows">
        {["Welcome", "Details", "Action"].map((label) => (
          <span className="pd-detail-row" key={label}>
            <span aria-hidden="true" className="pd-detail-dot" />
            {label}
            <span className="pd-detail-chip">Changed</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ReviewDetail() {
  return (
    <div className="pd-detail pd-detail--split">
      <div className="pd-detail-screen">
        <span
          aria-hidden="true"
          className="pd-detail-bar pd-detail-bar--wide"
        />
        <span aria-hidden="true" className="pd-detail-block" />
        <span aria-hidden="true" className="pd-detail-bar" />
        <span className="pd-pin">1</span>
      </div>
      <div className="pd-comment">
        <p className="pd-comment-head">
          <span className="pd-pin pd-pin--inline">1</span>Comment
        </p>
        <span
          aria-hidden="true"
          className="pd-detail-bar pd-detail-bar--wide"
        />
        <span aria-hidden="true" className="pd-detail-bar" />
        <span className="pd-comment-approve">Approve</span>
      </div>
    </div>
  );
}

function EditDetail() {
  return (
    <div className="pd-detail pd-detail--split">
      <div className="pd-detail-screen">
        <span
          aria-hidden="true"
          className="pd-detail-bar pd-detail-bar--wide"
        />
        <span aria-hidden="true" className="pd-detail-block" />
        <span aria-hidden="true" className="pd-detail-bar" />
      </div>
      <div className="pd-agent">
        <p className="pd-comment-head">Agent session</p>
        <span aria-hidden="true" className="pd-agent-turn" />
        <span
          aria-hidden="true"
          className="pd-agent-turn pd-agent-turn--reply"
        />
        <span className="pd-agent-input">
          Describe the change
          <span aria-hidden="true" className="pd-agent-send">
            <SendGlyph />
          </span>
        </span>
      </div>
    </div>
  );
}

interface ProductModule {
  body: string;
  detail: ReactNode;
  id: string;
  label: string;
  name: string;
  number: string;
  title: string;
}

const MODULES: readonly ProductModule[] = [
  {
    body: "Each branch and pull request publishes a catalogue built from your real components. Changes shows what moved, and the check on the pull request counts it.",
    detail: <BrowseDetail />,
    id: "browse",
    label: "BROWSE",
    name: "Browse",
    number: "01",
    title: "See every branch as screens.",
  },
  {
    body: "Pin a comment to the component it is about and approve when it is right. The conversation stays in step with the pull request review.",
    detail: <ReviewDetail />,
    id: "review",
    label: "REVIEW",
    name: "Review",
    number: "02",
    title: "Comment on the screen itself.",
  },
  {
    body: "An agent edits the mockup source in a live branch session. Click an element to bring it into the conversation, then publish back to the branch.",
    detail: <EditDetail />,
    id: "edit",
    label: "EDIT",
    name: "Edit",
    number: "03",
    title: "Ask for the change beside the screen.",
  },
];

/** Section links to the three modules and the closing, under the header. */
export const MODULE_LINKS: readonly { id: string; label: string }[] = [
  ...MODULES.map((module) => ({ id: module.id, label: module.name })),
  { id: "foundation", label: "Open foundation" },
];

/** Browse, review and edit, each with its framed detail of the shell. */
export function ProductModules() {
  return (
    <section className="pd-modules">
      <div className="pd-section-head">
        <h2>
          Browse, review, edit.
          <br />
          <span className="site-accent">One place for all of it.</span>
        </h2>
        <p>Every branch becomes a catalogue your whole team can open.</p>
      </div>
      <div className="pd-module-grid">
        {MODULES.map((module) => (
          <article className="pd-module" id={module.id} key={module.id}>
            <div className="pd-module-detail">{module.detail}</div>
            <p className="pd-module-eyebrow">
              <span className="pd-module-number">{module.number}</span>
              <span className="site-feature-label">{module.label}</span>
            </p>
            <h3>{module.title}</h3>
            <p className="pd-module-body">{module.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

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

/** The open-foundation closing with the repeated actions and three steps. */
export function ProductClosing() {
  return (
    <section className="pd-closing" id="foundation">
      <div className="pd-closing-panel">
        <div className="pd-closing-copy">
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
        <ol className="pd-steps">
          {STEPS.map((step, index) => (
            <li className="pd-step" key={step.title}>
              <span className="pd-step-number">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
