import { DESTINATIONS, type DesignDestination } from "./destinations.js";
import { MiniWelcome } from "./mini_screens.js";
import { NavTree, type NavNode } from "./nav.js";
import { BrowserFrame, PhoneFrame } from "./stage.js";

/** Comparison classification states depicted by the design mockups. */
export type ReviewState =
  | "added"
  | "changed"
  | "ignored-only"
  | "removed"
  | "styles-changed"
  | "unchanged";

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

/** Changes holding only the screen its stylesheet evidence keeps. */
export function StyleReviewNav({ welcome }: { welcome: DesignDestination }) {
  return (
    <NavTree
      activeLabel="Welcome"
      changedOnly
      changedCount={1}
      nodes={[
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
          to: welcome,
        },
      ]}
    />
  );
}

/** The depicted Welcome preview each review artboard places on its stage. */
export function WelcomeShot({
  viewport,
  comparison = true,
}: {
  viewport: "desktop" | "mobile";
  comparison?: boolean;
}) {
  return viewport === "desktop" ? (
    <BrowserFrame address="example.test/welcome" expandable={!comparison}>
      <MiniWelcome />
    </BrowserFrame>
  ) : (
    <PhoneFrame small>
      <MiniWelcome compact />
    </PhoneFrame>
  );
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

/** A changed stylesheet whose changed styles reach this screen. */
export function MatchedStyleCard() {
  return (
    <>
      <p>Changes to these files may affect this screen:</p>
      <ul>
        <li>generated/styles.css</li>
      </ul>
      <p>Changed styles that apply to this screen:</p>
      <ul>
        <li>
          <code className="mbk-code">.example-head</code>
        </li>
        <li>
          <code className="mbk-code">main a</code>
        </li>
      </ul>
    </>
  );
}

/** A changed stylesheet whose change can reach anything on the screen. */
export function UnresolvedStyleCard() {
  return (
    <>
      <p>Changes to these files may affect this screen:</p>
      <ul>
        <li>generated/styles.css</li>
      </ul>
      <p>
        This change can apply anywhere on the screen, so the screen stays in
        Changes:
      </p>
      <ul>
        <li>
          <code className="mbk-code">:root</code>
        </li>
      </ul>
    </>
  );
}

/** A changed stylesheet examined for this screen and set aside. */
export function ExcludedStyleCard() {
  return (
    <>
      <p>
        This stylesheet changed, but none of the changed styles apply to this
        screen.
      </p>
      <p>Examined and excluded:</p>
      <ul>
        <li>generated/styles.css</li>
      </ul>
    </>
  );
}
