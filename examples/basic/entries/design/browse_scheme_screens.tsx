import { screen } from "mokabook";

import { DetailsPanel } from "./parts/details.js";
import { NavTree } from "./parts/nav.js";
import { SchemeSwitch, ScreenHead, Shell, ViewSwitch } from "./parts/shell.js";
import {
  BrowserFrame,
  MiniDetails,
  MiniWelcome,
  PhoneFrame,
  Stage,
} from "./parts/stage.js";

type SchemeViewport = "desktop" | "mobile";

function SchemeHead({
  idChip,
  title,
  viewport,
}: {
  idChip: string;
  title: string;
  viewport: SchemeViewport;
}) {
  return (
    <ScreenHead
      action={
        viewport === "desktop" ? (
          <ViewSwitch active="both" />
        ) : (
          <>
            <ViewSwitch active="mobile" />
            <SchemeSwitch active="dark" />
          </>
        )
      }
      crumbs={["Example", "Screens"]}
      idChip={idChip}
      title={title}
    />
  );
}

function DarkSchemeDesktop() {
  return (
    <Shell
      colorScheme="dark"
      mode="browse"
      viewport="desktop"
      nav={<NavTree activeLabel="Welcome" />}
    >
      <SchemeHead idChip="example-welcome" title="Welcome" viewport="desktop" />
      <Stage>
        <PhoneFrame dark label="Mobile">
          <MiniWelcome compact />
        </PhoneFrame>
        <BrowserFrame address="example.test/welcome" dark label="Desktop">
          <MiniWelcome />
        </BrowserFrame>
      </Stage>
      <DetailsPanel />
    </Shell>
  );
}

function DarkSchemeMobile() {
  return (
    <Shell colorScheme="dark" mode="browse" viewport="mobile" nav={null}>
      <SchemeHead idChip="example-welcome" title="Welcome" viewport="mobile" />
      <Stage>
        <PhoneFrame dark label="Mobile" small>
          <MiniWelcome compact />
        </PhoneFrame>
      </Stage>
      <DetailsPanel />
    </Shell>
  );
}

function LightOnlyDesktop() {
  return (
    <Shell
      colorScheme="dark"
      mode="browse"
      viewport="desktop"
      nav={<NavTree activeLabel="Details" />}
    >
      <SchemeHead idChip="example-details" title="Details" viewport="desktop" />
      <Stage>
        <PhoneFrame label="Mobile" lightOnly>
          <MiniDetails compact />
        </PhoneFrame>
        <BrowserFrame address="example.test/details" label="Desktop" lightOnly>
          <MiniDetails />
        </BrowserFrame>
      </Stage>
      <DetailsPanel />
    </Shell>
  );
}

function LightOnlyMobile() {
  return (
    <Shell colorScheme="dark" mode="browse" viewport="mobile" nav={null}>
      <SchemeHead idChip="example-details" title="Details" viewport="mobile" />
      <Stage>
        <PhoneFrame label="Mobile" lightOnly small>
          <MiniDetails compact />
        </PhoneFrame>
      </Stage>
      <DetailsPanel />
    </Shell>
  );
}

/** Browse shell design screens for the light and dark color-scheme states. */
export const browseSchemeScreens = [
  screen({
    colorSchemes: ["light"],
    description:
      "The catalogue with the dark scheme selected and dark device screens.",
    desktop: <DarkSchemeDesktop />,
    id: "design-browse-dark-scheme",
    mobile: <DarkSchemeMobile />,
    rationale:
      "Dark applies inside the device screens only (--mbk-dark-screen-bg #121514, --mbk-dark-screen-ink #eef1ef); bezels, the browser bar, and every shell surface stay light so the catalogue frame reads the same in both schemes. Wide layouts carry the switch in the top bar beside the search field; narrow layouts move it into the screen head band beside the viewport control, where the top bar has no room.",
    slug: "dark-scheme",
    title: "Dark scheme selected",
  }),
  screen({
    colorSchemes: ["light"],
    description:
      "A screen with no dark render keeping light device screens under the dark selection.",
    desktop: <LightOnlyDesktop />,
    id: "design-browse-light-only",
    mobile: <LightOnlyMobile />,
    rationale:
      "A screen that renders in light only keeps its light frames instead of being tinted, and its frame label states the fallback so a reviewer can tell a light render from a missing dark one. The selection itself stays on dark for the rest of the catalogue.",
    slug: "light-only",
    title: "Light-only screen under dark",
  }),
];
