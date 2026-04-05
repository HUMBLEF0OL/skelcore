import { expect, test } from "@playwright/test";

test.describe("demo reference routes", () => {
  test("global navigation is visible with active state", async ({ page }) => {
    await page.goto("/");

    const primaryNav = page.getByRole("navigation", { name: "Primary" });
    await expect(primaryNav).toBeVisible();

    const guideLink = primaryNav.getByRole("link", { name: "Guide" });
    await expect(guideLink).toHaveAttribute("aria-current", "page");

    await primaryNav.getByRole("link", { name: "Reference" }).click();
    await expect(page).toHaveURL(/\/reference$/);

    const referenceLink = primaryNav.getByRole("link", { name: "Reference" });
    await expect(referenceLink).toHaveAttribute("aria-current", "page");
  });

  test("reference overview and feature routes render expected content", async ({ page }) => {
    await page.goto("/reference");

    await expect(
      page.getByRole("heading", { level: 1, name: "Ghostframe Reference" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "All Features" })).toBeVisible();

    await page.goto("/reference/features");
    await expect(page.getByRole("link", { name: "Custom Slots" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Element Exclusion" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Responsive Behavior" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Callbacks & Hooks" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Blueprint Caching" }).first()).toBeVisible();

    await page.goto("/reference/features/custom-slots");
    await expect(page.getByRole("heading", { level: 1, name: "Custom Slots" })).toBeVisible();

    await page.goto("/reference/features/ignore-elements");
    await expect(page.getByRole("heading", { level: 1, name: "Element Exclusion" })).toBeVisible();
    await expect(page.getByPlaceholder("Type a message...")).toBeVisible();
    await expect(page.getByPlaceholder("Type a message...")).toBeEditable();
  });

  test("config playground controls are interactive", async ({ page }) => {
    await page.goto("/config-playground");

    await expect(
      page.getByRole("heading", { level: 1, name: "Configuration Playground" })
    ).toBeVisible();

    const colorInputs = page.locator('input[type="color"]');
    await expect(colorInputs).toHaveCount(2);

    const sliders = page.locator('input[type="range"]');
    await expect(sliders).toHaveCount(3);

    const toggleLoading = page.getByRole("button", { name: "Stop Loading" });
    await toggleLoading.click();
    await expect(page.getByRole("button", { name: "Start Loading" })).toBeVisible();
  });

  test("advanced route is reachable from global navigation", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Advanced" })
      .click();
    await expect(page).toHaveURL(/\/advanced$/);
    await expect(page.getByRole("heading", { level: 1, name: "Advanced Patterns" })).toBeVisible();

    await page.getByRole("link", { name: "Form Loading" }).click();
    await expect(page).toHaveURL(/\/advanced\/form-loading$/);
    await expect(page.getByRole("heading", { level: 1, name: "Forms & Loading" })).toBeVisible();
    await expect(page.getByPlaceholder("Enter your name")).toBeVisible();
    await expect(page.getByPlaceholder("Enter your name")).toBeEditable();
  });
});
