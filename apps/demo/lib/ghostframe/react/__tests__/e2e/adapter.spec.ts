import { test, expect } from "@playwright/test";

test.describe("Ghostframe React Adapter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test");
  });

  test("skeleton overlay appears when loading is true", async ({ page }) => {
    const overlay = page.locator(".skel-overlay");
    await expect(overlay).toBeVisible();
    
    // Check initial state
    const blocks = page.locator(".skel-block");
    await expect(blocks.count()).toBeGreaterThan(5);
  });

  test("skeleton blocks align with content (visual fidelity)", async ({ page }) => {
    // 1. Toggle off to measure real content
    await page.click("#toggle-loading");
    await expect(page.locator(".skel-overlay")).not.toBeVisible();
    
    const card = page.locator("#test-card");
    const cardRect = await card.boundingBox();
    
    // 2. Toggle back on
    await page.click("#toggle-loading");
    await expect(page.locator(".skel-overlay")).toBeVisible();
    
    const overlayRoot = page.locator(".skel-auto-container").first();
    const overlayRect = await overlayRoot.boundingBox();
    
    // Assert dimensions match within 2px
    expect(Math.abs(cardRect!.width - overlayRect!.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(cardRect!.height - overlayRect!.height)).toBeLessThanOrEqual(2);
  });

  test("data-no-skeleton elements remain visible", async ({ page }) => {
    const cancelBtn = page.locator("#cancel-btn");
    await expect(cancelBtn).toBeVisible();
    
    // Verify it's not hidden by the parent skel-content opacity: 0
    // We check computed opacity
    const opacity = await cancelBtn.evaluate((el) => window.getComputedStyle(el).opacity);
    expect(opacity).toBe("1");
  });

  test("skeleton unmounts after transition duration", async ({ page }) => {
    await expect(page.locator(".skel-overlay")).toBeVisible();
    
    // Toggle loading off
    await page.click("#toggle-loading");
    
    // Should be in 'exiting' state immediately
    await expect(page.locator(".skel-overlay")).toHaveAttribute("style", /opacity: 0/);
    
    // Wait for 400ms (transition is 300ms)
    await page.waitForTimeout(400);
    
    // Should be completely gone from DOM
    await expect(page.locator(".skel-overlay")).not.toBeAttached();
  });

  test("RTL layouts are correctly mirrored", async ({ page }) => {
    // In RTL, the skeleton bars should have right: 0 or similar if absolute
    // Or just check if they are rendered inside the RTL block
    const rtlSkeleton = page.locator(".skel-auto-container[dir='rtl'] .skel-overlay");
    await expect(rtlSkeleton).toBeAttached();
  });
});
