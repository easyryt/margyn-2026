import { test, expect } from "@playwright/test";
import fs from "node:fs";
import JSZip from "../../../backend/node_modules/jszip";
import { PDFDocument } from "../../../backend/node_modules/pdf-lib";
import { makeShippingPdf } from "../../../backend/tests/support/shipping-fixture.mjs";
const origin = "http://127.0.0.1:3100";

test("shipping labels uses the original processing flow with protected real PDF and ZIP downloads", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const action of ["stats", "process", "summary"])
    expect(
      (
        await page.request.post("/api/tools/shipping-labels/" + action, {
          headers: { Origin: origin },
        })
      ).status(),
    ).toBe(401);
  const sent = await context.request.post("/api/auth/request-otp", {
    headers: { Origin: origin },
    data: { phone: "9876543222" },
  });
  const challenge = await sent.json();
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
  await page.goto("/tools/shipping-labels");
  await expect(
    page.getByRole("heading", { name: "Shipping Labels", exact: true }),
  ).toBeVisible();
  const choose = page.getByRole("button", { name: "Choose PDF", exact: true });
  const sort = page.getByRole("button", { name: "Sort labels", exact: true });
  const sorter = page.getByRole("region", { name: "Shipping-label PDF sorter", exact: true });
  await expect(choose).toBeVisible();
  await expect(sort).toHaveCount(0);
  const input = page.getByLabel("Upload shipping-label PDF", { exact: true });
  await input.setInputFiles({
    name: "wrong.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("wrong file"),
  });
  await expect(
    sorter.getByRole("alert"),
  ).toContainText("Choose a PDF file");
  await input.setInputFiles({
    name: "broken.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not a real pdf"),
  });
  const statsRoute = "**/api/tools/shipping-labels/stats";
  let resumeStats = () => {};
  const pauseStats = new Promise<void>((resolve) => { resumeStats = resolve; });
  await page.route(statsRoute, async (route) => {
    await pauseStats;
    await route.abort().catch(() => {});
  });
  try {
    const started = page.waitForRequest(statsRoute);
    await sort.click();
    await started;
    await expect(sorter.getByRole("status")).toContainText("Reading your PDF");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(sort).toBeVisible();
  } finally {
    resumeStats();
    await page.unroute(statsRoute);
  }
  await sort.click();
  await expect(
    sorter.getByRole("alert"),
  ).toContainText("couldn’t read this PDF");
  await input.setInputFiles({
    name: "no-orders.pdf",
    mimeType: "application/pdf",
    buffer: await makeShippingPdf({ orders: false }),
  });
  await sort.click();
  await expect(
    sorter.getByRole("alert"),
  ).toContainText("No valid orders");
  // Larger than Next's default 10 MB clone limit, verifying the actual upload proxy too.
  const pdf = await makeShippingPdf({ large: true });
  expect(pdf.length).toBeGreaterThan(10 * 1024 * 1024);
  await input.setInputFiles({
    name: "shipping-labels.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await expect(page.locator(".shipping-selected-file")).toContainText(
    "shipping-labels.pdf",
  );
  await expect(page.getByRole("button", { name: "Change PDF", exact: true })).toBeVisible();
  fs.mkdirSync(".test-data/screenshots", { recursive: true });
  await page.screenshot({
    path: ".test-data/screenshots/shipping-upload-desktop.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".test-data/screenshots/shipping-upload-mobile.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Open tool menu", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Tool menu", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close tool menu", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await sort.click();
  await expect(
    page.getByRole("heading", { name: "Labels ready to download", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await expect(page.locator(".shipping-stats > div").nth(0)).toContainText("3");
  await expect(page.locator(".shipping-stats > div").nth(1)).toContainText("2");
  await expect(page.locator(".shipping-stats > div").nth(2)).toContainText("4");
  await page.screenshot({
    path: ".test-data/screenshots/shipping-results-desktop.png",
    animations: "disabled",
  });
  const zipEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download ZIP", exact: false })
    .click();
  const zipDownload = await zipEvent;
  expect(zipDownload.suggestedFilename()).toBe("Sorted-Orders.zip");
  const zip = await JSZip.loadAsync(
    fs.readFileSync((await zipDownload.path())!),
  );
  expect(Object.keys(zip.files).sort()).toEqual([
    "MARGYN-BLUE-001.pdf",
    "MARGYN-KRAFT-002.pdf",
    "Summary.pdf",
  ]);
  expect(
    (
      await PDFDocument.load(
        await zip.file("MARGYN-BLUE-001.pdf")!.async("uint8array"),
      )
    ).getPageCount(),
  ).toBe(2);
  const summaryEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download summary PDF", exact: true })
    .click();
  const summary = await summaryEvent;
  expect(summary.suggestedFilename()).toBe("Order-Summary.pdf");
  expect(
    (
      await PDFDocument.load(fs.readFileSync((await summary.path())!))
    ).getPageCount(),
  ).toBe(1);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".test-data/screenshots/shipping-results-mobile.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Sort another PDF", exact: true })
    .click();
  await expect(choose).toBeVisible();
  await expect(sort).toHaveCount(0);
  await expect(page.locator(".shipping-selected-file")).toHaveCount(0);
  // Re-selecting the same filename after reset works, and removal clears the selected file.
  await input.setInputFiles({
    name: "shipping-labels.pdf",
    mimeType: "application/pdf",
    buffer: await makeShippingPdf(),
  });
  await page
    .getByRole("button", { name: "Remove selected PDF", exact: true })
    .click();
  await expect(choose).toBeFocused();
  await expect(sort).toHaveCount(0);
  expect(errors).toEqual([]);
});
