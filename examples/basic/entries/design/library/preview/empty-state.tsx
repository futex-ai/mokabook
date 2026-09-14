import { defineComponent, type ComponentProps } from "mokabook";

import { libraryMetadata } from "../metadata.js";
import { destination, optionalText, text } from "../schemas.js";
import { EmptyStateView } from "./empty-state.view.js";
import { DESTINATIONS } from "../../parts/destinations.js";

const propSchema = {
  kind: "object",
  properties: {
    title: text,
    body: text,
    code: optionalText,
    actionLabel: optionalText,
    destination,
  },
} as const;
export type EmptyStateProps = ComponentProps<typeof propSchema, []>;
export const emptyState = defineComponent({
  ...libraryMetadata(
    "preview",
    "empty-state",
    "Empty state",
    "Guidance when there is no screen or comparison to display.",
  ),
  propSchema,
  controls: {
    title: { kind: "text", label: "Title" },
    body: { kind: "text", label: "Description" },
    actionLabel: { kind: "text", label: "Action label" },
  },
  render: EmptyStateView,
  variants: [
    {
      id: "home",
      title: "Catalogue home",
      props: {
        title: "Mokabook",
        body: "Browse the mockup catalogue generated from this repository.",
        actionLabel: "Open the first screen",
        destination: DESTINATIONS.welcome,
      },
    },
    {
      id: "missing-route",
      title: "Missing screen",
      props: {
        title: "Screen not found",
        body: "Nothing in the catalogue matches",
        code: "view/screens/unknown.html",
        actionLabel: "Go to the catalogue home",
        destination: DESTINATIONS.home,
      },
    },
    {
      id: "no-changes",
      title: "No changes",
      props: {
        title: "No changed screens",
        body: "Your screens match the comparison baseline.",
        actionLabel: "Browse all screens →",
        destination: DESTINATIONS.welcome,
      },
    },
  ],
});
