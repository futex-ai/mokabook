import { defineComponent, type ComponentProps } from "mokabook";
import { libraryMetadata } from "../metadata.js";
import { destination, flag, optionalText, text } from "../schemas.js";
import { CatalogueNavigationView } from "./catalogue-navigation.view.js";

const propSchema = {
  kind: "object",
  properties: {
    rows: {
      schema: {
        kind: "array",
        items: {
          kind: "object",
          properties: {
            key: text,
            label: text,
            kind: {
              schema: {
                kind: "enum",
                values: ["collection", "screen", "component", "flow", "page"],
              },
            },
            depth: { schema: { kind: "number", minimum: 0, integer: true } },
            count: {
              schema: { kind: "number", minimum: 0, integer: true },
              optional: true,
            },
            open: { ...flag, optional: true },
            to: destination,
          },
        },
      },
    },
    activeDestination: destination,
    activeLabel: optionalText,
    changedCount: { schema: { kind: "number", minimum: 0, integer: true } },
    changedOnly: flag,
    changesStatus: {
      schema: {
        kind: "enum",
        values: ["ready", "pending", "preparing", "unavailable"],
      },
      optional: true,
    },
    showChanges: { ...flag, optional: true },
    presentation: {
      schema: { kind: "enum", values: ["responsive", "drawer"] },
    },
    allDestination: destination,
    changesDestination: destination,
  },
} as const;
export type CatalogueNavigationProps = ComponentProps<typeof propSchema, []>;
const rows = [
  {
    key: "screens",
    kind: "collection",
    depth: 0,
    label: "Screens",
    count: 2,
    open: true,
  },
  {
    key: "welcome",
    kind: "screen",
    depth: 1,
    label: "Welcome",
    to: "design-browse-screen",
  },
  {
    key: "details",
    kind: "screen",
    depth: 1,
    label: "Details",
    to: "design-browse-details-screen",
  },
] as const;
const sample = {
  rows,
  activeDestination: "design-browse-screen",
  changedCount: 1,
  changedOnly: false,
  presentation: "responsive",
  allDestination: "design-browse-screen",
  changesDestination: "design-changes-current",
} as const;
export const catalogueNavigation = defineComponent({
  ...libraryMetadata(
    "chrome",
    "catalogue-navigation",
    "Catalogue navigation",
    "The catalogue tree and its All or Changes filter.",
  ),
  propSchema,
  controls: {
    changedOnly: { kind: "boolean", label: "Changes only" },
    changesStatus: {
      kind: "select",
      label: "Changes availability",
      options: [
        { label: "Ready", value: "ready" },
        { label: "Checking", value: "pending" },
        { label: "Preparing", value: "preparing" },
        { label: "Unavailable", value: "unavailable" },
      ],
    },
    presentation: {
      kind: "select",
      label: "Presentation",
      options: [
        { label: "Responsive", value: "responsive" },
        { label: "Drawer", value: "drawer" },
      ],
    },
  },
  render: (props, context) => (
    <CatalogueNavigationView {...props} viewport={context.viewport} />
  ),
  variants: [
    { id: "all", title: "All entries", props: sample },
    {
      id: "changes",
      title: "Changes",
      props: { ...sample, changedOnly: true, rows: rows.slice(0, 2) },
    },
    {
      id: "empty",
      title: "Empty",
      props: { ...sample, rows: [], changedCount: 0, changedOnly: true },
    },
    {
      id: "drawer",
      title: "Drawer",
      props: { ...sample, presentation: "drawer" },
    },
    {
      id: "loading",
      title: "Checking for changes",
      props: { ...sample, changedOnly: true, changesStatus: "pending" },
    },
    {
      id: "preparing",
      title: "Preparing comparison",
      props: { ...sample, changedOnly: true, changesStatus: "preparing" },
    },
    {
      id: "unavailable",
      title: "Changes unavailable",
      props: { ...sample, changedOnly: true, changesStatus: "unavailable" },
    },
  ],
});
