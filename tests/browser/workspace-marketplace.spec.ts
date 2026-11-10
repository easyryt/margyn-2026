import { test, expect, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";
const origin = "http://127.0.0.1:3100";
const root = "/tools/marketplace";
async function login(request: APIRequestContext, phone: string) {
  const challenge = await (await request.post("/api/auth/request-otp", { headers: { Origin: origin }, data: { phone } })).json();
  expect((await request.post("/api/auth/verify-otp", { headers: { Origin: origin }, data: { challengeId: challenge.challengeId, code: challenge.developmentCode } })).ok()).toBe(true);
}
test("workspace marketplace uses admin products, all catalog filters, four desktop columns and the shared cart", async ({ page, browser }) => {
  test.setTimeout(210000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const admin = await browser.newContext();
  await login(admin.request, "9876543201");
  const products: { id: string; name: string }[] = [];
  try {
    const fixtures = [
      { name: "Studio kraft boxes", price: 2.5, low: 2, sizes: ["Small"], specification: "Recycled kraft", packSize: 25, verified: true, stock: 20, vendor: "Margyn Studio", image: "/products/box.svg" },
      { name: "Studio kraft mailers", price: 7, low: 6, sizes: ["Large"], specification: "Recycled kraft", packSize: 100, verified: true, stock: 30, vendor: "Margyn Studio", image: "/products/mailer.svg" },
      { name: "Partner shipping labels", price: 12, low: 10, sizes: ["Small"], specification: "Thermal paper", packSize: 50, verified: false, stock: 0, vendor: "Partner", image: "/products/labels.svg" },
      { name: "Partner protective mailers", price: 4, low: 3, sizes: ["Large"], specification: "Compostable film", packSize: 50, verified: false, stock: 40, vendor: "Partner", image: "/products/black-mailer.svg" },
    ];
    for (const [index, fixture] of [...fixtures, { ...fixtures[0], name: "Unpublished workspace product" }].entries()) {
      const { low, ...item } = fixture;
      const response = await admin.request.post("/api/admin/products", { headers: { Origin: origin }, data: {
        ...item, sku: "WS-MARKET-" + index, category: "Workspace supplies", description: "Useful packaging essentials for a growing business.",
        compareAt: 0, unit: "piece", minOrder: 1, featured: true, status: index === 4 ? "draft" : "published",
        tiers: [{ minCartons: 1, price: fixture.price }, { minCartons: 5, price: low }],
      } });
      expect(response.ok(), await response.text()).toBe(true);
      products.push((await response.json()).product);
    }
    const response = await page.request.get(root, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    await page.goto(root + "?category=workspace-supplies&q=kraft&sort=price-desc");
    await expect(page).toHaveURL(/\/login\?next=/);
    const destination = new URL(page.url()).searchParams.get("next")!;
    expect(new URL(destination, origin).pathname).toBe(root);
    expect(new URL(destination, origin).searchParams.get("q")).toBe("kraft");
    await page.getByLabel("Mobile number", { exact: true }).fill("9876543258");
    await page.getByRole("button", { name: "Get verification code", exact: true }).click();
    await expect(page.locator(".development-notice b")).toBeVisible();
    await page.getByLabel("Verification code", { exact: true }).fill(await page.locator(".development-notice b").innerText());
    await page.getByRole("button", { name: "Verify & continue", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Marketplace", exact: true })).toBeVisible();
    await expect(page.locator(".market-card")).toHaveCount(2);
    await expect(page.locator(".market-card h3").first()).toHaveText("Studio kraft mailers");
    const workspaceNav = page.getByRole("navigation", { name: "Workspace navigation", exact: true });
    await expect(workspaceNav.getByRole("link", { name: "Marketplace", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("navigation", { name: "Seller tool navigation", exact: true }).getByRole("link")).toHaveCount(4);
    await page.getByRole("button", { name: "Clear filters", exact: true }).click();
    await expect(page.locator(".market-card")).toHaveCount(10);
    await expect(page.locator(".workspace-marketplace")).not.toContainText("Unpublished workspace product");
    await page.locator(".tools-desktop-sidebar").evaluate(el => (el as HTMLElement).dataset.persisted = "marketplace-sidebar");
    await workspaceNav.getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(page.locator(".seller-tool-card")).toHaveCount(4);
    await workspaceNav.getByRole("link", { name: "Marketplace", exact: true }).click();
    await expect(page.locator(".tools-desktop-sidebar")).toHaveAttribute("data-persisted", "marketplace-sidebar");
    const sidebar = page.getByRole("complementary", { name: "Product filters", exact: true });
    await sidebar.getByRole("button", { name: "Workspace supplies", exact: false }).click();
    await expect(page.locator(".market-card")).toHaveCount(4);
    for (const width of [1440, 1280, 1100]) {
      await page.setViewportSize({ width, height: 1000 });
      const rows = await page.locator(".category-product").evaluateAll(elements => elements.map(el => Math.round(el.getBoundingClientRect().top)));
      expect(new Set(rows).size, "four products in one row at " + width).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    fs.mkdirSync(".test-data/screenshots", { recursive: true });
    await page.screenshot({ path: ".test-data/screenshots/workspace-marketplace-desktop.png", fullPage: true, animations: "disabled" });
    const search = page.getByRole("searchbox", { name: "Search marketplace", exact: true });
    await search.fill("kraft Large");
    await expect(page.locator(".market-card")).toHaveCount(1);
    await expect(page.locator(".market-card h3")).toHaveText("Studio kraft mailers");
    await search.fill("Workspace supplies");
    await expect(page.locator(".market-card")).toHaveCount(4);
    await search.fill("WS-MARKET-3");
    await expect(page.locator(".market-card h3")).toHaveText("Partner protective mailers");
    await search.fill("");
    await sidebar.getByLabel("Size Large", { exact: true }).check();
    await expect(page.locator(".market-card")).toHaveCount(2);
    await sidebar.getByLabel("Specification Recycled kraft", { exact: true }).check();
    await sidebar.getByLabel("Pack size 100", { exact: true }).check();
    await sidebar.getByLabel("Vendor Margyn Studio", { exact: true }).check();
    await sidebar.getByLabel("In stock only", { exact: true }).check();
    await sidebar.getByLabel("Verified vendors only", { exact: true }).check();
    await sidebar.getByLabel("Minimum price", { exact: true }).fill("5.9");
    await sidebar.getByLabel("Maximum price", { exact: true }).fill("6.1");
    await expect(page.locator(".market-card")).toHaveCount(1);
    await expect(page.locator(".market-card h3")).toHaveText("Studio kraft mailers");
    await page.reload();
    await expect(page.locator(".market-card")).toHaveCount(1);
    await expect(sidebar.getByLabel("Size Large", { exact: true })).toBeChecked();
    await sidebar.getByLabel("Minimum price", { exact: true }).fill("7");
    await expect(sidebar.getByRole("alert")).toContainText("Minimum price cannot exceed");
    await expect(page.getByRole("heading", { name: "No products found", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Reset search", exact: true }).click();
    await sidebar.getByRole("button", { name: "Workspace supplies", exact: false }).click();
    await page.getByLabel("Sort products", { exact: true }).selectOption("price-desc");
    await expect(page.locator(".market-card h3").first()).toHaveText("Partner shipping labels");
    await expect(page.locator(".market-card").first().getByRole("button", { name: "Out of stock", exact: true })).toBeDisabled();
    await sidebar.getByLabel("In stock only", { exact: true }).check();
    await expect(page.locator(".market-card")).toHaveCount(3);
    await sidebar.getByLabel("In stock only", { exact: true }).uncheck();
    await page.locator(".category-compare-option input").nth(0).check();
    await page.locator(".category-compare-option input").nth(1).check();
    await page.getByRole("button", { name: "Compare (2)", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Compare products", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close dialog", exact: true }).click();
    await page.getByLabel("Sort products", { exact: true }).selectOption("price-asc");
    const card = page.locator(".market-card").first();
    await card.getByRole("button", { name: "Add to cart", exact: true }).click();
    await expect(card.getByRole("status")).toContainText("Added to your cart");
    await expect(page.getByRole("link", { name: "Cart, 1 cartons", exact: true })).toBeVisible();
    const cart = (await (await page.request.get("/api/cart")).json()).cart;
    expect(cart.items[0].productId).toBe(products[0].id);
    await search.fill("nothing matches");
    await expect(page.getByRole("heading", { name: "No products found", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Clear marketplace search", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: /^Filters/ }).click();
    const dialog = page.getByRole("dialog", { name: "Refine your search", exact: true });
    await dialog.getByLabel("Size Large", { exact: true }).check();
    await dialog.getByRole("button", { name: "Show 2 products", exact: true }).click();
    await expect(page.locator(".market-card")).toHaveCount(2);
    await page.screenshot({ path: ".test-data/screenshots/workspace-marketplace-mobile.png", fullPage: true, animations: "disabled" });
    for (const width of [390, 320, 768]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no overflow at " + width).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Open tool menu", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Tool menu", exact: true }).getByRole("link", { name: "Marketplace", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto("/login?next=" + encodeURIComponent("//untrusted.invalid/tools/marketplace"));
    await expect(page).toHaveURL(origin + "/");
    expect(errors).toEqual([]);
  } finally {
    for (const product of products) await admin.request.delete("/api/admin/products/" + product.id, { headers: { Origin: origin } });
    await admin.close();
  }
});
