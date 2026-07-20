import type { ReactNode } from "react";

import { screen } from "mokabook";

import {
  CompareGrid,
  CompareToolbar,
  DiffLegend,
  MissingPane,
  Pane,
  ReviewSummary,
} from "./parts/compare.js";
import { ReviewNav, StatusBadge, type ReviewState } from "./parts/review.js";
import { ScreenHead, Shell } from "./parts/shell.js";
import {
  BrowserFrame,
  MiniDetails,
  MiniFarewell,
  MiniWelcome,
  PhoneFrame,
} from "./parts/stage.js";

type CompareViewport = "desktop" | "mobile";

interface ComparePageProps {
  activeTitle: string;
  children: ReactNode;
  facts: string;
  idChip: string;
  mode?: "difference" | "overlay" | "side-by-side";
  pct?: string | undefined;
  state: ReviewState;
  title: string;
  viewport: CompareViewport;
}

function ComparePage({
  activeTitle,
  children,
  facts,
  idChip,
  mode,
  pct,
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
      <ScreenHead
        action={<span className="mbk-open-browse">Open in Browse ↗</span>}
        crumbs={["Example", "Screens"]}
        idChip={idChip}
        status={<StatusBadge state={state} />}
        title={title}
      />
      <CompareToolbar mode={mode ?? "side-by-side"} viewport={viewport} />
      {children}
      <ReviewSummary facts={facts} pct={pct} state={state} />
    </Shell>
  );
}

function FramedShot({
  address,
  children,
  viewport,
}: {
  address: string;
  children: ReactNode;
  viewport: CompareViewport;
}) {
  if (viewport === "desktop") {
    return <BrowserFrame address={address}>{children}</BrowserFrame>;
  }
  return <PhoneFrame small>{children}</PhoneFrame>;
}

function ChangedCompare({ viewport }: { viewport: CompareViewport }) {
  const compact = viewport === "mobile";
  return (
    <ComparePage
      activeTitle="Welcome"
      facts="Mobile and desktop both changed on this branch."
      idChip="example-welcome"
      pct="~4.8% of pixels differ"
      state="changed"
      title="Welcome"
      viewport={viewport}
    >
      <CompareGrid>
        <Pane label="Before · origin/main" side="before">
          <FramedShot address="example.test/welcome" viewport={viewport}>
            <MiniWelcome compact={compact} />
          </FramedShot>
        </Pane>
        <Pane label="After · this branch" side="after">
          <FramedShot address="example.test/welcome" viewport={viewport}>
            <MiniWelcome compact={compact} revised />
          </FramedShot>
        </Pane>
      </CompareGrid>
    </ComparePage>
  );
}

function AddedCompare({ viewport }: { viewport: CompareViewport }) {
  const compact = viewport === "mobile";
  return (
    <ComparePage
      activeTitle="Details"
      facts="This screen is new on this branch."
      idChip="example-details"
      state="added"
      title="Details"
      viewport={viewport}
    >
      <CompareGrid>
        <MissingPane
          label="Before · origin/main"
          message="This screen does not exist on origin/main."
          side="before"
        />
        <Pane label="After · this branch" side="after" tone="added">
          <FramedShot address="example.test/details" viewport={viewport}>
            <MiniDetails compact={compact} />
          </FramedShot>
        </Pane>
      </CompareGrid>
    </ComparePage>
  );
}

function RemovedCompare({ viewport }: { viewport: CompareViewport }) {
  const compact = viewport === "mobile";
  return (
    <ComparePage
      activeTitle="Farewell"
      facts="This screen was removed on this branch."
      idChip="example-farewell"
      state="removed"
      title="Farewell"
      viewport={viewport}
    >
      <CompareGrid>
        <Pane label="Before · origin/main" side="before" tone="removed">
          <FramedShot address="example.test/farewell" viewport={viewport}>
            <MiniFarewell compact={compact} />
          </FramedShot>
        </Pane>
        <MissingPane
          label="After · this branch"
          message="This screen does not exist on this branch."
          side="after"
        />
      </CompareGrid>
    </ComparePage>
  );
}

function DifferenceCompare({ viewport }: { viewport: CompareViewport }) {
  const compact = viewport === "mobile";
  return (
    <ComparePage
      activeTitle="Welcome"
      facts="Tinted regions mark the lines that differ from origin/main."
      idChip="example-welcome"
      mode="difference"
      pct="~4.8% of pixels differ"
      state="changed"
      title="Welcome"
      viewport={viewport}
    >
      <div className="mbk-diff-view">
        <DiffLegend />
        <FramedShot address="example.test/welcome" viewport={viewport}>
          <MiniWelcome compact={compact} revised tinted />
        </FramedShot>
      </div>
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
