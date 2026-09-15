import { defineComponent } from "@mokly/mokly";

import { action } from "./action.js";

const dependency = "examples/basic/generated/example-components.css";
export const toolbar = defineComponent({
  id: "example-toolbar",
  title: "Toolbar",
  description: "A composed toolbar with caller-supplied content.",
  route: "components/toolbar.html",
  dependencies: [dependency, "examples/basic/entries/components/toolbar.tsx"],
  ownedDependencies: [
    dependency,
    "examples/basic/entries/components/toolbar.tsx",
  ],
  relatedDocs: ["examples/basic/README.md"],
  propSchema: {
    kind: "object",
    properties: { title: { schema: { kind: "string", minLength: 1 } } },
  },
  controls: { title: { kind: "text", label: "Title", maxLength: 80 } },
  slots: ["children"],
  render: (props) => (
    <section className="example-toolbar">
      <h2>{props.title}</h2>
      <div>{props.children}</div>
      <div className="example-toolbar-actions">
        <action.Component
          moklyInstance="primary"
          label="Browse details"
          tone="primary"
          destination="details"
        />
        <action.Component
          moklyInstance="secondary"
          label="Browse welcome"
          tone="secondary"
          destination="welcome"
        />
      </div>
    </section>
  ),
  variants: [
    {
      id: "default",
      title: "Default",
      props: {
        title: "Workspace actions",
        children: <p>Choose where to continue.</p>,
      },
    },
  ],
});
