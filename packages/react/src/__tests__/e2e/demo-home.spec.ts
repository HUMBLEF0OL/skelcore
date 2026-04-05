import { test, expect } from "@playwright/test";

test.describe("home guide route", () => {
  test("renders official guide content without loading controls", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Ghostframe Official Guide" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Feature Index" })).toBeVisible();
    await expect(page.locator("#toggle-loading")).toHaveCount(0);
  });
});
