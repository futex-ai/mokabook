import { defineConfig } from "mokabook";

export default defineConfig({
  colorSchemes: ["light", "dark"],
  entriesDir: "entries",
  mockupsDir: "generated",
  moduleResolution: {
    aliases: { "react-native": "react-native-web" },
    conditions: ["react-native", "import", "module", "default"],
    loaders: { ".js": "jsx" },
    mainFields: ["react-native", "module", "main"],
    resolveExtensions: [
      ".web.tsx",
      ".web.ts",
      ".web.js",
      ".tsx",
      ".ts",
      ".js",
      ".jsx",
      ".json",
    ],
  },
  renderer: "renderer.tsx",
  repoRoot: "../..",
  review: {
    outDir: ".context/basic-review",
    sharedImpact: [
      "examples/basic/generated/design-compare.css",
      "examples/basic/generated/design-stage.css",
      "examples/basic/generated/design.css",
      "examples/basic/renderer.tsx",
      "examples/basic/generated/styles.css",
    ],
  },
  stylesheets: [
    {
      match: "design/browse/compare/**",
      stylesheets: ["design.css", "design-stage.css", "design-compare.css"],
    },
    { match: "design/**", stylesheets: ["design.css", "design-stage.css"] },
    { match: "**/*.html", stylesheets: ["styles.css"] },
  ],
  watch: {
    rules: [
      {
        action: "reload",
        paths: [
          "examples/basic/generated/design-compare.css",
          "examples/basic/generated/design-stage.css",
          "examples/basic/generated/design.css",
          "examples/basic/generated/styles.css",
        ],
      },
    ],
  },
});
