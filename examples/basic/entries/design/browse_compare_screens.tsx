import type { ReactNode } from "react";

import { screen } from "mokabook";

import {
  CompareDoc,
  CompareStack,
  CompareSwitch,
  DiffScreen,
  MissingBase,
  type CompareMode,
} from "./parts/compare.js";
import { DetailsPanel } from "./parts/details.js";
import { NavTree } from "./parts/nav.js";
import {
  SchemeSwitch,
  ScreenHead,
  Shell,
  ViewSwitch,
  type ShellColorScheme,
} from "./parts/shell.js";
import { BrowserFrame, MiniWelcome, PhoneFrame, Stage } from "./parts/stage.js";

type CompareViewport = "desktop" | "mobile";

interface ComparePageProps {
  children: ReactNode;
  colorScheme?: ShellColorScheme | undefined;
  idChip: string;
  mode: CompareMode;
  title: string;
  viewport: CompareViewport;
}

function ComparePage({
  children,
  colorScheme,
  idChip,
  mode,
  title,
  viewport,
}: ComparePageProps) {
  const narrowScheme = colorScheme !== undefined && viewport === "mobile";
  return (
    <Shell
      colorScheme={colorScheme}
      viewport={viewport}
      nav={viewport === "desktop" ? <NavTree activeLabel={title} /> : null}
    >
      <ScreenHead
        action={
          narrowScheme ? (
            <>
              <CompareSwitch active={mode} />
              <ViewSwitch active="mobile" />
              <SchemeSwitch active="dark" />
            </>
          ) : (
            <>
              <CompareSwitch active={mode} />
              <ViewSwitch active={viewport === "desktop" ? "both" : "mobile"} />
            </>
          )
        }
        crumbs={["Example", "Screens"]}
        idChip={idChip}
        title={title}
      />
      <Stage>{children}</Stage>
      <DetailsPanel />
    </Shell>
  );
}

function WelcomeCompare({
  dark,
  mode,
  viewport,
}: {
  dark?: boolean;
  mode: Exclude<CompareMode, "current">;
  viewport: CompareViewport;
}) {
  const stack = (compact: boolean) => {
    if (mode === "difference") {
      return (
        <CompareStack mode="difference">
          <DiffScreen compact={compact} />
        </CompareStack>
      );
    }
    if (mode === "base") {
      return (
        <CompareStack mode="base">
          <CompareDoc side="base">
            <MiniWelcome compact={compact} />
          </CompareDoc>
        </CompareStack>
      );
    }
    return (
      <CompareStack mode="overlay">
        <CompareDoc side="base">
          <MiniWelcome compact={compact} />
        </CompareDoc>
        <CompareDoc side="head">
          <MiniWelcome compact={compact} revised />
        </CompareDoc>
      </CompareStack>
    );
  };
  return (
    <>
      <PhoneFrame dark={dark} label="Mobile" small={viewport === "mobile"}>
        {stack(true)}
      </PhoneFrame>
      {viewport === "desktop" ? (
        <BrowserFrame
          address="example.test/welcome"
          dark={dark}
          label="Desktop"
        >
          {stack(false)}
        </BrowserFrame>
      ) : null}
    </>
  );
}

function BaseCompare({ viewport }: { viewport: CompareViewport }) {
  return (
    <ComparePage
      idChip="example-welcome"
      mode="base"
      title="Welcome"
      viewport={viewport}
    >
      <WelcomeCompare mode="base" viewport={viewport} />
    </ComparePage>
  );
}

function OverlayCompare({ viewport }: { viewport: CompareViewport }) {
  return (
    <ComparePage
      idChip="example-welcome"
      mode="overlay"
      title="Welcome"
      viewport={viewport}
    >
      <WelcomeCompare mode="overlay" viewport={viewport} />
    </ComparePage>
  );
}

function DifferenceCompare({ viewport }: { viewport: CompareViewport }) {
  return (
    <ComparePage
      idChip="example-welcome"
      mode="difference"
      title="Welcome"
      viewport={viewport}
    >
      <WelcomeCompare mode="difference" viewport={viewport} />
    </ComparePage>
  );
}

function AddedCompare({ viewport }: { viewport: CompareViewport }) {
  const missing = (
    <CompareStack mode="base">
      <MissingBase />
    </CompareStack>
  );
  return (
    <ComparePage
      idChip="example-details"
      mode="base"
      title="Details"
      viewport={viewport}
    >
      <PhoneFrame label="Mobile" small={viewport === "mobile"}>
        {missing}
      </PhoneFrame>
      {viewport === "desktop" ? (
        <BrowserFrame address="example.test/details" label="Desktop">
          {missing}
        </BrowserFrame>
      ) : null}
    </ComparePage>
  );
}

function DarkCompare({ viewport }: { viewport: CompareViewport }) {
  return (
    <ComparePage
      colorScheme="dark"
      idChip="example-welcome"
      mode="overlay"
      title="Welcome"
      viewport={viewport}
    >
      <WelcomeCompare dark mode="overlay" viewport={viewport} />
    </ComparePage>
  );
}

/** Browse shell design screens for the per-screen compare modes. */
export const browseCompareScreens = [
  screen({
    colorSchemes: ["light"],
    description:
      "Base mode showing the branch-point render in the same device chrome.",
    desktop: <BaseCompare viewport="desktop" />,
    id: "design-browse-compare-base",
    mobile: <BaseCompare viewport="mobile" />,
    rationale:
      "The compare segment sits in the screen head before the viewport control and appears on every screen when Git change detection is available. Current is the default and loads nothing; Base swaps the device screens to the branch-point documents without touching any other shell surface, so the frame labels, chrome, and navigation read identically.",
    slug: "base",
    title: "Base mode",
  }),
  screen({
    colorSchemes: ["light"],
    description:
      "Overlay mode ghosting the current render over the base render.",
    desktop: <OverlayCompare viewport="desktop" />,
    id: "design-browse-compare-overlay",
    mobile: <OverlayCompare viewport="mobile" />,
    rationale:
      "Overlay stacks the current document at half opacity above the base document inside each device screen, so aligned regions read solid and moved or edited regions read doubled. Both viewports compare at once because both frames are already on the stage.",
    slug: "overlay",
    title: "Overlay mode",
  }),
  screen({
    colorSchemes: ["light"],
    description:
      "Difference mode blending the current and base renders in place.",
    desktop: <DifferenceCompare viewport="desktop" />,
    id: "design-browse-compare-difference",
    mobile: <DifferenceCompare viewport="mobile" />,
    rationale:
      "Difference composites the current document over the base document with a difference blend: identical pixels cancel to near-black while changed lines read bright. The mockup illustrates that result; the served shell produces it as a real blend of the two live documents.",
    slug: "difference",
    title: "Difference mode",
  }),
  screen({
    colorSchemes: ["light"],
    description: "A screen with no base version to compare against.",
    desktop: <AddedCompare viewport="desktop" />,
    id: "design-browse-compare-added",
    mobile: <AddedCompare viewport="mobile" />,
    rationale:
      "A screen absent at the branch point keeps its compare segment; every non-Current mode fills the device screen with the no-base placeholder pane instead of inventing an empty base document.",
    slug: "added",
    title: "No base version",
  }),
  screen({
    colorSchemes: ["light"],
    description: "The dark scheme compared in overlay mode.",
    desktop: <DarkCompare viewport="desktop" />,
    id: "design-browse-compare-dark-scheme",
    mobile: <DarkCompare viewport="mobile" />,
    rationale:
      "The selected scheme reaches both compared documents: dark overlay composes the dark base under the dark head inside dark device screens while the compare segment and every other shell surface stay light. On the narrow artboard the head-band controls stack in compare, viewport, scheme order.",
    slug: "dark-scheme",
    title: "Dark scheme compare",
  }),
];
