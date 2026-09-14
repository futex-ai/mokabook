import type { ReactNode } from "react";

import { useDesignInstance } from "../library/composition.js";
import { comparisonToolbar } from "../library/controls/comparison-toolbar.js";
import { comparisonPane } from "../library/preview/comparison-pane.js";
import { useDesignNavigation } from "./design_navigation.js";
import type { ComparisonMode } from "./destinations.js";
import type { ReviewState } from "./review.js";

export function CompareToolbar({
  mode,
  accessible = false,
}: {
  mode: ComparisonMode;
  accessible?: boolean | undefined;
}) {
  const navigation = useDesignNavigation();
  return (
    <comparisonToolbar.Component
      mokabookInstance={useDesignInstance("comparison")}
      mode={mode}
      eligible
      accessible={accessible}
      destinations={navigation.comparison ?? {}}
    />
  );
}

const STATE_LABELS: Record<ReviewState, string> = {
  added: "New screen",
  changed: "Screen changed",
  "ignored-only": "Only excluded content changed",
  removed: "Screen removed",
  unchanged: "No changes to this screen",
};

/** Comparison status and secondary evidence share the scrollable screen stage. */
export function ComparisonStage({
  children,
  state,
  viewport,
}: {
  children: ReactNode;
  state: ReviewState;
  viewport: "mobile" | "desktop";
}) {
  return (
    <section className="mbk-comparison-stage">
      <h3>
        {viewport === "mobile" ? "Mobile" : "Desktop"} · {STATE_LABELS[state]}
      </h3>
      {children}
    </section>
  );
}

/** The before/current comparison grid on the dotted stage. */
export function CompareGrid({
  children,
  difference,
}: {
  children: ReactNode;
  difference?: boolean;
}) {
  return (
    <div
      className="mbk-compare"
      data-compare-mode={difference ? "difference" : "side"}
    >
      {children}
    </div>
  );
}

export function Pane({
  children,
  label,
  side,
}: {
  children: ReactNode;
  label: string;
  side: "after" | "before";
}) {
  return (
    <comparisonPane.Component
      mokabookInstance={useDesignInstance(side)}
      side={side}
      label={label}
      state="present"
    >
      {children}
    </comparisonPane.Component>
  );
}

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
    <comparisonPane.Component
      mokabookInstance={useDesignInstance(side)}
      side={side}
      label={label}
      state="missing"
      message={message}
    />
  );
}
