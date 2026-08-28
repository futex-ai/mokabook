import { screen } from "mokabook";

import { WelcomeHead } from "./browse_screens.js";
import { DetailsPanel } from "./parts/details.js";
import { NavDrawer, NavTree, type NavNode } from "./parts/nav.js";
import { Shell } from "./parts/shell.js";
import { BrowserFrame, MiniWelcome, PhoneFrame, Stage } from "./parts/stage.js";

/** The query the depicted tag chip entered in the search field. */
const TAG_QUERY = "tag:forms";

/**
 * Rows the query keeps: entries without the tag and the groups they empty drop
 * out, and the groups that keep a row stay open.
 */
const TAGGED_TREE: readonly NavNode[] = [
  { count: 3, depth: 0, kind: "collection", label: "Example", open: true },
  { count: 2, depth: 1, kind: "collection", label: "Screens", open: true },
  { depth: 2, kind: "screen", label: "Welcome" },
  { depth: 2, kind: "screen", label: "Details" },
];

function TagFilterDesktop() {
  return (
    <Shell
      mode="browse"
      viewport="desktop"
      nav={<NavTree activeLabel="Welcome" nodes={TAGGED_TREE} />}
      searchValue={TAG_QUERY}
    >
      <WelcomeHead active="desktop" />
      <Stage>
        <BrowserFrame address="example.test/welcome" label="Desktop">
          <MiniWelcome />
        </BrowserFrame>
      </Stage>
      <DetailsPanel activeTag="forms" open />
    </Shell>
  );
}

function TagFilterMobile() {
  return (
    <Shell
      mode="browse"
      viewport="mobile"
      nav={null}
      aside={<NavDrawer activeLabel="Welcome" nodes={TAGGED_TREE} />}
      searchValue={TAG_QUERY}
    >
      <WelcomeHead active="mobile" />
      <Stage>
        <PhoneFrame label="Mobile" small>
          <MiniWelcome compact />
        </PhoneFrame>
      </Stage>
    </Shell>
  );
}

/** Browse shell design screen for tag filtering through the search field. */
export const browseTagScreens = [
  screen({
    colorSchemes: ["light"],
    description:
      "A selected tag chip filtering the catalogue tree through the search field.",
    desktop: <TagFilterDesktop />,
    id: "design-browse-tag-filter",
    mobile: <TagFilterMobile />,
    rationale:
      "Tag filtering reuses the search field rather than adding a second top-level control: selecting a tag chip in the details inspector enters that tag as a search term, so the active filter stays visible and clearable where a reader already looks for one, and it still composes with the All/Changed filter. Rows without the tag and the groups they leave empty drop out of the tree, and the chip for the entered term reads in the accent, so the chip, the query, and the filtered tree describe a single state.",
    slug: "tag-filter",
    title: "Tag filter",
  }),
];
