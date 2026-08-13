import type { ReactNode } from "react";

/** Compare mode depicted as selected in the screen-head segment. */
export type CompareMode = "base" | "current" | "difference" | "overlay";

const MODE_LABELS: readonly { key: CompareMode; label: string }[] = [
  { key: "current", label: "Current" },
  { key: "base", label: "Base" },
  { key: "overlay", label: "Overlay" },
  { key: "difference", label: "Difference" },
];

/** The per-screen compare segment shown beside the viewport control. */
export function CompareSwitch({ active }: { active: CompareMode }) {
  return (
    <span
      className="mbk-seg"
      role="group"
      aria-label="Compare with origin/main"
    >
      {MODE_LABELS.map((option) => (
        <span
          key={option.key}
          className={option.key === active ? "active" : undefined}
        >
          {option.label}
        </span>
      ))}
    </span>
  );
}

interface CompareStackProps {
  children: ReactNode;
  mode: Exclude<CompareMode, "current">;
}

/** The one-cell grid stacking base and head documents in a device screen. */
export function CompareStack({ children, mode }: CompareStackProps) {
  return (
    <div className="mbk-cmp-stack" data-compare={mode}>
      {children}
    </div>
  );
}

/** One document layer inside the compare stack. */
export function CompareDoc({
  children,
  side,
}: {
  children: ReactNode;
  side: "base" | "head";
}) {
  return <div className={`mbk-cmp-doc mbk-cmp-doc--${side}`}>{children}</div>;
}

/** The placeholder filling a device screen when no base version exists. */
export function MissingBase() {
  return (
    <div className="mbk-cmp-missing">
      No base version — this screen is new on this branch.
    </div>
  );
}

/**
 * Illustration of the difference blend: identical regions read near-black
 * while the lines that differ from the base render read bright.
 */
export function DiffScreen({ compact }: { compact?: boolean }) {
  return (
    <div className="mbk-cmp-diffshot">
      <div className="mbk-cmp-diffrow dim">
        {compact ? "Menu" : "Example navigation"}
      </div>
      <div className="mbk-cmp-diffrow bright">
        {compact ? "Welcome" : "Welcome to the Mokabook example"}
      </div>
      <div className="mbk-cmp-diffrow bright small">
        A short introduction now welcomes new readers.
      </div>
      <div className="mbk-cmp-diffrow dim small">Open the details screen</div>
    </div>
  );
}
