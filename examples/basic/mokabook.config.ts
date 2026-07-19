import { defineConfig } from "mokabook";

export default defineConfig({
  entriesDir: "entries",
  mockupsDir: "generated",
  renderer: "renderer.tsx",
  repoRoot: "../..",
  review: {
    outDir: ".context/basic-review",
    sharedImpact: [
      "examples/basic/renderer.tsx",
      "examples/basic/generated/styles.css",
    ],
  },
  stylesheets: [{ match: "**/*.html", stylesheets: ["styles.css"] }],
  watch: {
    rules: [
      { action: "reload", paths: ["examples/basic/generated/styles.css"] },
    ],
  },
});
