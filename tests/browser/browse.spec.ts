import { expect, test, type Page } from "@playwright/test";

const welcomeRow = 'a[data-nav-row][data-route="screens/welcome.html"]';
const detailsRow = 'a[data-nav-row][data-route="screens/details.html"]';
const designHomeRow =
  'a[data-nav-row][data-route="design/browse/views/home.html"]';
const tourRow = 'a[data-nav-row][data-route="user-flows/example-tour.html"]';
const topBarScheme = ".mbk-topbar [data-mokabook-schemeswitch]";
const headScheme = ".mbk-screen-head [data-mokabook-schemeswitch]";
const mobileFrame = ".mbk-frame-mobile iframe";
const desktopFrame = ".mbk-frame-desktop iframe";
const darkSurface = "rgb(18, 21, 20)";

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

/** Choose a color scheme from whichever switch the current width reveals. */
function chooseScheme(
  page: Page,
  placement: string,
  value: "dark" | "light",
): Promise<void> {
  return page.click(`${placement} [data-color-scheme-option="${value}"]`);
}

/** Both switch instances agree on the selection, whichever one is on screen. */
async function expectSchemeSelected(
  page: Page,
  value: "dark" | "light",
): Promise<void> {
  const other = value === "dark" ? "light" : "dark";
  for (const placement of [topBarScheme, headScheme]) {
    await expect(
      page.locator(`${placement} [data-color-scheme-option="${value}"]`),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.locator(`${placement} [data-color-scheme-option="${other}"]`),
    ).toHaveAttribute("aria-pressed", "false");
  }
}

function computedStyle(
  page: Page,
  selector: string,
  property: "backgroundColor" | "boxShadow" | "display" | "textTransform",
): Promise<string> {
  return page
    .locator(selector)
    .evaluate((element, name) => getComputedStyle(element)[name], property);
}

/**
 * A dark screen paints its edge on an `::after` overlay above the fragment, so
 * the hairline is read from the pseudo-element rather than the screen itself.
 */
function overlayStyle(
  page: Page,
  selector: string,
  property: "boxShadow" | "position",
): Promise<string> {
  return page
    .locator(selector)
    .evaluate(
      (element, name) => getComputedStyle(element, "::after")[name],
      property,
    );
}

test("durable links load complete server-rendered views", async ({ page }) => {
  await page.goto("/view/screens/welcome.html");
  await expect(page.locator("#mb-main h2")).toHaveText("Welcome");
  await expect(page.locator(".mbk-frame-mobile iframe")).toHaveAttribute(
    "sandbox",
    "allow-same-origin",
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

test("details disclosure is remembered across routes and reloads", async ({
  page,
}) => {
  const details = page.locator("[data-mokabook-details]");
  await page.goto("/view/screens/welcome.html");
  await details.locator("summary").click();
  await expect(details).not.toHaveAttribute("open", "");

  await page.click(detailsRow);
  await expect(page.locator("#mb-main h2")).toHaveText("Details");
  await expect(details).not.toHaveAttribute("open", "");

  await page.reload();
  await expect(details).not.toHaveAttribute("open", "");
  await details.locator("summary").click();
  await expect(details).toHaveAttribute("open", "");

  await page.goto("/view/screens/welcome.html");
  await expect(details).toHaveAttribute("open", "");
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

test("color scheme switch swaps device frames", async ({ page }) => {
  await page.goto("/view/screens/welcome.html");
  await expect(page.locator(mobileFrame)).toHaveAttribute(
    "src",
    /screens\/welcome\.mobile\.html$/,
  );
  await expectSchemeSelected(page, "light");

  await chooseScheme(page, topBarScheme, "dark");
  await expect(page.locator("body")).toHaveAttribute(
    "data-mokabook-color-scheme",
    "dark",
  );
  await expect(page.locator(mobileFrame)).toHaveAttribute(
    "src",
    /screens\/welcome\.mobile\.dark\.html$/,
  );
  await expect(page.locator(desktopFrame)).toHaveAttribute(
    "src",
    /screens\/welcome\.desktop\.dark\.html$/,
  );
  await expectSchemeSelected(page, "dark");

  await chooseScheme(page, topBarScheme, "light");
  await expect(page.locator("body")).toHaveAttribute(
    "data-mokabook-color-scheme",
    "light",
  );
  await expect(page.locator(mobileFrame)).toHaveAttribute(
    "src",
    /screens\/welcome\.mobile\.html$/,
  );
  await expect(page.locator(desktopFrame)).toHaveAttribute(
    "src",
    /screens\/welcome\.desktop\.html$/,
  );
  await expectSchemeSelected(page, "light");
});

test("dark device screens keep their surface and edge", async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 1_280 });
  await page.goto("/view/screens/welcome.html");
  const phoneScreen = ".mbk-frame-mobile .phone-screen";
  expect(await overlayStyle(page, phoneScreen, "boxShadow")).toBe("none");

  await chooseScheme(page, topBarScheme, "dark");
  expect(await computedStyle(page, phoneScreen, "boxShadow")).toBe("none");
  expect(await overlayStyle(page, phoneScreen, "position")).toBe("absolute");
  expect(await overlayStyle(page, phoneScreen, "boxShadow")).toContain("inset");
  expect(await computedStyle(page, mobileFrame, "backgroundColor")).toBe(
    darkSurface,
  );
  expect(await computedStyle(page, desktopFrame, "backgroundColor")).toBe(
    darkSurface,
  );
  expect(
    await computedStyle(page, ".browser-viewport", "backgroundColor"),
  ).toBe(darkSurface);
});

test("a light-only screen keeps light frames and says so", async ({ page }) => {
  await page.goto("/view/screens/welcome.html");
  await chooseScheme(page, topBarScheme, "dark");
  await page.fill("[data-mokabook-search]", "home");
  await page.click(designHomeRow);
  await expect(page.locator("#mb-main h2")).toHaveText("Home");

  await expect(page.locator(mobileFrame)).toHaveAttribute(
    "src",
    /design\/browse\/views\/home\.mobile\.html$/,
  );
  await expect(page.locator(desktopFrame)).toHaveAttribute(
    "src",
    /design\/browse\/views\/home\.desktop\.html$/,
  );
  await expect(page.locator(".mbk-frame-mobile")).toHaveAttribute(
    "data-color-scheme-fallback",
    "",
  );
  const note = page.locator(".mbk-frame-mobile .mbk-frame-scheme-note");
  await expect(note).toBeVisible();
  await expect(note).toHaveText("— Light only");
  expect(
    await computedStyle(
      page,
      ".mbk-frame-mobile .mbk-frame-label",
      "textTransform",
    ),
  ).toBe("uppercase");
  await expect(
    page.locator(".mbk-frame-desktop .mbk-frame-scheme-note"),
  ).toBeVisible();
  expect(
    await overlayStyle(page, ".mbk-frame-mobile .phone-screen", "boxShadow"),
  ).toBe("none");

  await chooseScheme(page, topBarScheme, "light");
  await expect(note).toBeHidden();
});

test("use-case steps follow the selected scheme without a caption", async ({
  page,
}) => {
  await page.goto("/view/screens/welcome.html");
  await chooseScheme(page, topBarScheme, "dark");
  await page.fill("[data-mokabook-search]", "tour");
  await page.click(tourRow);
  await expect(page.locator("#mb-main h2")).toHaveText("Example tour");

  const steps = page.locator(".mbk-flow-screen iframe");
  await expect(steps).toHaveCount(2);
  await expect(steps.nth(0)).toHaveAttribute(
    "src",
    /screens\/welcome\.desktop\.dark\.html$/,
  );
  await expect(steps.nth(1)).toHaveAttribute(
    "src",
    /screens\/details\.desktop\.dark\.html$/,
  );
  await expect(page.locator(".mbk-flow-screen .mbk-frame-label")).toHaveCount(
    0,
  );
});

test("scheme selection survives progressive navigation", async ({ page }) => {
  await page.goto("/view/screens/welcome.html");
  await chooseScheme(page, topBarScheme, "dark");
  await page.click(detailsRow);
  await expect(page.locator("#mb-main h2")).toHaveText("Details");
  await expect(page.locator(mobileFrame)).toHaveAttribute(
    "src",
    /screens\/details\.mobile\.dark\.html$/,
  );
  await expect(page.locator(desktopFrame)).toHaveAttribute(
    "src",
    /screens\/details\.desktop\.dark\.html$/,
  );
  await expectSchemeSelected(page, "dark");

  await page.goBack();
  await expect(page.locator("#mb-main h2")).toHaveText("Welcome");
  await expect(page.locator(mobileFrame)).toHaveAttribute(
    "src",
    /screens\/welcome\.mobile\.dark\.html$/,
  );
  await expectSchemeSelected(page, "dark");

  await page.goForward();
  await expect(page.locator("#mb-main h2")).toHaveText("Details");
  await expect(page.locator(mobileFrame)).toHaveAttribute(
    "src",
    /screens\/details\.mobile\.dark\.html$/,
  );
});

test("the scheme control moves with the shell breakpoint", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/view/screens/welcome.html");
  await expect(page.locator(topBarScheme)).toBeHidden();
  expect(await computedStyle(page, topBarScheme, "display")).toBe("none");
  await expect(page.locator(headScheme)).toBeVisible();

  await chooseScheme(page, headScheme, "dark");
  await expect(page.locator(mobileFrame)).toHaveAttribute(
    "src",
    /screens\/welcome\.mobile\.dark\.html$/,
  );

  await page.setViewportSize({ height: 800, width: 1_280 });
  await expect(page.locator(topBarScheme)).toBeVisible();
  await expect(page.locator(headScheme)).toBeHidden();
  expect(await computedStyle(page, headScheme, "display")).toBe("none");
  await expectSchemeSelected(page, "dark");
});

test("the catalogue home carries no scheme control when narrow", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");
  await expect(page.locator(".mbk-screen-head")).toHaveCount(0);
  await expect(page.locator(headScheme)).toHaveCount(0);
  await expect(page.locator(topBarScheme)).toBeHidden();
  await expect(
    page.locator("[data-mokabook-schemeswitch]:visible"),
  ).toHaveCount(0);
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
  const idChip = page.locator("[data-copy-id]");

  await expect(idChip).toHaveText("#example-welcome");
  await idChip.hover();
  expect(
    await idChip.evaluate((element) => getComputedStyle(element).cursor),
  ).toBe("pointer");
  await page.mouse.down();
  const pressed = await idChip.evaluate((element) => {
    const style = getComputedStyle(element);
    return { boxShadow: style.boxShadow, transform: style.transform };
  });
  expect(pressed.boxShadow).not.toBe("none");
  expect(pressed.transform).not.toBe("none");
  await page.mouse.up();

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
