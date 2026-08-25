import { expect, test, type Page } from "@playwright/test";

import { startPreviewFixture, type PreviewFixture } from "./preview_fixture.js";

let preview: PreviewFixture;

test.describe.configure({ timeout: 90_000 });

test.beforeAll(async () => {
  preview = await startPreviewFixture();
});

test.afterAll(async () => {
  await preview.close();
});

test("direct screen fragments update current and swap sources", async ({
  page,
}) => {
  await page.goto(`${preview.url}/view/screens/details?fragment=details`);
  await expectAllSources(page, "#details");
  await chooseDark(page);
  await expectAllSources(page, "#details");

  await page.goto(`${preview.url}/view/screens/details?fragment=absent-anchor`);
  await expectAllSources(page, "#absent-anchor");
  await expectFrameAtTop(page);
  await chooseDark(page);
  await expectAllSources(page, "#absent-anchor");
  await expectFrameAtTop(page);
});

test("invalid and duplicate direct fragments leave every source unchanged", async ({
  page,
}) => {
  for (const query of [
    "fragment=%23details",
    "fragment=details&fragment=other",
  ]) {
    await page.goto(`${preview.url}/view/screens/details?${query}`);
    for (const source of await frameSources(page)) {
      expect(source.src).not.toContain("#");
      expect(source.light).not.toContain("#");
      expect(source.dark).not.toContain("#");
    }
  }
});

test("use-case fragments apply to the first step only", async ({ page }) => {
  await page.goto(
    `${preview.url}/view/user-flows/example-tour?fragment=welcome`,
  );
  const sources = await frameSources(page, ".mbk-flow-screen iframe");
  expect(sources).toHaveLength(2);
  expect(Object.values(sources[0] ?? {})).toEqual([
    expect.stringContaining("#welcome"),
    expect.stringContaining("#welcome"),
    expect.stringContaining("#welcome"),
  ]);
  expect(Object.values(sources[1] ?? {})).toEqual([
    expect.not.stringContaining("#"),
    expect.not.stringContaining("#"),
    expect.not.stringContaining("#"),
  ]);
  await chooseDark(page);
  const darkSources = await frameSources(page, ".mbk-flow-screen iframe");
  expect(darkSources[0]?.src).toContain("#welcome");
  expect(darkSources[1]?.src).not.toContain("#");
});

test("a static logical link retains its fragment through navigation and swaps", async ({
  page,
}) => {
  await page.goto(`${preview.url}/view/screens/welcome`);
  await page
    .frameLocator(".mbk-frame-mobile iframe")
    .getByRole("link", { name: "Open the details screen" })
    .click();
  await expect(page).toHaveURL(/\/view\/screens\/details\?fragment=details$/);
  await expect(page.locator("#mb-main h2")).toHaveText("Details");
  await expectAllSources(page, "#details");
  await chooseDark(page);
  await expectAllSources(page, "#details");
});

test("JavaScript-disabled static preview stays at its portable top", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${preview.url}/view/screens/details?fragment=details`);
  for (const source of await frameSources(page)) {
    expect(source.src).not.toContain("#");
    expect(source.light).not.toContain("#");
    expect(source.dark).not.toContain("#");
  }
  await expectFrameAtTop(page);
  await context.close();
});

async function chooseDark(page: Page): Promise<void> {
  await page.click('.mbk-topbar [data-color-scheme-option="dark"]');
}

async function expectAllSources(page: Page, suffix: string): Promise<void> {
  await expect
    .poll(() => frameSources(page))
    .toEqual([
      {
        dark: expect.stringContaining(suffix),
        light: expect.stringContaining(suffix),
        src: expect.stringContaining(suffix),
      },
      {
        dark: expect.stringContaining(suffix),
        light: expect.stringContaining(suffix),
        src: expect.stringContaining(suffix),
      },
    ]);
}

async function expectFrameAtTop(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page
        .frameLocator(".mbk-frame-mobile iframe")
        .locator("html")
        .evaluate(() => window.scrollY),
    )
    .toBe(0);
}

function frameSources(
  page: Page,
  selector = "iframe[data-mokabook-fragment-frame]",
): Promise<Array<{ dark: string; light: string; src: string }>> {
  return page.locator(selector).evaluateAll((frames) =>
    frames.map((frame) => ({
      dark: frame.getAttribute("data-fragment-dark") ?? "",
      light: frame.getAttribute("data-fragment-light") ?? "",
      src: frame.getAttribute("src") ?? "",
    })),
  );
}
