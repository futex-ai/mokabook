import type { ReactNode } from "react";

import { StatusBadge, type ReviewState } from "./review.js";

interface CompareToolbarProps {
  mode: "difference" | "overlay" | "side-by-side";
  viewport: "desktop" | "mobile";
}

const MODE_LABELS: readonly {
  key: CompareToolbarProps["mode"];
  label: string;
}[] = [
  { key: "side-by-side", label: "Side by side" },
  { key: "overlay", label: "Overlay" },
  { key: "difference", label: "Difference" },
];

const VIEWPORT_LABELS: readonly { key: string; label: string }[] = [
  { key: "mobile", label: "Mobile" },
  { key: "desktop", label: "Desktop" },
  { key: "both", label: "Both" },
];

/** Comparison mode and viewport controls for one compare page. */
export function CompareToolbar({ mode, viewport }: CompareToolbarProps) {
  return (
    <div className="mbk-cmp-toolbar">
      <span className="mbk-seg" role="group" aria-label="Comparison mode">
        {MODE_LABELS.map((option) => (
          <span
            key={option.key}
            className={option.key === mode ? "active" : undefined}
          >
            {option.label}
          </span>
        ))}
      </span>
      <span className="mbk-seg" role="group" aria-label="Viewport">
        {VIEWPORT_LABELS.map((option) => (
          <span
            key={option.key}
            className={option.key === viewport ? "active" : undefined}
          >
            {option.label}
          </span>
        ))}
      </span>
    </div>
  );
}

/** The before/after comparison grid on the dotted stage. */
export function CompareGrid({ children }: { children: ReactNode }) {
  return <div className="mbk-compare">{children}</div>;
}

interface PaneProps {
  children: ReactNode;
  label: string;
  side: "after" | "before";
  tone?: "added" | "changed" | "removed";
}

/** One labeled before or after comparison pane. */
export function Pane({ children, label, side, tone }: PaneProps) {
  const dot = tone ?? (side === "before" ? "base" : "changed");
  return (
    <div className="mbk-compare-side">
      <p className={`mbk-compare-label ${side}`}>
        <span className={`mbk-chg-dot ${dot}`} aria-hidden="true" />
        {label}
      </p>
      {children}
    </div>
  );
}

/** Placeholder pane for a screen absent on one side. */
export function MissingPane({
  label,
  message,
  side,
}: {
  label: string;
  message: string;
  side: "after" | "before";
}) {
  return (
    <div className="mbk-compare-side">
      <p className={`mbk-compare-label ${side}`}>
        <span className="mbk-chg-dot base" aria-hidden="true" />
        {label}
      </p>
      <div className="mbk-pane-missing">{message}</div>
    </div>
  );
}

/** Legend for tinted difference regions. */
export function DiffLegend() {
  return (
    <p className="mbk-diff-legend">
      <span>
        <i className="changed" aria-hidden="true" />
        Changed
      </span>
      <span>
        <i className="added" aria-hidden="true" />
        Added
      </span>
      <span className="mbk-diff-legend-note">
        After · this branch, with the differences from origin/main marked.
      </span>
    </p>
  );
}

interface ReviewSummaryProps {
  facts: string;
  pct?: string | undefined;
  state: ReviewState;
}

/** The foot summary band naming what changed on the compared screen. */
export function ReviewSummary({ facts, pct, state }: ReviewSummaryProps) {
  return (
    <div className="mbk-review-summary">
      <StatusBadge state={state} />
      <span className="mbk-review-facts">{facts}</span>
      {pct ? <span className="mbk-review-pct">{pct}</span> : null}
    </div>
  );
}
