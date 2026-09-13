import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { concepts } from "../src/concepts.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const screenshots = resolve(root, "../../.context/mockups-review");
const url = (path: string) => pathToFileURL(resolve(root, path)).href;

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
  { name: "narrow-mobile", width: 320, height: 780 },
]) {
  for (const concept of concepts) {
    test(`${concept.name} opens directly from disk at ${viewport.name}`, async ({
      page,
      context,
    }) => {
      await context.setOffline(true);
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      const requests: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (
          !request.url().startsWith("file:") &&
          !request.url().startsWith("data:")
        )
          requests.push(request.url());
      });
      await page.goto(url(concept.path));
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.locator("h1").evaluate((heading) => {
          const range = document.createRange();
          range.selectNodeContents(heading);
          return Array.from(range.getClientRects()).every(
            (rect) => rect.left >= 0 && rect.right <= innerWidth,
          );
        }),
      ).toBe(true);
      await expect(page.locator("main")).toHaveCount(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const invalidLinks = await page
        .locator('a[href^="#"]')
        .evaluateAll((links) =>
          links
            .map((link) => link.getAttribute("href")!)
            .filter((href) => !document.getElementById(href.slice(1))),
        );
      expect(invalidLinks).toEqual([]);
      expect(requests).toEqual([]);
      expect(errors).toEqual([]);
      if (viewport.width < 760) {
        await page.getByLabel("Open navigation").press("Enter");
        await expect(
          page.getByRole("navigation", { name: "Mobile navigation" }),
        ).toBeVisible();
        await page.getByLabel("Open navigation").click();
      }
      await mkdir(screenshots, { recursive: true });
      await page.screenshot({
        path: resolve(screenshots, `${concept.id}-${viewport.name}.png`),
        fullPage: true,
      });
    });
  }
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`gallery switches concepts and viewports at ${viewport.width}px`, async ({
    page,
    context,
  }) => {
    await context.setOffline(true);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url("index.html"));
    for (const concept of concepts) {
      await page.locator(`[data-concept="${concept.id}"]`).click();
      await expect(page.locator("[data-selected-name]")).toHaveText(
        concept.name,
      );
      await expect(page.locator("[data-open-concept]")).toHaveJSProperty(
        "href",
        new URL(concept.path, url("index.html")).href,
      );
      await expect(page.locator("[data-download-concept]")).toHaveJSProperty(
        "href",
        new URL(concept.path, url("index.html")).href,
      );
      const frame = page.frameLocator("[data-preview-frame]");
      await expect(frame.locator("h1")).toBeVisible();
      for (const mode of ["mobile", "desktop"] as const) {
        await page.locator(`[data-viewport="${mode}"]`).click();
        await expect(page.locator(`[data-viewport="${mode}"]`)).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        expect(await frame.locator("body").evaluate(() => innerWidth)).toBe(
          mode === "mobile" ? 390 : 1160,
        );
      }
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page.locator('[data-concept="fieldnotes"]').click();
    await expect(
      page.frameLocator("[data-preview-frame]").locator(".fieldnotes h1"),
    ).toBeVisible();
    await page.evaluate(() => scrollTo(0, 0));
    await mkdir(screenshots, { recursive: true });
    await page.screenshot({
      path: resolve(screenshots, `gallery-${viewport.width}.png`),
      fullPage: true,
    });
    await page
      .locator(
        `[data-viewport="${viewport.width < 760 ? "mobile" : "desktop"}"]`,
      )
      .click();
    await page.locator("[data-preview-stage]").scrollIntoViewIfNeeded();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.locator("[data-preview-stage]").screenshot({
      path: resolve(screenshots, `gallery-preview-${viewport.width}.png`),
    });
  });
}

test("agent illustration moves the action beside the title and can be reset", async ({
  page,
}) => {
  await page.goto(url(concepts[1].path));
  await expect(page.locator("[data-agent-before] .old-action")).toBeVisible();
  await page.getByRole("button", { name: "Show the update" }).click();
  await expect(
    page.locator("[data-agent-after] .project-title .project-action"),
  ).toBeVisible();
  await expect(page.locator("[data-agent-before]")).toBeHidden();
  await page.getByRole("button", { name: "Back to the original" }).click();
  await expect(page.locator("[data-agent-before] .old-action")).toBeVisible();
});

test("team review switches between original and updated design", async ({
  page,
}) => {
  await page.goto(url(concepts[2].path));
  await page.getByRole("button", { name: "Before", exact: true }).click();
  await expect(page.locator("[data-review-before] .old-action")).toBeVisible();
  await expect(page.locator("[data-review-state]")).toHaveText(
    "Original design",
  );
  await page.getByRole("button", { name: "After", exact: true }).click();
  await expect(
    page.locator("[data-review-after] .project-title .project-action"),
  ).toBeVisible();
  await expect(page.locator("[data-review-state]")).toHaveText(
    "Updated design",
  );
});

test("copy command has a usable fallback when clipboard access is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", { value: undefined }),
  );
  await page.goto(url(concepts[0].path));
  await page.getByRole("button", { name: "Copy install command" }).click();
  expect(await page.evaluate(() => getSelection()?.toString())).toBe(
    "npm install --save-dev mokabook react react-dom",
  );
  await expect(page.locator("[data-copy-status]")).toContainText(
    "Command selected",
  );
});
