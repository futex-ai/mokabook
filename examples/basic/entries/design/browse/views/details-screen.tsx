import { screen } from "@mokly/mokly";

import { DESTINATIONS } from "../../parts/destinations.js";
import { ExampleWorkspace } from "../../parts/example_workspace.js";
import { NavTree } from "../../parts/nav.js";
import { ScreenHead, Shell, ViewSwitch } from "../../parts/shell.js";

function DetailsHead({ mobile = false }: { mobile?: boolean }) {
  return (
    <ScreenHead
      action={<ViewSwitch active={mobile ? "mobile" : "both"} />}
      crumbs={["Example", "Screens"]}
      idChip="example-details"
      title="Details"
    />
  );
}

/** Normal light Details, with both framed fragments and a closed inspector. */
export function DetailsScreenDesktop() {
  return (
    <Shell
      design={DESTINATIONS.details}
      viewport="desktop"
      nav={<NavTree activeLabel="Details" />}
    >
      <DetailsHead />
      <ExampleWorkspace subject="details" viewport="desktop" />
    </Shell>
  );
}

/** Narrow counterpart of the normal light Details destination. */
export function DetailsScreenMobile() {
  return (
    <Shell design={DESTINATIONS.details} viewport="mobile" nav={null}>
      <DetailsHead mobile />
      <ExampleWorkspace subject="details" viewport="mobile" />
    </Shell>
  );
}

export const detailsScreen = screen({
  colorSchemes: ["light"],
  description:
    "The normal Details screen with light selected and its inspector closed.",
  desktop: <DetailsScreenDesktop />,
  id: "design-browse-details-screen",
  mobile: <DetailsScreenMobile />,
  slug: "details-screen",
  title: "Details screen",
});
