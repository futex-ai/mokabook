import {
  defineComponent,
  type ComponentControl,
  type ComponentProps,
  type DataPropSchema,
  type RenderResult,
} from "@mokly/mokly";

const schema = {
  kind: "object",
  properties: {
    label: { schema: { kind: "string" } },
    amount: { schema: { kind: "number" }, optional: true },
  },
} as const;
const component = defineComponent({
  id: "typed-component",
  title: "Typed component",
  description: "Packed declaration inference.",
  route: "components/typed.html",
  dependencies: [],
  relatedDocs: [],
  propSchema: schema,
  slots: ["children"],
  controls: { label: { kind: "text" }, amount: { kind: "number", minimum: 0 } },
  render: (props, context) => (
    <div data-viewport={context.viewport}>
      {props.label}
      {props.amount}
      {props.children}
    </div>
  ),
  variants: [
    {
      id: "default",
      title: "Default",
      props: { label: "Continue", children: <strong>Slot</strong> },
    },
  ],
});
const valid = <component.Component label="Valid" moklyInstance="first" />;
// @ts-expect-error The declared label remains required.
const missing = <component.Component amount={1} />;
// @ts-expect-error Numeric props reject strings in consumer code.
const wrong = <component.Component label="Invalid" amount="one" />;
const props: ComponentProps<typeof schema, readonly ["children"]> = {
  label: "Typed",
};
const data: DataPropSchema = schema;
const control: ComponentControl = { kind: "number", step: 1 };
const result: RenderResult = { html: "<html><body>Typed</body></html>" };
void [valid, missing, wrong, props, data, control, result];
