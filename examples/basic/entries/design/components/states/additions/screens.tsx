import { collection, screen } from "mokly";

import { ComponentPage } from "../../parts/component_page.js";

export function AddedComponentDesktop() {
  return <ComponentPage state="added" viewport="desktop" />;
}

export function AddedComponentMobile() {
  return <ComponentPage state="added" viewport="mobile" />;
}

export const additionDesigns = collection({
  id: "design-component-additions",
  segment: "additions",
  title: "Additions",
  description: "New components shown in their current saved state.",
  children: [
    screen({
      id: "design-component-added",
      slug: "added",
      title: "Added component",
      colorSchemes: ["light"],
      description:
        "A newly added Badge component with one Changes entry and its current saved preview.",
      desktop: <AddedComponentDesktop />,
      mobile: <AddedComponentMobile />,
    }),
  ],
});
