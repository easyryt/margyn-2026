import { test, expect } from "@playwright/test";
import fs from "node:fs";
import sharp from "../../../backend/node_modules/sharp";
import JSZip from "jszip";
const origin = "http://127.0.0.1:3100";
const root = "/tools/image-generator";
const modes = ["covers", "charms", "charm-packs", "backgrounds", "enhance"];
async function fixtures() {
  const product = await sharp({
    create: {
      width: 96,
      height: 128,
      channels: 4,
      background: { r: 110, g: 85, b: 190, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  const foreground = await sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="128"><rect x="25" y="10" width="46" height="108" rx="6" fill="#7162bd"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  const background = await sharp({
    create: {
      width: 128,
      height: 128,
      channels: 3,
      background: { r: 235, g: 240, b: 250 },
    },
  })
    .png()
    .toBuffer();
  return { product, foreground, background };
}
function value(body: string, name: string) {
  return (
    body.match(new RegExp('name="' + name + '"\r\n\r\n([^\r]+)'))?.[1] || ""
  );
}

test("image studio is private and generates selected views inside the existing dashboard", async ({
  page,
  context,
}) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of [root, ...modes.map((mode) => `${root}/${mode}`)]) {
    const response = await page.request.get(route, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(decodeURIComponent(response.headers().location)).toBe(
      "/login?next=" + route,
    );
  }
  expect(
    (await page.request.get("/api/tools/image-generator/providers")).status(),
  ).toBe(401);
  const challenge = await (
    await context.request.post("/api/auth/request-otp", {
      headers: { Origin: origin },
      data: { phone: "9876543230" },
    })
  ).json();
  expect(
    (
      await context.request.post("/api/auth/verify-otp", {
        headers: { Origin: origin },
        data: {
          challengeId: challenge.challengeId,
          code: challenge.developmentCode,
        },
      })
    ).ok(),
  ).toBe(true);
  const { product } = await fixtures();
  const calls: { action: string; body: string }[] = [];
  await page.route("**/api/tools/image-generator/generate*", async (route) => {
    const action = new URL(route.request().url()).pathname.split("/").pop()!;
    const body = route.request().postDataBuffer()!.toString("utf8");
    calls.push({ action, body });
    const view =
      action === "generate"
        ? JSON.parse(value(body, "views"))[0]
        : value(body, "view");
    const label =
      action === "generate"
        ? "Model selfie"
        : action === "generate-charms"
          ? "Charm only"
          : "Fan pack";
    const image = {
      id: action + "-fixture",
      templateId: view,
      label,
      dataUrl: "data:image/png;base64," + product.toString("base64"),
      mimeType: "image/png",
      phoneModelId: "iphone-13",
      phoneModelLabel: "iPhone 13",
      rearCameras: 2,
      verified: true,
      review: { status: "passed", issues: [] },
      quantity: Number(value(body, "quantity") || 5),
      renderMode: "template",
      referenceLocked: true,
      backgroundReady: false,
    };
    await route.fulfill({
      json: {
        images: [image],
        failures: [],
        complete: true,
        provider: value(body, "provider"),
        renderMode: "template",
      },
    });
  });
  await page.goto(root);
  const studio = page.getByRole("region", {
    name: "Image Generator studio",
    exact: true,
  });
  await expect(
    studio.getByRole("heading", { name: "Image Generator", exact: true }),
  ).toBeVisible();
  await expect(
    studio
      .getByRole("navigation", { name: "Image generator modes" })
      .getByRole("link"),
  ).toHaveCount(6);
  const cards = studio.locator(".image-tool-card");
  await expect(cards).toHaveCount(5);
  for (const [index, mode] of modes.entries()) {
    await expect(cards.nth(index)).toHaveAttribute("href", `${root}/${mode}`);
  }
  fs.mkdirSync(".test-data/screenshots", { recursive: true });
  await page.screenshot({ path: ".test-data/screenshots/image-studio-start-desktop.png", animations: "disabled" });
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: ".test-data/screenshots/image-studio-start-mobile.png", animations: "disabled" });
  await studio.getByRole("combobox", { name: "Image tool", exact: true }).selectOption(`${root}/covers`);
  await expect(page).toHaveURL(`${root}/covers`);
  await expect(studio.getByRole("heading", { name: "Phone covers", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const provider = studio.locator('input[type="radio"][value="gemini"]');
  const aiSettings = studio.locator("summary").filter({ hasText: "AI settings" });
  await expect(provider).toBeHidden();
  await aiSettings.click();
  await expect(provider).toBeVisible();
  await expect(
    provider,
  ).toBeEnabled();
  await aiSettings.click();
  await expect(studio.getByRole("button", { name: "Generate 1 selected image", exact: true })).toBeDisabled();
  await studio
    .getByLabel("Upload phone-cover photo", { exact: true })
    .setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      buffer: product,
    });
  await studio.getByRole("button", { name: "Clear", exact: true }).click();
  await studio
    .getByRole("checkbox", { name: "Model selfie", exact: true })
    .check();
  await studio
    .getByLabel("iPhone model", { exact: true })
    .selectOption("iphone-13");
  await studio
    .getByRole("button", { name: "Generate 1 selected image", exact: true })
    .click();
  await expect(studio.locator(".result-card")).toHaveCount(1);
  expect(calls).toHaveLength(1);
  expect(JSON.parse(value(calls[0].body, "views"))).toEqual(["model-selfie"]);
  expect(value(calls[0].body, "renderMode")).toBe("template");
  const downloadEvent = page.waitForEvent("download");
  await studio
    .getByRole("link", { name: "Download Model selfie", exact: true })
    .click();
  expect((await downloadEvent).suggestedFilename()).toMatch(
    /^margyn-iphone-13/,
  );
  await page.screenshot({
    path: ".test-data/screenshots/image-studio-results-desktop.png",
    animations: "disabled",
  });
  await page
    .getByRole("navigation", { name: "Image generator modes" })
    .getByRole("link", { name: "Cover & charm", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Cover & charm", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Seller tool navigation" })
      .getByRole("link", { name: "Image Generator", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const charmInputs = studio.locator('input[type="file"]');
  await charmInputs.nth(0).setInputFiles({
    name: "cover.png",
    mimeType: "image/png",
    buffer: product,
  });
  await charmInputs.nth(1).setInputFiles({
    name: "charm.png",
    mimeType: "image/png",
    buffer: product,
  });
  await studio
    .getByLabel("Image views", { exact: true })
    .selectOption("charm-only");
  await studio.locator(".charm-generate-card .generate-button").click();
  await expect(studio.locator(".result-card")).toHaveCount(1);
  expect(calls[1].action).toBe("generate-charms");
  expect(value(calls[1].body, "view")).toBe("charm-only");
  await page
    .getByRole("navigation", { name: "Image generator modes" })
    .getByRole("link", { name: "Charm packs", exact: true })
    .click();
  await expect(
    studio.getByRole("heading", { name: "Charm packs", exact: true }),
  ).toBeVisible();
  await studio.locator('input[type="file"]').first().setInputFiles({
    name: "charm.png",
    mimeType: "image/png",
    buffer: product,
  });
  await studio.getByLabel("Number of pieces", { exact: true }).fill("3");
  await studio
    .getByRole("button", { name: "Generate 1 image · 3 pieces", exact: true })
    .click();
  await expect(studio.locator(".result-card")).toHaveCount(1);
  expect(calls[2].action).toBe("generate-charm-pack");
  expect(value(calls[2].body, "quantity")).toBe("3");
  await studio
    .getByRole("button", { name: "Add 3 Pcs tag", exact: true })
    .click();
  await expect(
    studio.getByRole("button", { name: "Remove tag", exact: true }),
  ).toBeVisible();
  expect(calls).toHaveLength(3);
  await page.screenshot({
    path: ".test-data/screenshots/image-charm-packs-desktop.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".test-data/screenshots/image-studio-mobile.png",
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Open tool menu", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Tool menu", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close tool menu", exact: true })
    .click();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("local backgrounds and enhancement export files without image-generation requests", async ({
  page,
  context,
}) => {
  test.setTimeout(150000);
  const { product, foreground, background } = await fixtures();
  const challenge = await (
    await context.request.post("/api/auth/request-otp", {
      headers: { Origin: origin },
      data: { phone: "9876543231" },
    })
  ).json();
  await context.request.post("/api/auth/verify-otp", {
    headers: { Origin: origin },
    data: {
      challengeId: challenge.challengeId,
      code: challenge.developmentCode,
    },
  });
  let generationCalls = 0;
  await page.route("**/api/tools/image-generator/generate*", (route) => {
    generationCalls++;
    return route.fulfill({
      status: 500,
      json: { error: "Local tools must not call AI generation." },
    });
  });
  await page.goto("/tools/image-generator/backgrounds");
  const studio = page.getByRole("region", {
    name: "Image Generator studio",
    exact: true,
  });
  await studio.locator('input[type="file"]').first().setInputFiles({
    name: "opaque.png",
    mimeType: "image/png",
    buffer: product,
  });
  await expect(studio.getByRole("alert")).toContainText(
    "real PNG transparency",
  );
  await studio.locator('input[type="file"]').first().setInputFiles({
    name: "cutout.png",
    mimeType: "image/png",
    buffer: foreground,
  });
  await expect(
    studio.getByRole("heading", { name: "Background batch", exact: true }),
  ).toBeVisible();
  await studio.locator('input[type="file"]').nth(1).setInputFiles({
    name: "studio-background.png",
    mimeType: "image/png",
    buffer: background,
  });
  await studio
    .getByRole("button", { name: "Create 1 background variant", exact: true })
    .click();
  await expect(
    studio.getByRole("heading", { name: "2 images ready", exact: true }),
  ).toBeVisible();
  const zipEvent = page.waitForEvent("download");
  await studio.getByRole("button", { name: "All 2 ZIP", exact: true }).click();
  const zipDownload = await zipEvent;
  const zip = await JSZip.loadAsync(
    fs.readFileSync((await zipDownload.path())!),
  );
  expect(
    Object.keys(zip.files).filter((name) => name.endsWith(".png")),
  ).toHaveLength(2);
  await page.screenshot({
    path: ".test-data/screenshots/image-backgrounds-desktop.png",
    animations: "disabled",
  });
  await page
    .getByRole("navigation", { name: "Image generator modes" })
    .getByRole("link", { name: /Image enhancer/ })
    .click();
  await expect(
    studio.getByRole("heading", { name: "Image enhancer", exact: true }),
  ).toBeVisible();
  await studio.locator('input[type="file"]').setInputFiles({
    name: "product.png",
    mimeType: "image/png",
    buffer: product,
  });
  await studio.getByLabel("Gently brighten shadows", { exact: true }).check();
  await studio
    .getByRole("button", { name: "Enhance on this device", exact: true })
    .click();
  const enhanced = studio.getByRole("link", {
    name: "Download enhanced PNG",
    exact: true,
  });
  await expect(enhanced).toBeVisible();
  const enhancedEvent = page.waitForEvent("download");
  await enhanced.click();
  expect((await enhancedEvent).suggestedFilename()).toBe(
    "product-enhanced.png",
  );
  expect(generationCalls).toBe(0);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
