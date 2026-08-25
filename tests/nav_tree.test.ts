import assert from "node:assert/strict";
import test from "node:test";

import type {
  ManifestCollection,
  ManifestEntry,
  ManifestLegacyPage,
  ManifestScreen,
  ManifestV3,
} from "../dist/registry/types.js";
import { createCatalogue } from "../dist/server/catalogue.js";
import {
  buildNavTree,
  structuredCrumbTrail,
  type NavGroupNode,
} from "../dist/server/shell/nav_tree.js";

test("duplicate collection titles retain independent stable identities", () => {
  const catalogue = createCatalogue(
    manifest([
      collection("alpha", "Same title", ["alpha-screen"]),
      collection("beta", "Same title", ["beta-screen"]),
      screen("alpha-screen", "Alpha screen"),
      screen("beta-screen", "Beta screen"),
    ]),
  );
  const groups = buildNavTree(catalogue.hierarchy, []);

  assert.deepEqual(
    groups.map((node) => [node.kind, node.key, node.label]),
    [
      ["group", "collection:alpha", "Same title"],
      ["group", "collection:beta", "Same title"],
    ],
  );
  assert.deepEqual(
    group(groups, "collection:alpha").children[0]?.label,
    "Alpha screen",
  );
  assert.deepEqual(
    group(groups, "collection:beta").children[0]?.label,
    "Beta screen",
  );
});

test("reparenting moves navigation and crumbs despite stale manifest navPath", () => {
  const before = createCatalogue(
    manifest([
      collection("alpha", "Alpha", ["target"]),
      collection("beta", "Beta", []),
      screen("target", "Target", ["Stored", "Wrong"]),
    ]),
  );
  const after = createCatalogue(
    manifest([
      collection("alpha", "Alpha", []),
      collection("beta", "Beta", ["target"]),
      screen("target", "Target", ["Stored", "Wrong"]),
    ]),
  );

  assert.deepEqual(structuredCrumbTrail(before.hierarchy, "target"), [
    { label: "Alpha" },
  ]);
  assert.deepEqual(structuredCrumbTrail(after.hierarchy, "target"), [
    { label: "Beta" },
  ]);
  assert.deepEqual(
    group(buildNavTree(before.hierarchy, []), "collection:alpha").children.map(
      ({ label }) => label,
    ),
    ["Target"],
  );
  assert.deepEqual(
    group(buildNavTree(after.hierarchy, []), "collection:beta").children.map(
      ({ label }) => label,
    ),
    ["Target"],
  );
});

test("root entries gain no invented group or breadcrumb", () => {
  const catalogue = createCatalogue(manifest([screen("root", "Root screen")]));
  const tree = buildNavTree(catalogue.hierarchy, []);

  assert.deepEqual(
    tree.map(({ kind, label }) => [kind, label]),
    [["leaf", "Root screen"]],
  );
  assert.deepEqual(structuredCrumbTrail(catalogue.hierarchy, "root"), []);
});

test("legacy directory keys stay unique when display labels match", () => {
  const pages: ManifestLegacyPage[] = [
    { route: "same-name/index.html", sourcePath: "legacy/first.html" },
    { route: "same_name/index.html", sourcePath: "legacy/second.html" },
  ];
  const catalogue = createCatalogue(manifest([], pages));
  const tree = buildNavTree(catalogue.hierarchy, pages);

  assert.deepEqual(
    tree.map(({ label }) => label),
    ["Same Name", "Same Name"],
  );
  assert.deepEqual(
    new Set(tree.map(({ key }) => key)),
    new Set(["legacy:same-name", "legacy:same_name"]),
  );
});

test("malformed cyclic hierarchy cannot recurse during nav construction", () => {
  const catalogue = createCatalogue(
    manifest([
      collection("alpha", "Alpha", ["beta"]),
      collection("beta", "Beta", ["alpha"]),
    ]),
  );
  assert.deepEqual(buildNavTree(catalogue.hierarchy, []), []);
});

function group(
  nodes: readonly (NavGroupNode | { kind: "leaf" })[],
  key: string,
): NavGroupNode {
  const match = nodes.find(
    (node): node is NavGroupNode => node.kind === "group" && node.key === key,
  );
  assert.ok(match);
  return match;
}

function collection(
  id: string,
  title: string,
  childIds: readonly string[],
): ManifestCollection {
  return {
    childIds,
    dependencies: [],
    description: `${title} collection`,
    id,
    kind: "collection",
    navPath: ["Historical"],
    relatedDocs: [],
    sourcePath: `entries/${id}.tsx`,
    title,
  };
}

function screen(
  id: string,
  title: string,
  navPath: readonly string[] = ["Historical"],
): ManifestScreen {
  return {
    dependencies: [],
    description: `${title} screen`,
    fragments: {
      desktop: `${id}.desktop.html`,
      mobile: `${id}.mobile.html`,
    },
    id,
    kind: "screen",
    navPath,
    relatedDocs: [],
    route: `${id}.html`,
    sourcePath: `entries/${id}.tsx`,
    title,
    useCaseIds: [],
    viewports: ["mobile", "desktop"],
  };
}

function manifest(
  entries: readonly ManifestEntry[],
  legacyPages: readonly ManifestLegacyPage[] = [],
): ManifestV3 {
  return { entries, generatedBy: "mokabook", legacyPages, schemaVersion: 3 };
}
