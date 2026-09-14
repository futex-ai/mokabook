import type { ReactNode } from "react";

import { PreviewWorkspace } from "../components/parts/workspace.js";
import { ComparisonStage } from "./compare.js";
import type { DesignDestination } from "./destinations.js";
import { DetailsPanel } from "./details.js";
import { ReviewNav, type ReviewState } from "./review.js";
import { ScreenHead, Shell, ViewSwitch } from "./shell.js";
import { BrowserFrame, PhoneFrame } from "./stage.js";
import type { ScreenSubject } from "./subjects.js";

export type CompareViewport = "desktop" | "mobile";

interface ComparePageProps {
  design: DesignDestination;
  subject: ScreenSubject;
  activeTitle: string;
  render: (viewport: CompareViewport) => ReactNode;
  idChip: string;
  mode?: "difference" | "overlay" | "side-by-side";
  state: ReviewState;
  title: string;
  viewport: CompareViewport;
}

export function ComparePage({
  design,
  activeTitle,
  subject,
  render,
  idChip,
  mode,
  state,
  title,
  viewport,
}: ComparePageProps) {
  return (
    <Shell
      design={design}
      viewport={viewport}
      nav={
        viewport === "desktop" ? <ReviewNav activeTitle={activeTitle} /> : null
      }
    >
      <ScreenHead
        comparisons={
          state === "added" || state === "changed" || state === "removed"
        }
        action={<ViewSwitch active={viewport} />}
        comparisonMode={mode ?? "side-by-side"}
        crumbs={["Example", "Screens"]}
        idChip={idChip}
        title={title}
      />
      <PreviewWorkspace
        stage={false}
        inspector={<DetailsPanel subject={subject} comparisonEvidence open />}
        render={(previewViewport) => (
          <ComparisonStage state={state} viewport={previewViewport}>
            {render(previewViewport)}
          </ComparisonStage>
        )}
      />
    </Shell>
  );
}

export function FramedShot({
  address,
  children,
  dark,
  viewport,
}: {
  address: string;
  children: ReactNode;
  dark?: boolean;
  viewport: CompareViewport;
}) {
  if (viewport === "desktop") {
    return (
      <BrowserFrame address={address} dark={dark} expandable={false}>
        {children}
      </BrowserFrame>
    );
  }
  return (
    <PhoneFrame dark={dark} small>
      {children}
    </PhoneFrame>
  );
}
