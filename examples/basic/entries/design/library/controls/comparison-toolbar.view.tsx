import { SelectionControl } from "../../parts/selection_control.js";
import { useDesignStyle } from "../style_context.js";

import type { ComparisonToolbarProps } from "./comparison-toolbar.js";

const modes = [
  ["current", "Current"],
  ["side-by-side", "Side by side"],
  ["overlay", "Overlay"],
  ["difference", "Difference"],
] as const;
export function ComparisonToolbarView({
  mode,
  eligible,
  accessible,
  destinations,
}: ComparisonToolbarProps) {
  useDesignStyle("comparison-toolbar", eligible);
  if (!eligible) return null;
  return (
    <div className="mbk-cmp-toolbar">
      <span className="mbk-seg" role="group" aria-label="Comparison mode">
        {modes.map(([key, label]) => (
          <SelectionControl
            key={key}
            accessible={accessible}
            active={key === mode}
            label={label}
            to={key === mode ? undefined : destinations[key]}
          />
        ))}
      </span>
      {mode !== "current" ? (
        <span className="mbk-cmp-refresh" aria-label="Refresh comparison">
          ↻
        </span>
      ) : null}
    </div>
  );
}
