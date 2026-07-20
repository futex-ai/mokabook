/** Review classification states depicted by the design mockups. */
export type ReviewState = "added" | "changed" | "ignored-only" | "removed";

interface ChangedRowProps {
  active?: boolean;
  note: string;
  path: string;
  state: "added" | "changed" | "impacted" | "removed";
  title: string;
}

function ChangedRow({ active, note, path, state, title }: ChangedRowProps) {
  return (
    <span
      className={active ? "mbk-chg-row active" : "mbk-chg-row"}
      aria-current={active ? "page" : undefined}
    >
      <span className={`mbk-chg-dot ${state}`} aria-hidden="true" />
      <span className="mbk-chg-text">
        <strong>{title}</strong>
        <span>{path}</span>
      </span>
      <span className="mbk-chg-note">{note}</span>
    </span>
  );
}

const CHANGED_GROUPS: readonly {
  label: string;
  rows: readonly Omit<ChangedRowProps, "active">[];
  state: "added" | "changed" | "removed";
}[] = [
  {
    label: "Changed",
    rows: [
      {
        note: "Copy changed",
        path: "Example · Screens",
        state: "changed",
        title: "Welcome",
      },
    ],
    state: "changed",
  },
  {
    label: "Added",
    rows: [
      {
        note: "New screen",
        path: "Example · Screens",
        state: "added",
        title: "Details",
      },
    ],
    state: "added",
  },
  {
    label: "Removed",
    rows: [
      {
        note: "Retired",
        path: "Example · Screens",
        state: "removed",
        title: "Farewell",
      },
    ],
    state: "removed",
  },
];

interface ReviewNavProps {
  activeTitle?: string | undefined;
  withIgnored?: boolean;
  withSharedImpact?: boolean;
}

/** Review navigation listing every screen with a visual difference. */
export function ReviewNav({
  activeTitle,
  withIgnored,
  withSharedImpact,
}: ReviewNavProps) {
  return (
    <nav className="mbk-nav" aria-label="Changed screens">
      <div className="mbk-nav-head">
        Changed screens<span className="mbk-nav-total">3</span>
      </div>
      <div className="mbk-nav-scroll">
        {CHANGED_GROUPS.map((group) => (
          <div className="mbk-chg-group" key={group.state}>
            <p className="mbk-chg-grouphead">
              <span
                className={`mbk-chg-dot ${group.state}`}
                aria-hidden="true"
              />
              {group.label}
              <span className="mbk-chg-count">{group.rows.length}</span>
            </p>
            {group.rows.map((row) => (
              <ChangedRow
                key={row.title}
                {...row}
                active={row.title === activeTitle}
              />
            ))}
          </div>
        ))}
        {withSharedImpact ? <SharedImpactCard /> : null}
        {withIgnored ? <IgnoredImpactCard /> : null}
      </div>
    </nav>
  );
}

/** The Review navigation when no screen differs from the base. */
export function EmptyReviewNav() {
  return (
    <nav className="mbk-nav" aria-label="Changed screens">
      <div className="mbk-nav-head">
        Changed screens<span className="mbk-nav-total">0</span>
      </div>
      <div className="mbk-nav-scroll">
        <p className="mbk-chg-more">No screens differ from origin/main.</p>
      </div>
    </nav>
  );
}

/** Byte-identical screens that still need inspection because an input changed. */
export function ImpactedScreens() {
  return (
    <div className="mbk-impact-list">
      <p className="mbk-chg-grouphead">
        <span className="mbk-chg-dot impacted" aria-hidden="true" />
        Impacted
        <span className="mbk-chg-count">2</span>
      </p>
      <ChangedRow
        note="Inspect"
        path="Example · Screens"
        state="impacted"
        title="Profile"
      />
      <ChangedRow
        note="Inspect"
        path="Example · Screens"
        state="impacted"
        title="Settings"
      />
    </div>
  );
}

/** Aggregate warning for changes that can affect unchanged screens. */
export function SharedImpactCard() {
  return (
    <div className="mbk-chg-shared">
      <strong>Shared impact</strong>
      <p>
        2 impacted screens may still look different because a shared stylesheet
        changed.
      </p>
      <code className="mbk-code">generated/styles.css</code>
      <span className="mbk-chg-shared-link">Review all →</span>
    </div>
  );
}

/** Aggregate note for differences excluded by Review-ignore regions. */
export function IgnoredImpactCard() {
  return (
    <div className="mbk-chg-shared">
      <div className="mbk-chg-ignored-head">
        <code className="mbk-code">example-nav</code>
        <span>Ignored</span>
      </div>
      <p>
        Mobile and desktop changes inside this region were excluded from the
        comparison.
      </p>
    </div>
  );
}

const STATUS_LABELS: Record<ReviewState, string> = {
  added: "Added",
  changed: "Changed",
  "ignored-only": "Ignored only",
  removed: "Removed",
};

/** Colored classification badge for one compared screen. */
export function StatusBadge({ state }: { state: ReviewState }) {
  const variant = state === "ignored-only" ? "ignored" : state;
  return (
    <span className={`mbk-status ${variant}`}>{STATUS_LABELS[state]}</span>
  );
}
