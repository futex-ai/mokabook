import { DESTINATIONS } from "./destinations.js";
import { NavDrawer, NavTree, type ChangesStatus, type NavNode } from "./nav.js";

/** Comparison classification states depicted by the design mockups. */
export type ReviewState =
  "added" | "changed" | "ignored-only" | "removed" | "unchanged";

const CHANGED_NODES: readonly NavNode[] = [
  {
    key: "example",
    depth: 0,
    kind: "collection",
    label: "Example",
    open: true,
  },
  {
    key: "screens",
    depth: 1,
    kind: "collection",
    label: "Screens",
    open: true,
  },
  {
    key: "welcome",
    depth: 2,
    kind: "screen",
    label: "Welcome",
    to: DESTINATIONS.current,
  },
  {
    key: "details",
    depth: 2,
    kind: "screen",
    label: "Details",
    to: DESTINATIONS.added,
  },
  {
    key: "farewell-removed",
    depth: 0,
    kind: "screen",
    label: "Farewell · Removed",
    to: DESTINATIONS.removed,
  },
];

/** Changes uses the same catalogue navigation and filter as All. */
export function ReviewNav({
  activeTitle,
}: {
  activeTitle?: string | undefined;
}) {
  return (
    <NavTree
      activeLabel={
        activeTitle === "Farewell" ? "Farewell · Removed" : activeTitle
      }
      changedOnly
      nodes={CHANGED_NODES}
    />
  );
}

/** Empty Changes retains the catalogue filter. */
export function EmptyReviewNav() {
  return <NavTree changedOnly changedCount={0} nodes={[]} />;
}

/** Changes keeps its tabs and origin while a comparison is not yet usable. */
export function AvailabilityNav({
  drawer = false,
  status,
}: {
  drawer?: boolean;
  status: ChangesStatus;
}) {
  const props = { changedOnly: true, changesStatus: status, nodes: [] };
  return drawer ? <NavDrawer {...props} /> : <NavTree {...props} />;
}

/** File evidence belongs in the secondary comparison details. */
export function SharedImpactCard() {
  return (
    <>
      <p>Changes to these files may affect this screen:</p>
      <ul>
        <li>generated/styles.css</li>
      </ul>
    </>
  );
}

/** Content exclusions belong in the secondary comparison details. */
export function IgnoredImpactCard() {
  return <p>Excluded content: example-nav.</p>;
}
