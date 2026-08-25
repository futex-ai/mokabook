import React from "react";

import { defineCollection, defineScreen } from "mokabook";

import { WorkspacePanel } from "../ui/workspace-panel.tsx";

const metadata = {
  dependencies: ["spec/ui/workspace-panel.tsx"],
  description: "A Juno-shaped fixture with unrelated repository roots.",
  relatedDocs: ["spec/workspace.md"],
  useCaseIds: [],
};

export const mockups = [
  defineCollection({
    dependencies: metadata.dependencies,
    childIds: ["workspace-overview"],
    description: "Workspace screens.",
    id: "workspace",
    relatedDocs: metadata.relatedDocs,
    title: "Workspace",
  }),
  defineScreen({
    ...metadata,
    desktop: <WorkspacePanel layout="wide" />,
    id: "workspace-overview",
    mobile: <WorkspacePanel layout="compact" />,
    route: "workspace/overview.html",
    title: "Workspace overview",
  }),
];
