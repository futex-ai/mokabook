import { DESTINATIONS } from "./destinations.js";
import { COMPONENT_PAGES } from "../components/parts/destinations.js";
import type { CatalogueNavigationProps } from "../library/chrome/catalogue-navigation.js";

export const NAV_TREE = [
  {
    key: "example",
    count: 4,
    depth: 0,
    kind: "collection",
    label: "Example",
    open: true,
  },
  {
    key: "screens",
    count: 2,
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
    to: DESTINATIONS.welcome,
  },
  {
    key: "details",
    depth: 2,
    kind: "screen",
    label: "Details",
    to: DESTINATIONS.details,
  },
  {
    key: "example-tour",
    depth: 1,
    kind: "flow",
    label: "Example tour",
    to: DESTINATIONS.tour,
  },
  {
    key: "example-components",
    count: 2,
    depth: 1,
    kind: "collection",
    label: "Components",
    open: true,
  },
  {
    key: "action",
    depth: 2,
    kind: "component",
    label: "Action",
    to: COMPONENT_PAGES.default,
  },
  {
    key: "toolbar",
    depth: 2,
    kind: "component",
    label: "Toolbar",
    to: COMPONENT_PAGES.toolbar,
  },
  {
    key: "design",
    count: 2,
    depth: 0,
    kind: "collection",
    label: "Design",
    open: true,
  },
  { key: "browse-shell", depth: 1, kind: "collection", label: "Browse shell" },
  { key: "changes", depth: 1, kind: "collection", label: "Changes" },
] as const satisfies CatalogueNavigationProps["rows"];
