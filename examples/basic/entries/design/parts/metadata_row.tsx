import type { ReactNode } from "react";
import { metadataRow } from "../library/inspector/metadata-row.js";
import { useDesignInstance } from "../library/composition.js";

export function MetaRow({
  children,
  label,
  name,
  presentation = "metadata",
}: {
  children: ReactNode;
  label: string;
  name: string;
  presentation?: "metadata" | "props";
}) {
  return (
    <metadataRow.Component
      moklyInstance={useDesignInstance(name)}
      label={label}
      presentation={presentation}
    >
      {children}
    </metadataRow.Component>
  );
}
