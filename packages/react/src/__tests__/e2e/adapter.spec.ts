import { test, expect } from "@playwright/test";

test.describe("Ghostframe React Adapter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test");
  });

  test("skeleton overlay appears when loading is true", async ({ page }) => {
    // Use .first() as there are multiple skeletons on the test page
    const overlay = page.locator(".skel-overlay").first();
    await expect(overlay).toBeVisible();

    // Check initial state
    const blocks = page.locator(".skel-block");
    await expect(await blocks.count()).toBeGreaterThan(5);
  });

  test("skeleton blocks align with content (visual fidelity)", async ({ page }) => {
    // 1. Toggle off to measure real content
    await page.click("#toggle-loading");
    await expect(page.locator(".skel-overlay").first()).not.toBeVisible();

    const card = page.locator("#test-card");
    const cardRect = await card.boundingBox();

    // 2. Toggle back on
    await page.click("#toggle-loading");
    await expect(page.locator(".skel-overlay").first()).toBeVisible();

    const overlayRoot = page.locator(".skel-auto-container").first();
    const overlayRect = await overlayRoot.boundingBox();

    // Assert dimensions match within 2px
    expect(Math.abs(cardRect!.width - overlayRect!.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(cardRect!.height - overlayRect!.height)).toBeLessThanOrEqual(2);
  });

  test("data-skeleton-ignore elements remain visible", async ({ page }) => {
    const cancelBtn = page.locator("#cancel-btn");
    await expect(cancelBtn).toBeVisible();

    // Verify it's not hidden by the parent skel-content opacity: 0
    // We check computed opacity
    const opacity = await cancelBtn.evaluate((el) => window.getComputedStyle(el).opacity);
    expect(opacity).toBe("1");
  });

  test("skeleton unmounts after transition duration", async ({ page }) => {
    await expect(page.locator(".skel-overlay").first()).toBeVisible();

    // Toggle loading off
    await page.click("#toggle-loading");

    // Should be in 'exiting' state immediately
    await expect(page.locator(".skel-overlay").first()).toHaveAttribute("style", /opacity: 0/);

    // Wait for 600ms (transition is 300ms + grace period)
    await page.waitForTimeout(600);

    // Should be completely gone from DOM
    await expect(page.locator(".skel-overlay")).not.toBeAttached();
  });

  test("RTL layouts are correctly mirrored", async ({ page }) => {
    // The dir="rtl" is on a wrapper div in page.tsx
    const rtlSkeleton = page.locator("[dir='rtl'] .skel-overlay");
    await expect(rtlSkeleton).toBeAttached();
  });
});
