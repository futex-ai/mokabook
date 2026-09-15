import { createRef } from "react";

import { MoklyViewer, sameOriginAdapter } from "@mokly/viewer";
import type {
  CatalogueReadModel,
  MoklyViewerHandle,
  ViewerSelection,
} from "@mokly/viewer";
import { renderViewer } from "@mokly/viewer/server";

export function ViewerConsumer({
  catalogue,
  selection,
  onSelectionChange,
}: {
  catalogue: CatalogueReadModel;
  selection: ViewerSelection;
  onSelectionChange: (selection: ViewerSelection) => void;
}) {
  const handle = createRef<MoklyViewerHandle>();
  renderViewer({ catalogue, baseUrl: "https://artifact.example", selection });
  return (
    <MoklyViewer
      ref={handle}
      catalogue={catalogue}
      baseUrl="https://artifact.example"
      selection={selection}
      onSelectionChange={onSelectionChange}
      frameAdapter={sameOriginAdapter()}
      slots={{
        sidePanel: { content: <p>Discussion</p>, width: 240 },
        stageOverlay: {
          content: <span>Annotation</span>,
          pointerEvents: "none",
        },
      }}
    />
  );
}
