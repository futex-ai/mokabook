import type { ReactNode } from "react";

import { ChevronIcon, FlowIcon } from "./icons.js";

function MetaRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="mbk-meta-row">
      <span className="mbk-meta-k">{label}</span>
      <span className="mbk-meta-v">{children}</span>
    </div>
  );
}

function DetailsBody() {
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
  open?: boolean;
}

/** The collapsible details inspector at the foot of the stage. */
export function DetailsPanel({ open }: DetailsPanelProps) {
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
      {open ? <DetailsBody /> : null}
    </section>
  );
}
