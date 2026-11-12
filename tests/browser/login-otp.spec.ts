import { test, expect } from "@playwright/test";

test("OTP returned in the response is displayed and verifies the login", async ({ page, context }) => {
  await page.route("**/api/auth/request-otp", async route => {
    const response = await route.fetch();
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    // The isolated backend creates the real challenge. Expose only the new field
    // to verify that the UI also works without the legacy developmentCode field.
    await route.fulfill({ response, json: { challengeId: data.challengeId, phone: data.phone,
      expiresAt: data.expiresAt, resendAfter: data.resendAfter, otp: data.developmentCode } });
  });
  await page.goto("/login?next=/profile");
  await page.getByLabel("Mobile number", { exact: true }).fill("9876543291");
  await page.getByRole("button", { name: "Get verification code", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your test code is ready.", exact: true })).toBeVisible();
  await expect(page.locator(".development-notice")).toContainText("Test login mode");
  await expect(page.locator(".development-notice b")).toHaveText(/^\d{6}$/);
  const code = await page.locator(".development-notice b").innerText();
  await page.getByLabel("Verification code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Verify & continue", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/profile");
  const response = await context.request.get("/api/auth/me");
  expect((await response.json()).user).toMatchObject({ phone: "+919876543291", role: "customer" });
});
