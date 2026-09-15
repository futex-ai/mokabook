import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { compileCatalogue } from "../dist/build/compile.js";
import { serve } from "../dist/server/serve.js";
import { discoverWatchResources } from "../dist/server/watch_resources.js";

import { changedFixture } from "./helpers/changed_fixture.js";
import { validEntrySource } from "./helpers/fixture.js";
import {
  version,
  waitForChangedCount,
  waitForClassifiedCount,
} from "./helpers/watched_catalogue.js";

test(
  "public aliases watch their targets and recover from escaping and dangling replacements",
  { timeout: 180_000 },
  async (context) => {
    const fixture = await changedFixture(
      context,
      validEntrySource({ body: '<img src="../image.svg" alt="Logo" />' }),
      {
        extraConfig: "watch: { debounceMs: 0 },",
      },
      async ({ mockupsDir }) => {
        await fs.writeFile(path.join(mockupsDir, "image.svg"), "<svg/>");
        await fs.mkdir(path.join(mockupsDir, "assets"));
        await fs.writeFile(
          path.join(mockupsDir, "assets/logo.svg"),
          '<svg width="42"/>',
        );
      },
    );
    const compilation = await compileCatalogue(fixture.config);
    const initial = await discoverWatchResources(fixture.config, compilation);
    const running = await serve(fixture.config, {
      base: "main",
      port: 0,
      watch: true,
    });
    try {
      let html = await waitForClassifiedCount(running.url, 0);
      const image = path.join(fixture.mockupsDir, "image.svg");
      const edit = async (action: () => Promise<void>, count?: number) => {
        const previous = version(html);
        await action();
        html = await waitForChangedCount(running.url, previous, count);
        if (count === undefined)
          assert.match(html, /data-changes-status="unavailable"/);
        else assert.ok(html.includes(`class="mbk-nav-filter-count">${count}<`));
      };
      const link = async (target: string) => {
        await fs.rm(image);
        await fs.symlink(target, image);
      };
      await edit(() => link("assets/logo.svg"), 2);
      const aliased = await discoverWatchResources(
        fixture.config,
        compilation,
        initial,
      );
      assert.ok(
        aliased.paths.has(path.join(fixture.mockupsDir, "assets/logo.svg")),
      );
      await edit(
        () =>
          fs.writeFile(
            path.join(fixture.mockupsDir, "assets/logo.svg"),
            '<svg width="84"/>',
          ),
        2,
      );
      await edit(() => link("../notes.md"));
      const invalid = await discoverWatchResources(
        fixture.config,
        compilation,
        aliased,
        true,
      );
      assert.ok(invalid.paths.has(image));
      assert.ok(!invalid.paths.has(path.join(fixture.root, "notes.md")));
      await edit(async () => {
        await fs.rm(image);
        const removed = await waitForChangedCount(
          running.url,
          version(html),
          2,
        );
        assert.match(removed, /class="mbk-nav-filter-count">2</);
        await fs.writeFile(image, "<svg/>");
      }, 0);
      await edit(() => link("missing.svg"));
      await edit(async () => {
        await fs.rm(image);
        await fs.writeFile(image, "<svg/>");
      }, 0);
      await edit(() => fs.writeFile(image, '<svg width="96"/>'), 2);
      await edit(() => link("missing.svg"));
      await edit(() => link("assets/logo.svg"), 2);
    } finally {
      await running.close();
    }
  },
);

test(
  "ignored-region resources reload their live screen without adding Changes",
  { timeout: 90_000 },
  async (context) => {
    const source = validEntrySource({
      body: '<ReviewIgnore id="nav"><img src="../image.svg" alt="Logo" /></ReviewIgnore><p>Content</p>',
    }).replace(
      "import { defineCollection",
      "import { ReviewIgnore, defineCollection",
    );
    const fixture = await changedFixture(
      context,
      source,
      undefined,
      async ({ mockupsDir }) => {
        await fs.writeFile(path.join(mockupsDir, "image.svg"), "<svg/>");
      },
    );
    const running = await serve(fixture.config, {
      base: "main",
      port: 0,
      watch: true,
    });
    try {
      const previous = version(await waitForClassifiedCount(running.url, 0));
      await fs.writeFile(
        path.join(fixture.mockupsDir, "image.svg"),
        '<svg width="42"/>',
      );
      const html = await waitForChangedCount(running.url, previous, 0);
      assert.match(html, /class="mbk-nav-filter-count">0</);
    } finally {
      await running.close();
    }
  },
);
