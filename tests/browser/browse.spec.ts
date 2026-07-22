import { expect, test, type Page } from "@playwright/test";

const welcomeRow = 'a[data-nav-row][data-route="screens/welcome.html"]';
const detailsRow = 'a[data-nav-row][data-route="screens/details.html"]';

async function markPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as { __mokabookMarker?: boolean }).__mokabookMarker = true;
  });
}

function hasMarker(page: Page): Promise<boolean> {
  return page.evaluate(
    () => (window as { __mokabookMarker?: boolean }).__mokabookMarker === true,
  );
}

/**
 * Deeper navigation groups default closed away from their routes, so tests
 * that click a screen row from another page disclose its group first — the
 * same gesture a reader uses.
 */
async function openScreensGroup(page: Page): Promise<void> {
  const group = page.locator('details[data-nav-collection="/Example/Screens"]');
  if ((await group.getAttribute("open")) === null) {
    await group.locator("summary").click();
  }
  await expect(page.locator(welcomeRow)).toBeVisible();
}

test("durable links load complete server-rendered views", async ({ page }) => {
  await page.goto("/view/screens/welcome.html");
  await expect(page.locator("#mb-main h2")).toHaveText("Welcome");
  await expect(page.locator(".mbk-frame-mobile iframe")).toHaveAttribute(
    "sandbox",
    "",
  );
  await expect(page.locator(welcomeRow)).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("progressive navigation swaps the main view without reloads", async ({
  page,
}) => {
  await page.goto("/");
  await markPage(page);
  await openScreensGroup(page);
  await page.click(welcomeRow);
  await expect(page).toHaveURL(/\/view\/screens\/welcome\.html$/);
  await expect(page.locator("#mb-main h2")).toHaveText("Welcome");
  expect(await hasMarker(page)).toBe(true);
  await expect(page.locator(welcomeRow)).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(await page.evaluate(() => document.activeElement?.id ?? "")).toBe(
    "mb-main",
  );
  await expect(page.locator("#mb-status")).toContainText("Welcome");

  await page.click(detailsRow);
  await expect(page).toHaveURL(/details\.html$/);
  await page.goBack();
  await expect(page.locator("#mb-main h2")).toHaveText("Welcome");
  await page.goForward();
  await expect(page.locator("#mb-main h2")).toHaveText("Details");
  expect(await hasMarker(page)).toBe(true);
});

test("Back and Forward restore each route's stage scroll", async ({ page }) => {
  await page.setViewportSize({ height: 500, width: 1_280 });
  await page.goto("/view/screens/welcome.html");
  await page.click(detailsRow);
  await expect(page.locator("#mb-main h2")).toHaveText("Details");
  const destinationScroll = await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>(
      '[data-mokabook-scroll="stage"]',
    );
    if (!stage) return -1;
    stage.scrollTop = 500;
    stage.dispatchEvent(new Event("scroll"));
    return stage.scrollTop;
  });
  expect(destinationScroll).toBeGreaterThan(100);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (history.state as { scrolls?: { stage?: number } } | null)?.scrolls
            ?.stage,
      ),
    )
    .toBe(destinationScroll);

  await page.goBack();
  await expect(page.locator("#mb-main h2")).toHaveText("Welcome");
  await page.goForward();
  await expect(page.locator("#mb-main h2")).toHaveText("Details");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.querySelector<HTMLElement>('[data-mokabook-scroll="stage"]')
            ?.scrollTop,
      ),
    )
    .toBe(destinationScroll);
});

test("search state is retained across in-shell navigation", async ({
  page,
}) => {
  await page.goto("/");
  await markPage(page);
  await page.fill("[data-mokabook-search]", "welcome");
  await expect(page.locator(detailsRow)).toBeHidden();
  await page.click(welcomeRow);
  await expect(page.locator("#mb-main h2")).toHaveText("Welcome");
  await expect(page.locator("[data-mokabook-search]")).toHaveValue("welcome");
  await expect(page.locator(detailsRow)).toBeHidden();
  expect(await hasMarker(page)).toBe(true);
});

test("searching opens groups and clearing restores their disclosure", async ({
  page,
}) => {
  await page.goto("/");
  const screensGroup = 'details[data-nav-collection="/Example/Screens"]';
  await page.evaluate((selector) => {
    document.querySelector<HTMLDetailsElement>(selector)!.open = false;
  }, screensGroup);
  await page.fill("[data-mokabook-search]", "welcome");
  await expect(page.locator(welcomeRow)).toBeVisible();
  expect(
    await page.evaluate(
      (selector) => document.querySelector<HTMLDetailsElement>(selector)!.open,
      screensGroup,
    ),
  ).toBe(true);
  await page.fill("[data-mokabook-search]", "");
  await expect
    .poll(() =>
      page.evaluate(
        (selector) =>
          document.querySelector<HTMLDetailsElement>(selector)!.open,
        screensGroup,
      ),
    )
    .toBe(false);
});

test("overlapping navigations are latest-wins", async ({ page }) => {
  await page.goto("/");
  await markPage(page);
  await openScreensGroup(page);
  await page.route("**/view/screens/welcome.html", async (route) => {
    if (route.request().resourceType() !== "fetch") return route.continue();
    await new Promise((resolve) => setTimeout(resolve, 700));
    return route.continue();
  });
  await page.click(welcomeRow);
  await page.click(detailsRow);
  await expect(page.locator("#mb-main h2")).toHaveText("Details");
  await expect(page).toHaveURL(/details\.html$/);
  await page.waitForTimeout(900);
  await expect(page.locator("#mb-main h2")).toHaveText("Details");
  expect(await hasMarker(page)).toBe(true);
});

test("failed enhancement falls back to native navigation", async ({ page }) => {
  await page.goto("/");
  await markPage(page);
  await openScreensGroup(page);
  await page.route("**/view/screens/welcome.html", (route) =>
    route.request().resourceType() === "fetch"
      ? route.abort()
      : route.continue(),
  );
  await page.click(welcomeRow);
  await expect(page.locator("#mb-main h2")).toHaveText("Welcome");
  expect(await hasMarker(page)).toBe(false);
});

test("viewport controls switch device frames", async ({ page }) => {
  await page.goto("/view/screens/welcome.html");
  await expect(
    page.locator(".mbk-screen-head [data-mokabook-viewswitch]"),
  ).toBeVisible();
  await expect(page.locator(".mbk-viewbar")).toHaveCount(0);
  await expect(page.locator(".mbk-frame-mobile")).toBeVisible();
  await expect(page.locator(".mbk-frame-desktop")).toBeVisible();
  await page.click('[data-viewport-option="mobile"]');
  await expect(page.locator(".mbk-frame-mobile")).toBeVisible();
  await expect(page.locator(".mbk-frame-desktop")).toBeHidden();
  await page.click('[data-viewport-option="desktop"]');
  await expect(page.locator(".mbk-frame-mobile")).toBeHidden();
  await expect(page.locator(".mbk-frame-desktop")).toBeVisible();
});

test("ID chips copy their ID without navigating", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(text: string) {
          (window as Window & { __copiedId?: string }).__copiedId = text;
          return Promise.resolve();
        },
      },
    });
  });
  await page.goto("/view/screens/welcome.html");
  const url = page.url();

  await page.locator("[data-copy-id]").click();

  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __copiedId?: string }).__copiedId,
      ),
    )
    .toBe("example-welcome");
  await expect(page).toHaveURL(url);
  await expect(page.locator("#mb-status")).toHaveText(
    "Copied ID example-welcome",
  );
});

test("the browser frame expands to an overlay and collapses again", async ({
  page,
}) => {
  await page.goto("/view/screens/welcome.html");
  await page.click(".browser-expand");
  await expect(page.locator(".browser-frame.is-expanded")).toBeVisible();
  expect(
    await page.evaluate(() =>
      document.body.classList.contains("frame-expanded"),
    ),
  ).toBe(true);
  await expect(page.locator(".browser-expand")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".browser-frame.is-expanded")).toHaveCount(0);
  await page.click(".browser-expand");
  await expect(page.locator(".browser-frame.is-expanded")).toBeVisible();
  await page.mouse.click(8, 300);
  await expect(page.locator(".browser-frame.is-expanded")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      document.body.classList.contains("frame-expanded"),
    ),
  ).toBe(false);
  await page.click(detailsRow);
  await expect(page.locator("#mb-main h2")).toHaveText("Details");
});

test("narrow viewports collapse navigation into a drawer", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 420 });
  await page.goto("/");
  await expect(page.locator("[data-mokabook-nav]")).toBeHidden();
  await page.click("[data-mokabook-menu]");
  await expect(page.locator("[data-mokabook-nav]")).toBeVisible();
  await expect(page.locator("[data-mokabook-menu]")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await openScreensGroup(page);
  await page.click(welcomeRow);
  await expect(page.locator("#mb-main h2")).toHaveText("Welcome");
  await expect(page.locator("[data-mokabook-nav]")).toBeHidden();
});

test("missing routes keep the catalogue available", async ({ page }) => {
  await page.goto("/view/unknown.html");
  await expect(page.locator("#mb-main h2")).toHaveText("Screen not found");
  await expect(page.locator("[data-mokabook-nav]")).toBeVisible();
  await openScreensGroup(page);
  await page.click(welcomeRow);
  await expect(page.locator("#mb-main h2")).toHaveText("Welcome");
});

test("the shell is keyboard navigable with a skip link", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".mbk-skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#mb-main")).toBeFocused();
  await openScreensGroup(page);
  await page.locator(welcomeRow).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#mb-main h2")).toHaveText("Welcome");
  await expect(page.locator("#mb-main")).toBeFocused();
});

test("the shell works without JavaScript", async ({ baseURL, browser }) => {
  if (!baseURL) throw new Error("Playwright baseURL is required");
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  await page.goto("/");
  await page
    .locator('details[data-nav-collection="/Example/Screens"] summary')
    .click();
  await page.click(welcomeRow);
  await expect(page).toHaveURL(/welcome\.html$/);
  await expect(page.locator("#mb-main h2")).toHaveText("Welcome");
  await expect(page.locator(".mbk-frame-mobile")).toBeVisible();
  await expect(page.locator(".mbk-frame-desktop")).toBeVisible();
  await context.close();
});
