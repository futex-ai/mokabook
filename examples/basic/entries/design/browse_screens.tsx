import { screen } from "mokabook";

import { DetailsPanel } from "./parts/details.js";
import { NavDrawer, NavTree } from "./parts/nav.js";
import { ScreenHead, Shell, TopBar, ViewSwitch } from "./parts/shell.js";
import {
  BrowserFrame,
  EmptyState,
  FlowStep,
  MiniDetails,
  MiniWelcome,
  PhoneFrame,
  Stage,
} from "./parts/stage.js";

function HomeBody() {
  return (
    <EmptyState
      title="Mokabook"
      body="Browse the mockup catalogue. 15 screens and 1 use case are generated from this repository."
      linkLabel="Open the first screen"
    />
  );
}

function HomeDesktop() {
  return (
    <Shell mode="browse" viewport="desktop" nav={<NavTree />}>
      <HomeBody />
    </Shell>
  );
}

function HomeMobile() {
  return (
    <Shell mode="browse" viewport="mobile" nav={null}>
      <HomeBody />
    </Shell>
  );
}

function WelcomeHead() {
  return (
    <ScreenHead
      crumbs={["Example", "Screens"]}
      idChip="example-welcome"
      title="Welcome"
    />
  );
}

function SelectedScreenDesktop() {
  return (
    <Shell
      mode="browse"
      viewport="desktop"
      nav={<NavTree activeLabel="Welcome" />}
    >
      <WelcomeHead />
      <ViewSwitch active="both" />
      <Stage>
        <PhoneFrame label="Mobile">
          <MiniWelcome compact />
        </PhoneFrame>
        <BrowserFrame address="example.test/welcome" label="Desktop">
          <MiniWelcome />
        </BrowserFrame>
      </Stage>
      <DetailsPanel />
    </Shell>
  );
}

function SelectedScreenMobile() {
  return (
    <Shell mode="browse" viewport="mobile" nav={null}>
      <WelcomeHead />
      <ViewSwitch active="mobile" />
      <Stage>
        <PhoneFrame label="Mobile" small>
          <MiniWelcome compact />
        </PhoneFrame>
      </Stage>
      <DetailsPanel />
    </Shell>
  );
}

function UseCaseSteps({ viewport }: { viewport: "desktop" | "mobile" }) {
  return (
    <div className="mbk-flow">
      <div className="flow-track">
        <FlowStep
          number={1}
          title="Welcome"
          description="The tour starts on the landing screen."
          screenId="example-welcome"
        >
          {viewport === "desktop" ? (
            <BrowserFrame address="example.test/welcome">
              <MiniWelcome />
            </BrowserFrame>
          ) : (
            <PhoneFrame small>
              <MiniWelcome compact />
            </PhoneFrame>
          )}
        </FlowStep>
        <FlowStep
          number={2}
          title="Details"
          description="The tour ends on the details screen."
          screenId="example-details"
        >
          {viewport === "desktop" ? (
            <BrowserFrame address="example.test/details">
              <MiniDetails />
            </BrowserFrame>
          ) : (
            <PhoneFrame small>
              <MiniDetails compact />
            </PhoneFrame>
          )}
        </FlowStep>
      </div>
    </div>
  );
}

function UseCaseHead() {
  return (
    <ScreenHead
      crumbs={["Example"]}
      idChip="example-tour"
      title="Example tour"
    />
  );
}

function UseCaseDesktop() {
  return (
    <Shell
      mode="browse"
      viewport="desktop"
      nav={<NavTree activeLabel="Example tour" />}
    >
      <UseCaseHead />
      <UseCaseSteps viewport="desktop" />
    </Shell>
  );
}

function UseCaseMobile() {
  return (
    <Shell mode="browse" viewport="mobile" nav={null}>
      <UseCaseHead />
      <UseCaseSteps viewport="mobile" />
    </Shell>
  );
}

function DetailsOpenDesktop() {
  return (
    <Shell
      mode="browse"
      viewport="desktop"
      nav={<NavTree activeLabel="Welcome" />}
    >
      <WelcomeHead />
      <ViewSwitch active="desktop" />
      <Stage>
        <BrowserFrame address="example.test/welcome" label="Desktop">
          <MiniWelcome />
        </BrowserFrame>
      </Stage>
      <DetailsPanel open />
    </Shell>
  );
}

function DetailsOpenMobile() {
  return (
    <Shell mode="browse" viewport="mobile" nav={null}>
      <WelcomeHead />
      <DetailsPanel open />
    </Shell>
  );
}

function MissingRouteBody() {
  return (
    <EmptyState
      title="Screen not found"
      body="Nothing in the catalogue matches"
      code="view/screens/unknown.html"
      linkLabel="Go to the catalogue home"
    />
  );
}

function MissingRouteDesktop() {
  return (
    <Shell mode="browse" viewport="desktop" nav={<NavTree />}>
      <MissingRouteBody />
    </Shell>
  );
}

function MissingRouteMobile() {
  return (
    <Shell mode="browse" viewport="mobile" nav={null}>
      <MissingRouteBody />
    </Shell>
  );
}

function NarrowNavigationDesktop() {
  return (
    <div className="mbk-shell mbk-shell--collapsed">
      <TopBar mode="browse" viewport="mobile" />
      <main className="mbk-main">
        <HomeBody />
      </main>
      <NavDrawer activeLabel="Welcome" />
    </div>
  );
}

function NarrowNavigationMobile() {
  return (
    <Shell
      mode="browse"
      viewport="mobile"
      nav={null}
      aside={<NavDrawer activeLabel="Welcome" />}
    >
      <HomeBody />
    </Shell>
  );
}

/** Browse shell design screens grouped by catalogue views and shell states. */
export const browseViewScreens = [
  screen({
    description:
      "The catalogue home with the navigation tree, search, and filter.",
    desktop: <HomeDesktop />,
    id: "design-browse-home",
    mobile: <HomeMobile />,
    slug: "home",
    title: "Home",
  }),
  screen({
    description:
      "A selected screen with viewport switching and framed fragments.",
    desktop: <SelectedScreenDesktop />,
    id: "design-browse-screen",
    mobile: <SelectedScreenMobile />,
    slug: "screen",
    title: "Selected screen",
  }),
  screen({
    description:
      "A selected use case rendering ordered steps of existing screens.",
    desktop: <UseCaseDesktop />,
    id: "design-browse-use-case",
    mobile: <UseCaseMobile />,
    slug: "use-case",
    title: "Selected use case",
  }),
];

/** Browse shell design screens for secondary shell states. */
export const browseStateScreens = [
  screen({
    description: "The details panel expanded under a selected screen.",
    desktop: <DetailsOpenDesktop />,
    id: "design-browse-details",
    mobile: <DetailsOpenMobile />,
    slug: "details",
    title: "Details panel",
  }),
  screen({
    description: "The not-found view keeping catalogue navigation available.",
    desktop: <MissingRouteDesktop />,
    id: "design-browse-missing-route",
    mobile: <MissingRouteMobile />,
    slug: "missing-route",
    title: "Missing route",
  }),
  screen({
    description:
      "Collapsed navigation opening as a drawer on narrow viewports.",
    desktop: <NarrowNavigationDesktop />,
    id: "design-browse-navigation",
    mobile: <NarrowNavigationMobile />,
    slug: "navigation",
    title: "Narrow navigation",
  }),
];
