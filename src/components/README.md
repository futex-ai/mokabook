# Registered Components

Use `defineComponent` to give a shared React component its own catalogue page,
saved variants, controls, and recorded usage in screens or other components.
Callers render the returned `Component` and export its `entry` in `mockups`.
Mokly renders that wrapper in the consumer's existing React/provider graph.

```tsx
import { defineComponent } from "@mokly/mokly";

export const action = defineComponent({
  id: "action",
  title: "Action",
  description: "A shared action.",
  route: "components/action.html",
  dependencies: [],
  relatedDocs: [],
  propSchema: {
    kind: "object",
    properties: { label: { schema: { kind: "string" } } },
  },
  controls: { label: { kind: "text", label: "Label", maxLength: 80 } },
  render: (props) => <button>{props.label}</button>,
  variants: [{ id: "default", title: "Default", props: { label: "Continue" } }],
});
export const mockups = [action.entry];
```

Render `<action.Component label="Save" />` in a screen. Give repeated siblings
distinct `moklyInstance` values; stable ids preserve their identity across
edits. Registered children inside another registered component appear in its
Nested components tab. React content belongs in declared `slots`; data belongs
in `propSchema`. The schema infers TypeScript props and validates actual values. Registry preparation
revalidates exported definitions and snapshots component data before rendering,
so malformed or mutated variants and controls produce author diagnostics.

Variants are explicit named examples, never inferred from screenshots or every
combination of controls. Both viewports and every configured scheme are built
for each variant. `MockLink to="action"` opens the default variant; canonical
page URLs use `?variant=default` to select a specific saved example.

Local Serve edits declared text, boolean, number, and primitive preset controls.
Complex props remain inspectable; an adapter can map a primitive preset key to
a complex consumer value. Optional controls distinguish unset from empty text
or null. Reset restores the saved variant; changing variants, routes, or entering
comparisons discards edits. Published catalogues retain saved variants and
inspection with controls read-only.
Background Usage and Changes completion preserves local prop edits and the
current preview. Complete Used by data appears without resetting controls;
per-view inspection continues to use the records from the actual displayed
on-demand document.

Implementation changes belong to the component in Changes. Consuming pages are
listed as affected; their own prop, slot, structure, layout, or explicit resource
changes still count directly. Exact `ownedDependencies` and renderer style or
resource ownership records handle material outside the component's body. Global
or mixed resources remain conservatively attributed. Dependency declarations
and adopting an unrelated component alone do not invent a visible screen change.
Historical Mokabook comparisons preserve the original document coordinates when
applying recorded style ownership; internal marker renames alone do not create
consumer changes or alter the retained snapshots.

## Development

```sh
npm run build
node --import tsx --test tests/component_*.test.ts
```

- `definition.ts`, `types.ts`: public authoring boundary and inference.
- `props.ts`, `schema.ts`, `codec.ts`: declarative validation and lossless data.
- `collector.ts`, `render.tsx`, `ranges.ts`: actual usage and neutral ranges.
- `comparison_projection.ts`: caller versus implementation material.
- `../server/controls`: supervised local rendering and transient storage.
- `../client/workspace.ts`: shared saved-view explorer and inspector.

See the [registered component contract](../../docs/protocol/mokly-components.md),
[manifest](../../docs/protocol/mokly-component-manifest.md),
[change attribution](../../docs/protocol/mokly-component-changes.md), and
[local controls](../../docs/protocol/mokly-component-controls.md).
