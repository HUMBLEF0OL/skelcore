import { test, expect } from "@playwright/test";

test.describe("demo home reset flow", () => {
  test("returns to loaded state after reset", async ({ page }) => {
    await page.goto("/");

    const toggle = page.locator("#toggle-loading");
    await expect(toggle).toContainText("Reset", { timeout: 7000 });
    await expect(page.getByText(/Blueprint in ~/)).toBeVisible();

    await toggle.click();
    await expect(toggle).toContainText("Loading…");

    await expect(toggle).toContainText("Reset", { timeout: 7000 });
    await expect(page.getByText(/Blueprint in ~/)).toBeVisible();
  });
});