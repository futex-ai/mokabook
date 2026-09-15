import assert from "node:assert/strict";
import test from "node:test";

import { generatedViews } from "../dist/components/views.js";

import { designLibraryFixture } from "./helpers/design_library_fixture.js";

test("mixed component design styles retain their actual rendered resource scope", async (t) => {
  const fixture = await designLibraryFixture(t);
  for (const [stylesheet, screens, components] of [
    ["design-components.css", 32, 15],
    ["design-component-inspection.css", 32, 15],
    ["design-component-details.css", 32, 15],
    ["design-component-inspector.css", 64, 15],
    ["design-component-workspace.css", 64, 15],
    ["design-component-view.css", 32, 15],
    ["design-component-controls.css", 11, 15],
    ["design.css", 64, 15],
    ["design-library.css", 0, 15],
  ] as const)
    await t.test(stylesheet, async () => {
      await fixture.reset();
      await fixture.edit(
        `examples/basic/generated/${stylesheet}`,
        (source) => source + "\n.layout-regression { gap: 17px; }\n",
      );
      const expected = fixture.before.manifest.entries.filter((entry) =>
        generatedViews(entry).some((view) =>
          fixture.before.outputs.get(view.path)!.includes(`/${stylesheet}"`),
        ),
      );
      assert.equal(
        expected.filter((entry) => entry.kind === "screen").length,
        screens,
      );
      assert.equal(
        expected.filter((entry) => entry.kind === "component").length,
        components,
      );
      const result = await fixture.compare();
      const ids = expected.map((entry) => entry.id);
      if (stylesheet === "design.css")
        ids.push(
          "example-action",
          "example-details",
          "example-toolbar",
          "example-tour",
          "example-welcome",
        );
      assert.deepEqual(
        result.changes
          .map((change) => (change.after ?? change.before)!.id)
          .sort(),
        ids.sort(),
      );
      if (stylesheet !== "design.css")
        assert.ok(
          result.changes.every((change) =>
            (change.after ?? change.before)!.route.startsWith("design/"),
          ),
          "unrelated Example content stays unchanged",
        );
      else
        assert.ok(
          result.sharedImpact.includes("examples/basic/generated/design.css"),
          "the pre-existing global dependency policy stays conservative",
        );
    });
});
