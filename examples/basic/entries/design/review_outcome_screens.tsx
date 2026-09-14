import { screen } from "@mokly/mokly";

import { PreviewWorkspace } from "./components/parts/workspace.js";
import { CompareGrid, Pane } from "./parts/compare.js";
import {
  ComparePage,
  FramedShot,
  type CompareViewport,
} from "./parts/compare_page.js";
import { DESTINATIONS } from "./parts/destinations.js";
import { DetailsPanel } from "./parts/details.js";
import { ExampleWorkspace } from "./parts/example_workspace.js";
import { MiniWelcome } from "./parts/mini_screens.js";
import { ReviewNav } from "./parts/review.js";
import { ScreenHead, Shell, ViewSwitch } from "./parts/shell.js";
import { EmptyState } from "./parts/stage_content.js";

function ChangedCompare({ viewport }: { viewport: CompareViewport }) {
  return (
    <ComparePage
      design={DESTINATIONS.changed}
      activeTitle="Welcome"
      subject="welcome"
      idChip="example-welcome"
      state="changed"
      title="Welcome"
      viewport={viewport}
      render={(previewViewport) => (
        <CompareGrid>
          <Pane label="Before" side="before">
            <FramedShot
              address="example.test/welcome"
              viewport={previewViewport}
            >
              <MiniWelcome compact={previewViewport === "mobile"} />
            </FramedShot>
          </Pane>
          <Pane label="Current" side="after">
            <FramedShot
              address="example.test/welcome"
              viewport={previewViewport}
            >
              <MiniWelcome compact={previewViewport === "mobile"} revised />
            </FramedShot>
          </Pane>
        </CompareGrid>
      )}
    />
  );
}

function AddedCurrent({ viewport }: { viewport: CompareViewport }) {
  return (
    <Shell
      design={DESTINATIONS.added}
      viewport={viewport}
      nav={viewport === "desktop" ? <ReviewNav activeTitle="Details" /> : null}
    >
      <ScreenHead
        action={<ViewSwitch active={viewport} />}
        crumbs={["Example", "Screens"]}
        idChip="example-details"
        status="added"
        title="Details"
      />
      <ExampleWorkspace
        subject="details"
        viewport={viewport}
        comparisonEvidence={<p>Added to this branch.</p>}
      />
    </Shell>
  );
}

function RemovedCurrent({ viewport }: { viewport: CompareViewport }) {
  return (
    <Shell
      design={DESTINATIONS.removed}
      viewport={viewport}
      nav={viewport === "desktop" ? <ReviewNav activeTitle="Farewell" /> : null}
    >
      <ScreenHead
        action={<ViewSwitch active={viewport} />}
        crumbs={["Example", "Screens"]}
        idChip="example-farewell"
        status="removed"
        title="Farewell"
      />
      <PreviewWorkspace
        inspector={<DetailsPanel subject="farewell" comparisonEvidence open />}
        render={() => (
          <EmptyState
            body="There is no current preview to show."
            title="This screen was removed"
            to={DESTINATIONS.home}
          />
        )}
      />
    </Shell>
  );
}

function DifferenceCompare({ viewport }: { viewport: CompareViewport }) {
  return (
    <ComparePage
      design={DESTINATIONS.difference}
      activeTitle="Welcome"
      subject="welcome"
      idChip="example-welcome"
      mode="difference"
      state="changed"
      title="Welcome"
      viewport={viewport}
      render={(previewViewport) => (
        <CompareGrid difference>
          <Pane label="Before" side="before">
            <FramedShot
              address="example.test/welcome"
              viewport={previewViewport}
            >
              <MiniWelcome compact={previewViewport === "mobile"} />
            </FramedShot>
          </Pane>
          <Pane label="Current" side="after">
            <FramedShot
              address="example.test/welcome"
              viewport={previewViewport}
            >
              <MiniWelcome compact={previewViewport === "mobile"} revised />
            </FramedShot>
          </Pane>
        </CompareGrid>
      )}
    />
  );
}

function DarkViewCompare({ viewport }: { viewport: CompareViewport }) {
  return (
    <ComparePage
      design={DESTINATIONS.darkChanged}
      activeTitle="Welcome"
      subject="welcome"
      idChip="example-welcome"
      state="changed"
      title="Welcome"
      viewport={viewport}
      render={(previewViewport) => (
        <CompareGrid>
          <Pane label="Before" side="before">
            <FramedShot
              address="example.test/welcome"
              dark
              viewport={previewViewport}
            >
              <MiniWelcome compact={previewViewport === "mobile"} />
            </FramedShot>
          </Pane>
          <Pane label="Current" side="after">
            <FramedShot
              address="example.test/welcome"
              dark
              viewport={previewViewport}
            >
              <MiniWelcome compact={previewViewport === "mobile"} revised />
            </FramedShot>
          </Pane>
        </CompareGrid>
      )}
    />
  );
}

/** Review design screens for per-screen comparison outcomes. */
export const reviewOutcomeScreens = [
  screen({
    colorSchemes: ["light"],
    description: "A changed screen compared side by side with its base render.",
    desktop: <ChangedCompare viewport="desktop" />,
    id: "design-review-changed",
    mobile: <ChangedCompare viewport="mobile" />,
    slug: "changed",
    title: "Changed screen",
  }),
  screen({
    colorSchemes: ["light"],
    description: "An added screen shown directly in its current state.",
    desktop: <AddedCurrent viewport="desktop" />,
    id: "design-review-added",
    mobile: <AddedCurrent viewport="mobile" />,
    slug: "added",
    title: "Added screen",
  }),
  screen({
    colorSchemes: ["light"],
    description: "A removed screen shown as an empty current state.",
    desktop: <RemovedCurrent viewport="desktop" />,
    id: "design-review-removed",
    mobile: <RemovedCurrent viewport="mobile" />,
    slug: "removed",
    title: "Removed screen",
  }),
  screen({
    colorSchemes: ["light"],
    description: "Difference mode blends the two screen versions in place.",
    desktop: <DifferenceCompare viewport="desktop" />,
    id: "design-review-difference",
    mobile: <DifferenceCompare viewport="mobile" />,
    slug: "difference",
    title: "Difference mode",
  }),
  screen({
    colorSchemes: ["light"],
    description:
      "The dark view of a changed screen compared side by side with its base render.",
    desktop: <DarkViewCompare viewport="desktop" />,
    id: "design-review-dark-scheme",
    mobile: <DarkViewCompare viewport="mobile" />,
    rationale:
      "A screen with a dark render uses the grouped theme icon and viewport dropdown while the compact diff band selects its display mode. Dark reaches only inside the compared device screens (--mbk-dark-screen-bg #121514, --mbk-dark-screen-ink #eef1ef); the changed-screens navigation, head band, and comparison controls stay light. A screen that renders in light only keeps the theme icon disabled when no alternate state is available, and the head band never repeats the selected scheme in its title.",
    slug: "dark-scheme",
    title: "Dark view compare",
  }),
];
