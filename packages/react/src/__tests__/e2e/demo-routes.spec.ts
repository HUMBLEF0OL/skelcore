import { expect, test } from "@playwright/test";

test.describe("Demo route behaviors", () => {
  test("top-level routes respond", async ({ page }) => {
    const routes = ["/", "/ssr", "/stress", "/rtl", "/slots"];

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.ok(), `Route ${route} should return 2xx`).toBeTruthy();
      await expect(page.locator("main, body").first()).toBeVisible();
    }
  });

  test("/stress shows measured time in ms", async ({ page }) => {
    await page.goto("/stress");

    const trigger = page.getByRole("button", { name: /start loading|rerun measurement/i });
    await trigger.click();

    await expect(page.getByTestId("stress-measurement-ms")).toContainText(/\d+\s*ms/i);
  });

  test("/rtl keeps data-no-skeleton control interactive while loading", async ({ page }) => {
    await page.goto("/rtl");

    const loadingToggle = page.getByRole("button", { name: /start loading|stop loading/i });
    await loadingToggle.click();

    const interactive = page.getByTestId("rtl-noskel-button");
    await interactive.click();
    await expect(page.getByTestId("rtl-noskel-count")).toContainText("1");
  });

  test("/ssr response HTML contains skeleton markup", async ({ request }) => {
    const response = await request.get("/ssr");
    expect(response.ok()).toBeTruthy();

    const html = await response.text();
    expect(html).toMatch(/skel-overlay|skel-renderer-root|skel-block/);
  });
});
