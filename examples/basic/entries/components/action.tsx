import { Button } from "@firna/ui/button";
import type { CSSProperties } from "react";

import { defineComponent, MockLink } from "@mokly/mokly";

const dependency = "examples/basic/generated/example-components.css";
const noop = (): void => undefined;

export const action = defineComponent({
  id: "example-action",
  title: "Action",
  description: "A shared action with an optional destination and hint.",
  route: "components/action.html",
  dependencies: [dependency, "examples/basic/entries/components/action.tsx"],
  ownedDependencies: [
    dependency,
    "examples/basic/entries/components/action.tsx",
  ],
  relatedDocs: ["examples/basic/README.md"],
  tags: ["forms"],
  propSchema: {
    kind: "object",
    properties: {
      label: { schema: { kind: "string", minLength: 1 } },
      disabled: { schema: { kind: "boolean" }, optional: true },
      tone: { schema: { kind: "enum", values: ["primary", "secondary"] } },
      radius: {
        schema: { kind: "number", minimum: 0, maximum: 32 },
        optional: true,
      },
      destination: {
        schema: { kind: "enum", values: ["details", "welcome"] },
        optional: true,
      },
      hint: { schema: { kind: "string" }, optional: true },
    },
  },
  controls: {
    label: { kind: "text", label: "Label", maxLength: 80 },
    disabled: { kind: "boolean", label: "Disabled" },
    radius: {
      kind: "number",
      label: "Corner radius",
      minimum: 0,
      maximum: 32,
      step: 1,
    },
    tone: {
      kind: "select",
      label: "Emphasis",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
      ],
    },
    hint: { kind: "text", label: "Hint", maxLength: 120 },
  },
  render(props) {
    const button = (
      <Button
        disabled={props.disabled ?? false}
        onPress={noop}
        tone={props.tone}
      >
        {props.label}
      </Button>
    );
    return (
      <div
        className="example-action"
        style={
          props.radius === undefined
            ? undefined
            : ({ "--example-radius": `${props.radius}px` } as CSSProperties)
        }
      >
        {props.destination ? (
          <MockLink
            asChild
            to={
              props.destination === "details"
                ? "example-details"
                : "example-welcome"
            }
            {...(props.destination === "details"
              ? { fragment: "details" }
              : {})}
          >
            {button}
          </MockLink>
        ) : (
          button
        )}
        {props.hint === undefined ? null : (
          <p className="example-action-hint">{props.hint}</p>
        )}
      </div>
    );
  },
  variants: [
    {
      id: "default",
      title: "Default",
      props: {
        label: "Continue",
        tone: "primary",
        radius: 8,
        disabled: false,
        hint: "Continue when you’re ready.",
      },
    },
    {
      id: "disabled",
      title: "Disabled",
      props: { label: "Continue", tone: "primary", radius: 8, disabled: true },
    },
    {
      id: "secondary",
      title: "Secondary",
      props: {
        label: "Go back",
        tone: "secondary",
        radius: 8,
        disabled: false,
      },
    },
  ],
});
