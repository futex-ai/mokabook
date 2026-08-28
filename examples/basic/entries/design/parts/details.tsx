import type { ReactNode } from "react";

import { ChevronIcon, FlowIcon, TagIcon } from "./icons.js";

/** Tags declared by the fixture screen the inspector describes. */
const SCREEN_TAGS = ["forms", "onboarding"];

function MetaRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="mbk-meta-row">
      <span className="mbk-meta-k">{label}</span>
      <span className="mbk-meta-v">{children}</span>
    </div>
  );
}

function TagChips({ activeTag }: { activeTag?: string | undefined }) {
  return (
    <span className="mbk-chips">
      {SCREEN_TAGS.map((tag) => (
        <span
          key={tag}
          className={tag === activeTag ? "mbk-chip tag active" : "mbk-chip tag"}
        >
          <TagIcon size={11} />
          {tag}
        </span>
      ))}
    </span>
  );
}

function DetailsBody({ activeTag }: { activeTag?: string | undefined }) {
  return (
    <div className="mbk-details-body">
      <div>
        <p className="mbk-details-desc">
          A linked landing screen for the neutral fixture.
        </p>
        <p className="mbk-details-rationale">
          <span className="k">Why this screen — </span>
          The landing screen anchors the example catalogue, so every
          cross-screen link starts from a known state.
        </p>
      </div>
      <div className="mbk-meta">
        <MetaRow label="Source">
          <code className="mbk-code">entries/catalogue.mockup.tsx</code>
        </MetaRow>
        <MetaRow label="Generated">
          <code className="mbk-code">screens/welcome.html</code>
        </MetaRow>
        <MetaRow label="Schemes">light, dark</MetaRow>
        <MetaRow label="Tags">
          <TagChips activeTag={activeTag} />
        </MetaRow>
        <MetaRow label="Related docs">
          <span className="mbk-meta-link">Example notes</span>
        </MetaRow>
        <MetaRow label="Used by">
          <span className="mbk-chips">
            <span className="mbk-chip flow">
              <FlowIcon size={11} />
              Example tour
            </span>
          </span>
        </MetaRow>
      </div>
    </div>
  );
}

interface DetailsPanelProps {
  /** Tag drawn as the selected chip because it is the current search term. */
  activeTag?: string | undefined;
  open?: boolean;
}

/** The collapsible details inspector at the foot of the stage. */
export function DetailsPanel({ activeTag, open }: DetailsPanelProps) {
  return (
    <section className="mbk-details">
      <div className="mbk-details-bar">
        <span className={open ? "chev open" : "chev"} aria-hidden="true">
          <ChevronIcon size={12} />
        </span>
        Details
        <span className="mbk-details-hint">
          {open
            ? "Description, rationale, source, related docs, and use cases"
            : "Show context for this screen"}
        </span>
      </div>
      {open ? <DetailsBody activeTag={activeTag} /> : null}
    </section>
  );
}
