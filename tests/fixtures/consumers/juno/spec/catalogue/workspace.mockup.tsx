import React from "react";

import { defineScreen } from "mokabook";

import { WorkspacePanel } from "../ui/workspace-panel.tsx";

const metadata = {
  dependencies: ["spec/ui/workspace-panel.tsx"],
  description: "A Juno-shaped fixture with unrelated repository roots.",
  navPath: ["Workspace"],
  relatedDocs: ["spec/workspace.md"],
  useCaseIds: [],
};

export const mockups = [
  defineScreen({
    ...metadata,
    desktop: <WorkspacePanel layout="wide" />,
    id: "workspace-overview",
    mobile: <WorkspacePanel layout="compact" />,
    route: "workspace/overview.html",
    title: "Workspace overview",
  }),
];
