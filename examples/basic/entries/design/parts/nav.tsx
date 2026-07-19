interface NavLeaf {
  active?: boolean;
  icon: "flow" | "folder" | "screen";
  label: string;
  nested?: readonly NavLeaf[];
}

const CATALOGUE_TREE: readonly {
  group: string;
  rows: readonly NavLeaf[];
}[] = [
  {
    group: "Example",
    rows: [
      {
        icon: "folder",
        label: "Screens",
        nested: [
          { icon: "screen", label: "Welcome" },
          { icon: "screen", label: "Details" },
        ],
      },
      { icon: "flow", label: "Example tour" },
    ],
  },
  {
    group: "Design",
    rows: [
      {
        icon: "folder",
        label: "Mokabook design",
        nested: [
          { icon: "folder", label: "Browse shell" },
          { icon: "folder", label: "Review" },
        ],
      },
    ],
  },
];

const ICONS = { flow: "➔", folder: "▸", screen: "▢" } as const;

function markActive(rows: readonly NavLeaf[], label: string): NavLeaf[] {
  return rows.map((row) => ({
    ...row,
    active: row.label === label,
    ...(row.nested ? { nested: markActive(row.nested, label) } : {}),
  }));
}

function NavRows({ rows }: { rows: readonly NavLeaf[] }) {
  return (
    <ul>
      {rows.map((row) => (
        <li key={row.label}>
          <span
            className="mb-nav-row"
            aria-current={row.active ? "page" : undefined}
          >
            <span className="mb-caret" aria-hidden="true">
              {ICONS[row.icon]}
            </span>
            {row.label}
          </span>
          {row.nested ? <NavRows rows={row.nested} /> : null}
        </li>
      ))}
    </ul>
  );
}

interface NavTreeProps {
  activeLabel?: string | undefined;
}

function CatalogueRows({ activeLabel }: NavTreeProps) {
  return (
    <>
      {CATALOGUE_TREE.map((section) => (
        <section key={section.group}>
          <h2 className="mb-nav-group">{section.group}</h2>
          <NavRows
            rows={
              activeLabel ? markActive(section.rows, activeLabel) : section.rows
            }
          />
        </section>
      ))}
    </>
  );
}

/** Persistent desktop catalogue navigation. */
export function NavTree({ activeLabel }: NavTreeProps) {
  return (
    <nav className="mb-nav" aria-label="Catalogue">
      <CatalogueRows activeLabel={activeLabel} />
    </nav>
  );
}

/** Mobile catalogue navigation drawer, shown open. */
export function NavDrawer({ activeLabel }: NavTreeProps) {
  return (
    <nav className="mb-nav mb-drawer" aria-label="Catalogue">
      <CatalogueRows activeLabel={activeLabel} />
    </nav>
  );
}
