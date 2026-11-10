import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
const tools = [
  ["image-generator", "Image Generator"],
  ["listing-tool", "Listing Tool"],
  ["inventory-admin", "Inventory Admin"],
  ["shipping-labels", "Shipping Labels"],
];
async function signIn(page: Page, phone: string) {
  await page.getByLabel("Mobile number", { exact: true }).fill(phone);
  await page.getByRole("button", { name: "Get verification code" }).click();
  await expect(page.locator(".development-notice b")).toBeVisible();
  const code = await page.locator(".development-notice b").innerText();
  await page.getByLabel("Verification code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Verify & continue" }).click();
}
test("seller dashboard and all four internal tool pages require login and preserve the selected workspace", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of ["/tools", ...tools.map(([id]) => "/tools/" + id)]) {
    const response = await page.request.get(route, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(decodeURIComponent(response.headers().location)).toBe(
      "/login?next=" + route,
    );
  }
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Seller toolkit" })
    .click();
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(new URL(page.url()).searchParams.get("next")).toBe("/tools");
  await signIn(page, "9876543214");
  await expect(page).toHaveURL(/\/tools$/);
  await expect(
    page.getByRole("heading", {
      name: "Dashboard",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".seller-tool-card")).toHaveCount(4);
  await expect(page.locator(".tools-shell")).not.toContainText("9876543214");
  fs.mkdirSync(".test-data/screenshots", { recursive: true });
  await page.screenshot({
    path: ".test-data/screenshots/seller-tools-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: ".test-data/screenshots/seller-tools-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator(".tools-desktop-sidebar").evaluate((element) => {
    (element as HTMLElement).dataset.persisted = "same-sidebar";
  });
  for (const [id, name] of tools) {
    await page
      .locator(".tools-card-grid")
      .getByRole("link", { name: "Open " + name, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp("/tools/" + id + "$"));
    await expect(page.locator(".tools-desktop-sidebar")).toHaveAttribute(
      "data-persisted",
      "same-sidebar",
    );
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    if (id === "shipping-labels")
      await expect(
        page.getByRole("button", { name: "Process PDF", exact: true }),
      ).toBeDisabled();
    else if (id === "image-generator")
      await expect(
        page
          .getByRole("navigation", {
            name: "Image generator modes",
            exact: true,
          })
          .getByRole("link"),
      ).toHaveCount(5);
    else if (id === "listing-tool")
      await expect(page.getByRole("navigation", {name:"Listing tool sections", exact:true})).toBeVisible();
    else if (id === "inventory-admin")
      await expect(page.getByRole("navigation", {name:"Inventory sections", exact:true})).toBeVisible();
    else
      await expect(
        page.getByText("The tool’s features will be added in the next step.", {
          exact: false,
        }),
      ).toBeVisible();
    const navigation = page.getByRole("navigation", {
      name: "Seller tool navigation",
      exact: true,
    });
    await expect(navigation.getByRole("link")).toHaveCount(4);
    await expect(
      navigation.getByRole("link", { name, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    if (id === "shipping-labels") {
      await page.screenshot({
        path: ".test-data/screenshots/seller-workspace-desktop.png",
        fullPage: true,
        animations: "disabled",
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: ".test-data/screenshots/seller-workspace-mobile.png",
        fullPage: true,
        animations: "disabled",
      });
      await page.setViewportSize({ width: 320, height: 740 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .getByRole("button", { name: "Open tool menu", exact: true })
        .click();
      const drawer = page.getByRole("dialog", {
        name: "Tool menu",
        exact: true,
      });
      await expect(drawer).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(drawer).toHaveCount(0);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await navigation
        .getByRole("link", { name: "Listing Tool", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Listing Tool", exact: true }),
      ).toBeVisible();
    }
    await page.getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(page).toHaveURL(/\/tools$/);
  }
  await page.goto(
    "/login?next=" + encodeURIComponent("https://untrusted.invalid/tools"),
  );
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.goto("/tools/shipping-labels");
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(new URL(page.url()).searchParams.get("next")).toBe(
    "/tools/shipping-labels",
  );
  await signIn(page, "9876543215");
  await expect(page).toHaveURL(/\/tools\/shipping-labels$/);
  await expect(
    page.getByRole("heading", { name: "Shipping Labels", exact: true }),
  ).toBeVisible();
  const invalid = await page.request.get("/tools/not-a-real-tool");
  expect(invalid.status()).toBe(404);
  expect(errors).toEqual([]);
});
