import { defineComponent, MockLink, type ComponentProps } from "mokly";
import { libraryMetadata } from "../metadata.js";
import { text } from "../schemas.js";
import { tagChip } from "../controls/tag-chip.js";
import { MetadataRowView } from "./metadata-row.view.js";

const propSchema = {
  kind: "object",
  properties: {
    label: text,
    presentation: { schema: { kind: "enum", values: ["metadata", "props"] } },
  },
} as const;
const slots = ["children"] as const;
export type MetadataRowProps = ComponentProps<typeof propSchema, typeof slots>;
export const metadataRow = defineComponent({
  ...libraryMetadata(
    "inspector",
    "metadata-row",
    "Metadata row",
    "A labelled value in the details or props panel.",
  ),
  propSchema,
  slots,
  controls: { label: { kind: "text", label: "Label" } },
  render: MetadataRowView,
  variants: [
    {
      id: "text",
      title: "Text",
      props: {
        label: "Schemes",
        presentation: "metadata",
        children: "Light, Dark",
      },
    },
    {
      id: "code",
      title: "Code",
      props: {
        label: "label",
        presentation: "props",
        children: <code>Continue</code>,
      },
    },
    {
      id: "linked",
      title: "Linked",
      props: {
        label: "Used by",
        presentation: "metadata",
        children: <MockLink to="design-browse-use-case">Example tour</MockLink>,
      },
    },
    {
      id: "tags",
      title: "Tags",
      props: {
        label: "Tags",
        presentation: "metadata",
        children: (
          <span className="mbk-chips">
            <tagChip.Component id="forms" label="forms" selected={false} />
          </span>
        ),
      },
    },
  ],
});
