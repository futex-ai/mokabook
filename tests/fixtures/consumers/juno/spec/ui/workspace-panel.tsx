import React from "react";

export function WorkspacePanel({ layout }: { layout: "compact" | "wide" }) {
  return (
    <main data-juno-layout={layout}>
      <h1>Workspace overview</h1>
      <p>The fixture uses its own component and directory structure.</p>
    </main>
  );
}
