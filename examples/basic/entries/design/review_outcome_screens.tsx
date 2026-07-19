import type { ReactNode } from "react";

import { screen } from "mokabook";

import {
  BaseLine,
  CompareToolbar,
  DiffLegend,
  MissingPane,
  Pane,
  ReviewNav,
  StatusBadge,
  type ReviewState,
} from "./parts/review.js";
import { Shell } from "./parts/shell.js";
import { MiniFarewell, MiniDetails, MiniWelcome } from "./parts/stage.js";

interface ComparePageProps {
  activeTitle: string;
  children: ReactNode;
  foot: string;
  route: string;
  state: ReviewState;
  title: string;
  viewport: "desktop" | "mobile";
  mode?: "difference" | "overlay" | "side-by-side";
}

function ComparePage({
  activeTitle,
  children,
  foot,
  mode = "side-by-side",
  route,
  state,
  title,
  viewport,
}: ComparePageProps) {
  return (
    <Shell
      mode="review"
      viewport={viewport}
      nav={
        viewport === "desktop" ? <ReviewNav activeTitle={activeTitle} /> : null
      }
    >
      <BaseLine />
      <div className="mb-title-row">
        <h1>{title}</h1>
        <StatusBadge state={state} />
        <span className="mb-code">{route}</span>
      </div>
      <CompareToolbar mode={mode} viewport={viewport} />
      <div className="mb-panes">{children}</div>
      <p className="mb-review-foot">{foot}</p>
    </Shell>
  );
}

function ChangedCompare({ viewport }: { viewport: "desktop" | "mobile" }) {
  const compact = viewport === "mobile";
  return (
    <ComparePage
      activeTitle="Welcome"
      foot="Mobile and desktop both changed on this branch."
      route="screens/welcome.html"
      state="changed"
      title="Welcome"
      viewport={viewport}
    >
      <Pane label="Before — origin/main">
        <MiniWelcome compact={compact} />
      </Pane>
      <Pane label="After — this branch">
        <MiniWelcome compact={compact} revised />
      </Pane>
    </ComparePage>
  );
}

function AddedCompare({ viewport }: { viewport: "desktop" | "mobile" }) {
  const compact = viewport === "mobile";
  return (
    <ComparePage
      activeTitle="Details"
      foot="This screen is new on this branch."
      route="screens/details.html"
      state="added"
      title="Details"
      viewport={viewport}
    >
      <MissingPane
        label="Before — origin/main"
        message="This screen does not exist on origin/main."
      />
      <Pane label="After — this branch" tone="added">
        <MiniDetails compact={compact} />
      </Pane>
    </ComparePage>
  );
}

function RemovedCompare({ viewport }: { viewport: "desktop" | "mobile" }) {
  const compact = viewport === "mobile";
  return (
    <ComparePage
      activeTitle="Farewell"
      foot="This screen was removed on this branch."
      route="screens/farewell.html"
      state="removed"
      title="Farewell"
      viewport={viewport}
    >
      <Pane label="Before — origin/main" tone="removed">
        <MiniFarewell compact={compact} />
      </Pane>
      <MissingPane
        label="After — this branch"
        message="This screen does not exist on this branch."
      />
    </ComparePage>
  );
}

function DifferenceCompare({ viewport }: { viewport: "desktop" | "mobile" }) {
  const compact = viewport === "mobile";
  return (
    <ComparePage
      activeTitle="Welcome"
      foot="Tinted regions mark the lines that differ from origin/main."
      mode="difference"
      route="screens/welcome.html"
      state="changed"
      title="Welcome"
      viewport={viewport}
    >
      <Pane label="Difference — this branch over origin/main">
        <MiniWelcome compact={compact} revised tinted />
      </Pane>
      <DiffLegend />
    </ComparePage>
  );
}

/** Review design screens for per-screen comparison outcomes. */
export const reviewOutcomeScreens = [
  screen({
    description: "A changed screen compared side by side with its base render.",
    desktop: <ChangedCompare viewport="desktop" />,
    id: "design-review-changed",
    mobile: <ChangedCompare viewport="mobile" />,
    slug: "changed",
    title: "Changed screen",
  }),
  screen({
    description: "An added screen with no base render to compare against.",
    desktop: <AddedCompare viewport="desktop" />,
    id: "design-review-added",
    mobile: <AddedCompare viewport="mobile" />,
    slug: "added",
    title: "Added screen",
  }),
  screen({
    description: "A removed screen keeping only its base render.",
    desktop: <RemovedCompare viewport="desktop" />,
    id: "design-review-removed",
    mobile: <RemovedCompare viewport="mobile" />,
    slug: "removed",
    title: "Removed screen",
  }),
  screen({
    description:
      "Difference mode highlighting changed and added regions in place.",
    desktop: <DifferenceCompare viewport="desktop" />,
    id: "design-review-difference",
    mobile: <DifferenceCompare viewport="mobile" />,
    slug: "difference",
    title: "Difference mode",
  }),
];
