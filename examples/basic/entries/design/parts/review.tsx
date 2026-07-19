import type { ReactNode } from "react";

/** Review classification states depicted by the design mockups. */
export type ReviewState = "added" | "changed" | "ignored-only" | "removed";

/** Branch-versus-base indicator shown in the Review shell. */
export function BaseLine() {
  return (
    <p className="mb-baseline">
      <span className="mb-baseline-dot" aria-hidden="true" />
      Comparing this branch with <strong>origin/main</strong>
    </p>
  );
}

interface ChangedRowProps {
  active?: boolean;
  route: string;
  state: Exclude<ReviewState, "ignored-only">;
  title: string;
}

function ChangedRow({ active, route, state, title }: ChangedRowProps) {
  return (
    <li>
      <span className="mb-chg-row" aria-current={active ? "page" : undefined}>
        <span
          className={`mb-chg-dot mb-chg-dot--${state}`}
          aria-hidden="true"
        />
        <span>
          {title}
          <span className="mb-chg-route">{route}</span>
        </span>
      </span>
    </li>
  );
}

interface ReviewNavProps {
  activeTitle?: string;
  withIgnored?: boolean;
  withSharedImpact?: boolean;
}

const CHANGED_ROWS: readonly Omit<ChangedRowProps, "active">[] = [
  { route: "screens/welcome.html", state: "changed", title: "Welcome" },
  { route: "screens/details.html", state: "added", title: "Details" },
  { route: "screens/farewell.html", state: "removed", title: "Farewell" },
];

/** Review navigation listing every screen with a visual difference. */
export function ReviewNav({
  activeTitle,
  withIgnored,
  withSharedImpact,
}: ReviewNavProps) {
  return (
    <nav className="mb-nav" aria-label="Changed screens">
      <h2 className="mb-nav-group">Changed screens</h2>
      <p className="mb-review-nav-total">3 screens differ from origin/main</p>
      <ul>
        {CHANGED_ROWS.map((row) => (
          <ChangedRow
            key={row.title}
            {...row}
            active={row.title === activeTitle}
          />
        ))}
      </ul>
      {withSharedImpact ? <SharedImpactCard /> : null}
      {withIgnored ? <IgnoredImpactCard /> : null}
    </nav>
  );
}

/** Aggregate warning for changes that can affect unchanged screens. */
export function SharedImpactCard() {
  return (
    <section className="mb-impact-card">
      <h3>Shared impact</h3>
      <span className="mb-code">examples/basic/generated/styles.css</span>
      <p>
        2 unchanged screens may still look different because a shared stylesheet
        changed.
      </p>
    </section>
  );
}

/** Aggregate note for differences excluded by Review-ignore regions. */
export function IgnoredImpactCard() {
  return (
    <section className="mb-impact-card">
      <h3>Ignored regions</h3>
      <p className="mb-ignored-note">
        <span className="mb-code">example-nav</span>
        <span className="mb-badge mb-badge--ignored">Ignored</span>
      </p>
      <p>
        Mobile and desktop changes inside this region were excluded from the
        comparison.
      </p>
    </section>
  );
}

interface StatusBadgeProps {
  state: ReviewState;
}

/** Colored classification badge for one compared screen. */
export function StatusBadge({ state }: StatusBadgeProps) {
  return (
    <span className={`mb-badge mb-badge--${badgeVariant(state)}`}>
      {state === "ignored-only" ? "Ignored only" : state}
    </span>
  );
}

function badgeVariant(state: ReviewState): string {
  return state === "ignored-only" ? "ignored" : state;
}

interface CompareToolbarProps {
  mode: "difference" | "overlay" | "side-by-side";
  viewport: "desktop" | "mobile";
}

/** Comparison mode and viewport controls for one compare page. */
export function CompareToolbar({ mode, viewport }: CompareToolbarProps) {
  return (
    <div className="mb-cmp-toolbar">
      <span className="mb-viewswitch" role="group" aria-label="Comparison mode">
        {(["side-by-side", "overlay", "difference"] as const).map((option) => (
          <span
            key={option}
            className="mb-viewswitch-option"
            aria-pressed={option === mode ? "true" : "false"}
          >
            {option === "side-by-side"
              ? "Side by side"
              : option === "overlay"
                ? "Overlay"
                : "Difference"}
          </span>
        ))}
      </span>
      <span className="mb-viewswitch" role="group" aria-label="Viewport">
        {(["mobile", "desktop"] as const).map((option) => (
          <span
            key={option}
            className="mb-viewswitch-option"
            aria-pressed={option === viewport ? "true" : "false"}
          >
            {option === "mobile" ? "Mobile" : "Desktop"}
          </span>
        ))}
      </span>
    </div>
  );
}

interface PaneProps {
  children: ReactNode;
  label: string;
  tone?: "added" | "neutral" | "removed";
}

/** One labeled before or after comparison pane. */
export function Pane({ children, label, tone = "neutral" }: PaneProps) {
  const toneClass = tone === "neutral" ? "" : ` mb-pane-doc--${tone}`;
  return (
    <div className="mb-pane">
      <p className="mb-pane-label">{label}</p>
      <div className={`mb-pane-doc${toneClass}`}>{children}</div>
    </div>
  );
}

interface MissingPaneProps {
  label: string;
  message: string;
}

/** Placeholder pane for a screen absent on one side. */
export function MissingPane({ label, message }: MissingPaneProps) {
  return (
    <div className="mb-pane">
      <p className="mb-pane-label">{label}</p>
      <div className="mb-pane-missing">{message}</div>
    </div>
  );
}

/** Legend for tinted difference regions. */
export function DiffLegend() {
  return (
    <p className="mb-diff-legend">
      <span>
        <span
          className="mb-diff-swatch"
          style={{ background: "var(--mb-changed-soft)" }}
          aria-hidden="true"
        />
        Changed
      </span>
      <span>
        <span
          className="mb-diff-swatch"
          style={{ background: "var(--mb-added-soft)" }}
          aria-hidden="true"
        />
        Added
      </span>
    </p>
  );
}
