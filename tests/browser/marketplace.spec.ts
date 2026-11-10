import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import fs from "node:fs";
const origin = "http://127.0.0.1:3100";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQ1sAAAAASUVORK5CYII=",
  "base64",
);
async function login(page: Page, phone: string) {
  await page.getByLabel("Mobile number", { exact: true }).fill(phone);
  await page.getByRole("button", { name: "Get verification code" }).click();
  await expect(page.locator(".development-notice b")).toBeVisible();
  const code = await page.locator(".development-notice b").innerText();
  await page.getByLabel("Verification code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Verify & continue" }).click();
}
async function apiLogin(context: BrowserContext, phone: string) {
  const sent = await context.request.post(origin + "/api/auth/request-otp", {
    headers: { Origin: origin },
    data: { phone },
  });
  expect(sent.ok()).toBeTruthy();
  const challenge = await sent.json();
  const verified = await context.request.post(origin + "/api/auth/verify-otp", {
    headers: { Origin: origin },
    data: {
      challengeId: challenge.challengeId,
      code: challenge.developmentCode,
    },
  });
  expect(verified.ok()).toBeTruthy();
}
const screenshot = async (page: Page, name: string) => {
  fs.mkdirSync(".test-data/screenshots", { recursive: true });
  for (const image of await page.locator("img").all()) {
    if (await image.isVisible()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(async (element) => {
        if (element instanceof HTMLImageElement) {
          try {
            await element.decode();
          } catch {
            /* Broken images remain visible in previews. */
          }
        }
      });
    }
  }
  await page.evaluate(() => {
    document
      .querySelectorAll(".landing-category-grid, .landing-filter-pills")
      .forEach((element) => {
        element.scrollLeft = 0;
      });
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForFunction(() => window.scrollY === 0);
  await page.screenshot({
    animations: "disabled",
    path: `.test-data/screenshots/${name}.png`,
    fullPage: true,
    caret: "initial",
  });
};
test("catalog, customer authorization and extended admin product editor", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/Margyn/i);
  await expect(page.locator("body")).not.toContainText(/\bPACKI\b/i);
  expect((await (await page.request.get("/api/health")).json()).service).toBe(
    "margyn-api",
  );
  await expect(page.locator(".market-card")).toHaveCount(6);
  await expect(page.locator("#landing-title")).toContainText("Packaging for");
  await expect(page.locator(".margyn-landing")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await screenshot(page, "home-desktop");
  await page
    .getByRole("link", { name: "Browse Shipping boxes", exact: true })
    .click();
  await expect(page).toHaveURL(/\/categories\/shipping-boxes$/);
  await expect(
    page.getByRole("heading", { name: "Shipping boxes", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".market-card")).toHaveCount(1);
  await page.goto("/");
  await page.getByRole("button", { name: "All products", exact: true }).click();
  await expect(page.locator(".landing-tool")).toHaveCount(4);
  await expect(
    page.getByRole("link", { name: "Explore Shipping Labels", exact: true }),
  ).toHaveAttribute("href", "/tools/shipping-labels");
  await page
    .getByRole("button", { name: "Shipping boxes", exact: true })
    .click();
  await expect(page.locator(".market-card")).toHaveCount(1);
  await page.getByRole("button", { name: "All products", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Search products", exact: true })
    .fill("nothingmatches");
  await expect(
    page.getByRole("heading", { name: "No products found" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot(page, "home-mobile");
  await expect(page.locator(".white-header")).toBeInViewport();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/admin");
  await login(page, "9876543202");
  await expect(
    page.getByRole("heading", { name: "Admin access required" }),
  ).toBeVisible();
  expect((await page.request.get("/api/admin/products")).status()).toBe(403);
  expect(
    (
      await page.request.post("/api/admin/upload", {
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(403);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Login / Sign up" }),
  ).toBeVisible();
  const guest = await browser.newContext();
  expect((await guest.request.get(origin + "/api/admin/users")).status()).toBe(
    401,
  );
  await guest.close();
  await page.goto("/admin");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, "9876543201");
  await expect(
    page.getByRole("heading", { name: "A little overview." }),
  ).toBeVisible();
  await screenshot(page, "admin-desktop");
  expect(
    (
      await page.request.post("/api/admin/products", {
        headers: { Origin: "https://invalid.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  await page.route("**/api/admin/upload", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ url: "/products/box.svg" }),
    }),
  );
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  await page
    .getByLabel("Upload product image")
    .setInputFiles({ name: "test.png", mimeType: "image/png", buffer: png });
  await expect(page.getByAltText("Product preview")).toBeVisible();
  await page.getByLabel("Product name", { exact: true }).fill("E2E gift box");
  await page.getByLabel("SKU", { exact: true }).fill("E2E-001");
  await page
    .getByLabel("Description", { exact: true })
    .fill("A sample product created through the real admin product form.");
  await page.getByLabel("Price per piece (₹)", { exact: true }).fill("2.53");
  await page
    .getByLabel("Available stock (cartons)", { exact: true })
    .fill("50");
  await page.getByRole("button", { name: "Add tier", exact: true }).click();
  await page.getByLabel("Minimum cartons", { exact: true }).fill("2");
  await page
    .getByLabel("Price per piece (₹)", { exact: true })
    .last()
    .fill("2.45");
  await screenshot(page, "admin-product-editor");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(
    page.getByText("Draft saved. Publish it when you’re ready."),
  ).toBeVisible();
  let data = await (await page.request.get("/api/products")).json();
  expect(data.products.some((p: { sku: string }) => p.sku === "E2E-001")).toBe(
    false,
  );
  await page
    .getByRole("button", { name: "Edit E2E gift box", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Visibility", exact: true })
    .selectOption("published");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(
    page.getByText("Product saved and published to the storefront."),
  ).toBeVisible();
  data = await (await page.request.get("/api/products")).json();
  expect(
    data.products.find((p: { sku: string }) => p.sku === "E2E-001").tiers[1]
      .price,
  ).toBe(2.45);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Edit E2E gift box", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot(page, "admin-mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Delete E2E gift box", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete product", exact: true })
    .click();
  await expect(
    page.getByText("Product deleted from your catalog."),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Announcement banner", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your announcement banner." }),
  ).toBeVisible();
  const originalAnnouncement = (
    await (await page.request.get("/api/admin/announcement")).json()
  ).announcement;
  const visitor = await browser.newContext();
  const storefront = await visitor.newPage();
  try {
    const message = "Wholesale essentials. Ready for your next dispatch.";
    await page.getByLabel("Banner message", { exact: true }).fill(message);
    await page
      .getByLabel("Banner link (optional)", { exact: true })
      .fill("/#catalog");
    await page.getByLabel("Background color", { exact: true }).fill("#243e55");
    await page.getByLabel("Text color", { exact: true }).fill("#f4f7ff");
    await page.getByLabel("Scroll speed", { exact: true }).selectOption("fast");
    await expect(
      page.getByRole("region", { name: "Announcement preview" }),
    ).toContainText(message);
    await page
      .getByRole("button", { name: "Save announcement", exact: true })
      .click();
    await expect(
      page.getByText("Announcement saved. Your storefront is up to date."),
    ).toBeVisible();
    await screenshot(page, "admin-announcement-desktop");
    await page.reload();
    await page
      .getByRole("button", { name: "Announcement banner", exact: true })
      .click();
    await expect(
      page.getByLabel("Banner message", { exact: true }),
    ).toHaveValue(message);
    await expect(page.getByLabel("Scroll speed", { exact: true })).toHaveValue(
      "fast",
    );
    await storefront.goto("/");
    const banner = storefront.getByRole("region", {
      name: "Store announcement",
      exact: true,
    });
    await expect(banner).toBeVisible();
    await expect(banner).toHaveCSS("background-color", "rgb(36, 62, 85)");
    await expect(
      banner.getByRole("link", { name: message, exact: true }),
    ).toHaveAttribute("href", "/#catalog");
    await storefront.mouse.move(600, 240);
    const track = banner.locator(".announcement-track");
    const transform = await track.evaluate(
      (element) => getComputedStyle(element).transform,
    );
    await expect
      .poll(() =>
        track.evaluate((element) => getComputedStyle(element).transform),
      )
      .not.toBe(transform);
    await expect(banner.getByRole("button")).toHaveCount(0);
    await banner.locator(".announcement-viewport").hover();
    await expect(track).toHaveCSS("animation-play-state", "paused");
    await storefront.mouse.move(600, 240);
    await expect(track).toHaveCSS("animation-play-state", "running");
    await page
      .getByLabel("Show banner on storefront", { exact: true })
      .uncheck();
    await page
      .getByRole("button", { name: "Save announcement", exact: true })
      .click();
    await expect(
      page.getByText("Announcement saved. Your storefront is up to date."),
    ).toBeVisible();
    await storefront.reload();
    await expect(banner).toHaveCount(0);
    await page.getByLabel("Show banner on storefront", { exact: true }).check();
    await page
      .getByRole("button", { name: "Save announcement", exact: true })
      .click();
    await expect(
      page.getByText("Announcement saved. Your storefront is up to date."),
    ).toBeVisible();
    await storefront.reload();
    await expect(banner).toBeVisible();
    await storefront.setViewportSize({ width: 390, height: 844 });
    await storefront.evaluate(() =>
      window.scrollTo({ top: 0, behavior: "instant" }),
    );
    await expect(banner).toBeInViewport();
    expect(
      await storefront.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await storefront
      .locator(".studio-image")
      .evaluate((element: HTMLImageElement) => element.decode());
    await storefront.screenshot({
      path: ".test-data/screenshots/announcement-mobile.png",
      animations: "disabled",
    });
    await storefront.emulateMedia({ reducedMotion: "reduce" });
    await expect(track).toHaveCSS("animation-name", "none");
    await expect(banner.locator(".announcement-item:visible")).toHaveCount(1);
    await expect(banner.getByRole("button")).toHaveCount(0);
    await storefront.setViewportSize({ width: 320, height: 740 });
    expect(
      await storefront.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
    await screenshot(page, "admin-announcement-mobile");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await page.request.put("/api/admin/announcement", {
      headers: { Origin: origin },
      data: originalAnnouncement,
    });
    await visitor.close();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Promotional banner", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Your promotional banner.",
      exact: true,
    }),
  ).toBeVisible();
  const originalPromo = (
    await (await page.request.get("/api/admin/promo-banner")).json()
  ).banner;
  const promoVisitor = await browser.newContext();
  const promoStorefront = await promoVisitor.newPage();
  try {
    await page
      .getByLabel("Promotional banner label", { exact: true })
      .fill("MARGYN CUSTOM COLLECTION");
    await page
      .getByLabel("Promotional banner title", { exact: true })
      .fill("Packaging made for your business");
    await page
      .getByLabel("Promotional highlighted line", { exact: true })
      .fill("Make every delivery count.");
    await page
      .getByLabel("Promotional banner description", { exact: true })
      .fill(
        "Choose packaging that feels like your brand and fits your next dispatch.",
      );
    await page
      .getByLabel("Promotional highlight 1", { exact: true })
      .fill("Personal touches, everyday essentials");
    await page
      .getByLabel("Primary banner button label", { exact: true })
      .fill("Shop the collection");
    await page
      .getByLabel("Primary banner button link", { exact: true })
      .fill("/#catalog");
    await page
      .getByLabel("Secondary banner button label", { exact: true })
      .fill("Browse sizes");
    await page
      .getByLabel("Secondary banner button link", { exact: true })
      .fill("/#categories");
    await page
      .getByLabel("Upload promotional banner image", { exact: true })
      .setInputFiles({
        name: "banner.png",
        mimeType: "image/png",
        buffer: png,
      });
    await expect(
      page.getByLabel("Promotional banner image URL", { exact: true }),
    ).toHaveValue("/products/box.svg");
    await page
      .getByLabel("Promotional image description", { exact: true })
      .fill("Sample custom packaging display");
    await page
      .getByLabel("Promotional background color", { exact: true })
      .fill("#093b35");
    await page
      .getByLabel("Promotional accent color", { exact: true })
      .fill("#82d3b3");
    await page
      .getByLabel("Promotional image badge title", { exact: true })
      .fill("A better first impression");
    await page
      .getByLabel("Promotional image badge description", { exact: true })
      .fill("From your store to their doorstep.");
    await page
      .getByRole("button", { name: "Save promotional banner", exact: true })
      .click();
    await expect(
      page.getByText("Promotional banner saved. Your homepage is up to date."),
    ).toBeVisible();
    await screenshot(page, "admin-promo-banner-desktop");
    await page.reload();
    await page
      .getByRole("button", { name: "Promotional banner", exact: true })
      .click();
    await expect(
      page.getByLabel("Promotional banner title", { exact: true }),
    ).toHaveValue("Packaging made for your business");
    await expect(
      page.getByLabel("Promotional banner image URL", { exact: true }),
    ).toHaveValue("/products/box.svg");
    await promoStorefront.goto("/#custom-packaging");
    const promo = promoStorefront.locator("#custom-packaging");
    await expect(promo).toBeVisible();
    await expect(
      promo.getByRole("heading", { name: /Packaging made for your business/ }),
    ).toBeVisible();
    await expect(promo.locator(".promo-copy")).toHaveCSS(
      "background-color",
      "rgb(9, 59, 53)",
    );
    await expect(
      promo.getByRole("link", { name: "Shop the collection", exact: true }),
    ).toHaveAttribute("href", "/#catalog");
    await expect(
      promo.getByRole("link", { name: "Browse sizes", exact: true }),
    ).toHaveAttribute("href", "/#categories");
    await expect(
      promo.getByAltText("Sample custom packaging display"),
    ).toHaveAttribute("src", "/products/box.svg");
    await expect(promoStorefront.locator("body")).not.toContainText(
      "Great things",
    );
    await expect(
      promoStorefront.getByRole("region", {
        name: "Store announcement",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByLabel("Show promotional banner", { exact: true }).uncheck();
    await page
      .getByRole("button", { name: "Save promotional banner", exact: true })
      .click();
    await expect(
      page.getByText("Promotional banner saved. Your homepage is up to date."),
    ).toBeVisible();
    await promoStorefront.reload();
    await expect(promo).toHaveCount(0);
    await page.getByLabel("Show promotional banner", { exact: true }).check();
    await page
      .getByRole("button", { name: "Save promotional banner", exact: true })
      .click();
    await expect(
      page.getByText("Promotional banner saved. Your homepage is up to date."),
    ).toBeVisible();
    await promoStorefront.reload();
    await expect(promo).toBeVisible();
    await promoStorefront.setViewportSize({ width: 390, height: 844 });
    await promo.scrollIntoViewIfNeeded();
    expect(
      await promoStorefront.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await promo.screenshot({
      path: ".test-data/screenshots/promo-banner-mobile.png",
      animations: "disabled",
    });
    await promoStorefront.setViewportSize({ width: 320, height: 740 });
    expect(
      await promoStorefront.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
    await screenshot(page, "admin-promo-banner-mobile");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await page.request.put("/api/admin/promo-banner", {
      headers: { Origin: origin },
      data: originalPromo,
    });
    await promoVisitor.close();
  }
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/admin/products")).status()).toBe(401);
  expect(errors).toEqual([]);
});
test("wholesale product, persistent guest cart, coupon, checkout OTP and unpaid order request", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const admin = await browser.newContext();
  await apiLogin(admin, "9876543204");
  const coupon = await admin.request.post(origin + "/api/admin/coupons", {
    headers: { Origin: origin },
    data: { code: "E2E10", percent: 10, days: 1, active: true },
  });
  expect(coupon.ok()).toBeTruthy();
  const products = await (await page.request.get("/api/products")).json();
  const product = products.products.find(
    (p: { sku: string }) => p.sku === "DEMO-MS-001",
  );
  await page.goto(`/product/${product.id}`);
  await expect(
    page.getByRole("heading", { name: product.name, exact: true }),
  ).toBeVisible();
  await page.locator(".tier-options>button").nth(1).click();
  await page.getByRole("button", { name: "8X10", exact: true }).click();
  await expect(page.getByLabel("Carton quantity")).toHaveValue("2");
  await screenshot(page, "product-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot(page, "product-mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: /Add to cart — 2 CTN/ })
    .first()
    .click();
  await page.getByRole("link", { name: "View cart" }).click();
  await expect(
    page.getByRole("heading", { name: "Your cart", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await page
    .getByRole("button", { name: `Increase ${product.name}`, exact: true })
    .click();
  await expect(
    page.getByText("Subtotal (3 CTN)", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save for later", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Saved for later/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Move to cart", exact: true }).click();
  await page.getByLabel("COUPON", { exact: true }).fill("E2E10");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText("E2E10 applied")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await screenshot(page, "cart-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot(page, "cart-mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Proceed to checkout" }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByLabel("Mobile number", { exact: true })).toBeVisible();
  await screenshot(page, "checkout-login-desktop");
  await login(page, "9876543203");
  await expect(
    page.getByRole("heading", { name: "Where should we send it?" }),
  ).toBeVisible();
  await page.getByLabel("Full name", { exact: true }).fill("Test Buyer");
  await page
    .getByLabel("Street address", { exact: true })
    .fill("12 Test Street");
  await page
    .getByLabel("State", { exact: true })
    .selectOption("Madhya Pradesh");
  await page.getByLabel("City", { exact: true }).fill("Indore");
  await page.getByLabel("PIN code", { exact: true }).fill("452010");
  await page.getByRole("button", { name: "Continue to review" }).click();
  await expect(
    page.getByRole("heading", { name: "Ready for your next dispatch?" }),
  ).toBeVisible();
  await screenshot(page, "checkout-review-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot(page, "checkout-mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Submit order request" }).click();
  await expect(
    page.getByRole("heading", { name: "Your order request is saved." }),
  ).toBeVisible();
  await expect(page.getByText("Unpaid · awaiting arrangements")).toBeVisible();
  const id = new URL(page.url()).pathname.split("/").pop();
  const orders = await (await page.request.get("/api/orders")).json();
  expect(orders.orders.some((order: { id: string }) => order.id === id)).toBe(
    true,
  );
  const adminPage = await admin.newPage();
  await adminPage.goto("/admin");
  await adminPage.getByRole("button", { name: "Orders", exact: true }).click();
  await adminPage
    .getByRole("button", { name: "View order", exact: true })
    .click();
  await adminPage
    .getByRole("button", { name: "Mark confirmed", exact: true })
    .click();
  await expect(
    adminPage.locator(".admin-order-detail .order-status"),
  ).toHaveText("confirmed");
  await adminPage
    .getByRole("button", { name: "Cancel & restore stock", exact: true })
    .click();
  await expect(
    adminPage.locator(".admin-order-detail .order-status"),
  ).toHaveText("cancelled");
  await page.reload();
  await expect(page.locator(".summary-lines .order-status")).toHaveText(
    "cancelled",
  );
  await admin.close();
  expect(errors).toEqual([]);
});

test("category navigation, shared filters, sorting, comparison and mobile browsing", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/categories/courier-bags");
  await expect(
    page.getByRole("heading", { name: "Courier bags", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".market-card")).toHaveCount(4);
  const rowCount = await page
    .locator(".category-product")
    .evaluateAll((elements) => {
      const firstTop = elements[0].getBoundingClientRect().top;
      return elements.filter(
        (element) =>
          Math.abs(element.getBoundingClientRect().top - firstTop) < 2,
      ).length;
    });
  expect(rowCount).toBe(4);
  await page
    .getByRole("combobox", { name: "Sort products", exact: true })
    .selectOption("price-desc");
  await expect(page.locator(".market-card h3").first()).toContainText(
    "Flipkart non-transparent",
  );
  const sidebar = page.getByRole("complementary", {
    name: "Product filters",
    exact: true,
  });
  await sidebar.getByLabel("Maximum price", { exact: true }).fill("3");
  await expect(page.locator(".market-card")).toHaveCount(2);
  await sidebar
    .getByRole("checkbox", { name: "Pack size 50", exact: true })
    .check();
  await expect(page.locator(".market-card")).toHaveCount(1);
  await expect(page.locator(".market-card h3")).toContainText(
    "Meesho non-transparent",
  );
  await expect(page).toHaveURL(/max=3/);
  await page.reload();
  await expect(page.locator(".market-card")).toHaveCount(1);
  await sidebar
    .getByRole("button", { name: "Reset all filters", exact: true })
    .click();
  await expect(page.locator(".market-card")).toHaveCount(4);
  await page
    .getByRole("searchbox", { name: "Search this category", exact: true })
    .fill("nothingmatches");
  await expect(
    page.getByRole("heading", { name: "No products found", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset search", exact: true }).click();
  await expect(page.locator(".market-card")).toHaveCount(4);
  await page.locator(".category-compare-option input").nth(0).check();
  await page.locator(".category-compare-option input").nth(1).check();
  await page.getByRole("button", { name: "Compare (2)", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Compare products", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("columnheader")).toHaveCount(
    3,
  );
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await screenshot(page, "category-courier-desktop");
  const card = page.locator(".market-card").first();
  const name = await card.locator("h3").innerText();
  await card.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(card.getByRole("status")).toContainText("Added to your cart");
  const cart = (await (await page.request.get("/api/cart")).json()).cart;
  expect(cart.items.some((item: { name: string }) => item.name === name)).toBe(
    true,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Refine your search",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("checkbox", { name: "Pack size 100", exact: true })
    .check();
  await dialog
    .getByRole("button", { name: "Show 2 products", exact: true })
    .click();
  await expect(page.locator(".market-card")).toHaveCount(2);
  await screenshot(page, "category-courier-mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/categories");
  await expect(
    page.getByRole("heading", { name: "Packaging essentials", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".market-card")).toHaveCount(6);
  await page.goto("/categories/unknown-category");
  await expect(
    page.getByRole("heading", {
      name: "This one got lost in transit.",
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("private profile, saved addresses, profile navigation and checkout reuse", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  expect((await page.request.get("/api/profile")).status()).toBe(401);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?next=.*profile/);
  await login(page, "9876543212");
  await expect(
    page.getByRole("heading", { name: "Your profile.", exact: true }),
  ).toBeVisible();
  const header = page.locator(".white-header");
  await expect(
    header.getByRole("link", { name: "Your profile", exact: true }),
  ).toBeVisible();
  await expect(header).not.toContainText("9876543212");
  await expect(
    page.getByLabel("Verified mobile number", { exact: true }),
  ).toHaveAttribute("readonly", "");
  await page.getByLabel("Full name", { exact: true }).fill("Aarav Mehta");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Your profile has been saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Aarav Mehta",
  );
  for (const [label, line1] of [
    ["Home", "12 Cedar Lane"],
    ["Work", "45 Studio Road"],
  ]) {
    await page
      .getByRole("button", { name: "Add address", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Add an address",
      exact: true,
    });
    await dialog.getByLabel("Address label", { exact: true }).fill(label);
    await expect(
      dialog.getByLabel("Recipient name", { exact: true }),
    ).toHaveValue("Aarav Mehta");
    await dialog.getByLabel("Street address", { exact: true }).fill(line1);
    await dialog
      .getByLabel("State", { exact: true })
      .selectOption("Madhya Pradesh");
    await expect(dialog.locator("datalist option[value=Indore]")).toHaveCount(
      1,
    );
    await dialog.getByLabel("City", { exact: true }).fill("Indore");
    await dialog.getByLabel("PIN code", { exact: true }).fill("452010");
    await dialog
      .getByRole("button", { name: "Save address", exact: true })
      .click();
    await expect(
      page.getByRole("article", { name: label + " address", exact: true }),
    ).toBeVisible();
  }
  const home = page.getByRole("article", { name: "Home address", exact: true });
  const work = page.getByRole("article", { name: "Work address", exact: true });
  await expect(home.locator(".profile-default-badge")).toContainText("Default");
  await work.getByRole("button", { name: "Make default", exact: true }).click();
  await expect(work.locator(".profile-default-badge")).toContainText("Default");
  await work.getByRole("button", { name: "Edit address", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Edit address", exact: true });
  await expect(edit.getByLabel("State", { exact: true })).toHaveValue(
    "Madhya Pradesh",
  );
  await expect(edit.getByLabel("City", { exact: true })).toHaveValue("Indore");
  await screenshot(page, "address-form-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot(page, "address-form-mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await edit
    .getByLabel("Street address", { exact: true })
    .fill("45 Studio Road, Suite 2");
  await edit.getByRole("button", { name: "Save address", exact: true }).click();
  await expect(work).toContainText("45 Studio Road, Suite 2");
  await expect(work.locator(".profile-default-badge")).toContainText("Default");
  await screenshot(page, "profile-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot(page, "profile-mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const profile = (await (await page.request.get("/api/profile")).json())
    .profile;
  expect(profile.addresses).toHaveLength(2);
  const products = (await (await page.request.get("/api/products")).json())
    .products;
  expect(
    (
      await page.request.post("/api/cart", {
        headers: { Origin: origin },
        data: {
          type: "add",
          productId: products[0].id,
          size: products[0].sizes[0],
          quantity: products[0].minOrder,
        },
      })
    ).ok(),
  ).toBe(true);
  await page.goto("/checkout");
  const workAddress = profile.addresses.find(
    (address: { label: string }) => address.label === "Work",
  );
  const homeAddress = profile.addresses.find(
    (address: { label: string }) => address.label === "Home",
  );
  await expect(
    page.getByRole("combobox", { name: "Use a saved address", exact: true }),
  ).toHaveValue(workAddress.id);
  await expect(page.getByLabel("Street address", { exact: true })).toHaveValue(
    "45 Studio Road, Suite 2",
  );
  await expect(page.getByLabel("State", { exact: true })).toHaveValue(
    "Madhya Pradesh",
  );
  await expect(page.getByLabel("City", { exact: true })).toHaveValue("Indore");
  await expect(page.getByLabel("PIN code", { exact: true })).toHaveValue(
    "452010",
  );
  await page
    .getByRole("combobox", { name: "Use a saved address", exact: true })
    .selectOption(homeAddress.id);
  await expect(page.getByLabel("Street address", { exact: true })).toHaveValue(
    "12 Cedar Lane",
  );
  await page
    .getByRole("combobox", { name: "Use a saved address", exact: true })
    .selectOption("");
  await expect(page.getByLabel("Street address", { exact: true })).toHaveValue(
    "",
  );
  await expect(page.getByLabel("State", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("City", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Aarav Mehta",
  );
  await header.getByRole("link", { name: "Your profile", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your profile.", exact: true }),
  ).toBeVisible();
  for (const label of ["Work", "Home"]) {
    await page
      .getByRole("article", { name: label + " address", exact: true })
      .getByRole("button", { name: "Delete address", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Remove this address?", exact: true })
      .getByRole("button", { name: "Remove address", exact: true })
      .click();
    await expect(
      page.getByRole("article", { name: label + " address", exact: true }),
    ).toHaveCount(0);
    if (label === "Work")
      await expect(home.locator(".profile-default-badge")).toContainText(
        "Default",
      );
  }
  expect(
    (await (await page.request.get("/api/profile")).json()).profile.addresses,
  ).toHaveLength(0);
  expect(errors).toEqual([]);
});

test("address helpers support state changes, union territories and city lookup failures", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await apiLogin(context, "9876543213");
  await page.goto("/profile");
  await page.getByRole("button", { name: "Add address", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Add an address",
    exact: true,
  });
  const state = dialog.getByLabel("State", { exact: true });
  const city = dialog.getByLabel("City", { exact: true });
  const pin = dialog.getByLabel("PIN code", { exact: true });
  await expect(state.locator("option")).toHaveCount(37);
  await state.selectOption("Ladakh");
  await expect(state).toHaveValue("Ladakh");
  await state.selectOption("Madhya Pradesh");
  await expect(dialog.locator('datalist option[value="Indore"]')).toHaveCount(
    1,
  );
  await city.fill("Indore");
  await pin.fill("452010");
  await state.selectOption("Maharashtra");
  await expect(city).toHaveValue("");
  await expect(pin).toHaveValue("");
  await expect(dialog.locator('datalist option[value="Mumbai"]')).toHaveCount(
    1,
  );
  await expect(dialog.locator('datalist option[value="Indore"]')).toHaveCount(
    0,
  );

  // A delayed response for a previous state cannot replace the current suggestions.
  let finishOldRequest: (() => void) | undefined;
  await page.route("**/api/locations/cities?state=MP", async (route) => {
    await new Promise<void>((resolve) => {
      finishOldRequest = resolve;
    });
    await route
      .fulfill({ json: { cities: ["Old state suggestion"] } })
      .catch(() => {});
  });
  await state.selectOption("Madhya Pradesh");
  await expect.poll(() => Boolean(finishOldRequest)).toBe(true);
  await state.selectOption("Maharashtra");
  finishOldRequest!();
  await expect(dialog.locator('datalist option[value="Mumbai"]')).toHaveCount(
    1,
  );
  await expect(
    dialog.locator('datalist option[value="Old state suggestion"]'),
  ).toHaveCount(0);

  // Suggestions are optional: a lookup failure still permits a town to be saved.
  await page.route("**/api/locations/cities?state=GA", (route) =>
    route.fulfill({ status: 503, json: { error: "Temporarily unavailable" } }),
  );
  await state.selectOption("Goa");
  await expect(dialog.getByRole("status")).toContainText(
    "You can still type your city or town.",
  );
  await dialog.getByLabel("Recipient name", { exact: true }).fill("Anaya Rao");
  await dialog
    .getByLabel("Street address", { exact: true })
    .fill("18 Riverside Lane");
  await city.fill("My small town");
  await pin.fill("403001");
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await dialog
    .getByRole("button", { name: "Save address", exact: true })
    .click();
  await expect(
    page.getByRole("article", { name: "Home address", exact: true }),
  ).toContainText("My small town, Goa");
  await page.reload();
  await expect(
    page.getByRole("article", { name: "Home address", exact: true }),
  ).toContainText("My small town, Goa");
  expect(errors).toEqual([]);
});
