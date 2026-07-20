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

test("durable links load complete server-rendered views", async ({ page }) => {
  await page.goto("/view/screens/welcome.html");
  await expect(page.locator("#mb-main h1")).toHaveText("Welcome");
  await expect(page.locator(".mb-frame--mobile iframe")).toHaveAttribute(
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
  await page.click(welcomeRow);
  await expect(page).toHaveURL(/\/view\/screens\/welcome\.html$/);
  await expect(page.locator("#mb-main h1")).toHaveText("Welcome");
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
  await expect(page.locator("#mb-main h1")).toHaveText("Welcome");
  await page.goForward();
  await expect(page.locator("#mb-main h1")).toHaveText("Details");
  expect(await hasMarker(page)).toBe(true);
});

test("Back and Forward restore each route's document scroll", async ({
  page,
}) => {
  await page.setViewportSize({ height: 300, width: 1_280 });
  await page.goto("/view/screens/welcome.html");
  await page.click(detailsRow);
  await expect(page.locator("#mb-main h1")).toHaveText("Details");
  const destinationScroll = await page.evaluate(() => {
    window.scrollTo(0, Math.min(500, document.documentElement.scrollHeight));
    return window.scrollY;
  });
  expect(destinationScroll).toBeGreaterThan(100);
  await expect
    .poll(() =>
      page.evaluate(
        () => (history.state as { scroll?: number } | null)?.scroll,
      ),
    )
    .toBe(destinationScroll);

  await page.goBack();
  await expect(page.locator("#mb-main h1")).toHaveText("Welcome");
  await page.goForward();
  await expect(page.locator("#mb-main h1")).toHaveText("Details");
  expect(
    await page.evaluate(
      () => (history.state as { scroll?: number } | null)?.scroll,
    ),
  ).toBe(destinationScroll);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
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
  await expect(page.locator("#mb-main h1")).toHaveText("Welcome");
  await expect(page.locator("[data-mokabook-search]")).toHaveValue("welcome");
  await expect(page.locator(detailsRow)).toBeHidden();
  expect(await hasMarker(page)).toBe(true);
});

test("overlapping navigations are latest-wins", async ({ page }) => {
  await page.goto("/");
  await markPage(page);
  await page.route("**/view/screens/welcome.html", async (route) => {
    if (route.request().resourceType() !== "fetch") return route.continue();
    await new Promise((resolve) => setTimeout(resolve, 700));
    return route.continue();
  });
  await page.click(welcomeRow);
  await page.click(detailsRow);
  await expect(page.locator("#mb-main h1")).toHaveText("Details");
  await expect(page).toHaveURL(/details\.html$/);
  await page.waitForTimeout(900);
  await expect(page.locator("#mb-main h1")).toHaveText("Details");
  expect(await hasMarker(page)).toBe(true);
});

test("failed enhancement falls back to native navigation", async ({ page }) => {
  await page.goto("/");
  await markPage(page);
  await page.route("**/view/screens/welcome.html", (route) =>
    route.request().resourceType() === "fetch"
      ? route.abort()
      : route.continue(),
  );
  await page.click(welcomeRow);
  await expect(page.locator("#mb-main h1")).toHaveText("Welcome");
  expect(await hasMarker(page)).toBe(false);
});

test("viewport controls switch device frames", async ({ page }) => {
  await page.goto("/view/screens/welcome.html");
  await expect(page.locator(".mb-frame--mobile")).toBeVisible();
  await expect(page.locator(".mb-frame--desktop")).toBeVisible();
  await page.click('[data-viewport-option="mobile"]');
  await expect(page.locator(".mb-frame--mobile")).toBeVisible();
  await expect(page.locator(".mb-frame--desktop")).toBeHidden();
  await page.click('[data-viewport-option="desktop"]');
  await expect(page.locator(".mb-frame--mobile")).toBeHidden();
  await expect(page.locator(".mb-frame--desktop")).toBeVisible();
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
  await page.click(welcomeRow);
  await expect(page.locator("#mb-main h1")).toHaveText("Welcome");
  await expect(page.locator("[data-mokabook-nav]")).toBeHidden();
});

test("missing routes keep the catalogue available", async ({ page }) => {
  await page.goto("/view/unknown.html");
  await expect(page.locator("#mb-main h1")).toHaveText("Screen not found");
  await expect(page.locator("[data-mokabook-nav]")).toBeVisible();
  await page.click(welcomeRow);
  await expect(page.locator("#mb-main h1")).toHaveText("Welcome");
});

test("the shell is keyboard navigable with a skip link", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".mb-skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#mb-main")).toBeFocused();
  await page.locator(welcomeRow).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#mb-main h1")).toHaveText("Welcome");
  await expect(page.locator("#mb-main")).toBeFocused();
});

test("the shell works without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4517/");
  await page.click(welcomeRow);
  await expect(page).toHaveURL(/welcome\.html$/);
  await expect(page.locator("#mb-main h1")).toHaveText("Welcome");
  await expect(page.locator(".mb-frame--mobile")).toBeVisible();
  await expect(page.locator(".mb-frame--desktop")).toBeVisible();
  await context.close();
});
